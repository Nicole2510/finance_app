import { lazy, Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { FileUp, Plus, X } from 'lucide-react'
import { useApiFetch } from '../lib/api'
import { useToast } from '../lib/toast'
import { currentMonth, dayLabel, formatDate, monthLabel, today } from '../lib/dates'
import { formatMoney, sumAmounts } from '../lib/money'
import { describeTransaction } from '../lib/transactionDisplay'
import { NO_FILTERS, type Filters } from '../lib/transactionFilters'
import type { Account, Category, IncomeSource, Transaction } from '../lib/types'
import DeleteModal from '../components/DeleteModal'
import PageHeader from '../components/PageHeader'
import MonthSwitcher from '../components/transactions/MonthSwitcher'
import MonthTotals from '../components/transactions/MonthTotals'
import TransactionFilters from '../components/transactions/TransactionFilters'
import DateRangeModal, { type DateRange } from '../components/transactions/DateRangeModal'
import TransactionList from '../components/transactions/TransactionList'
import TransactionFormModal, {
  type TransactionValues,
} from '../components/transactions/TransactionFormModal'
import './Page.css'
import './Transactions.css'

// The importer and its file readers only download the first time Import is used
const ImportModal = lazy(() => import('../components/import/ImportModal'))

function Transactions() {
  const apiFetch = useApiFetch()
  // What's shown lives in the URL (?month=2026-10, or ?from=…&to=… for a date
  // range), so refresh and back keep it
  const [params, setParams] = useSearchParams()
  const month = params.get('month') ?? currentMonth()
  const from = params.get('from')
  const to = params.get('to')
  const range: DateRange | null = from && to ? { from, to } : null
  const listQuery = range ? `from=${range.from}&to=${range.to}` : `month=${month}`
  // The answer is stored with the query it's for, success or error
  const [result, setResult] = useState<{
    query: string
    transactions?: Transaction[]
    error?: string
  } | null>(null)

  // Bumped after every save, so the month's list loads again
  const [version, setVersion] = useState(0)
  // What the form chooses from: loaded once, archived ones included so old
  // transactions can still show and edit them
  const [lookups, setLookups] = useState<{
    accounts: Account[]
    categories: Category[]
    sources: IncomeSource[]
  } | null>(null)
  const [form, setForm] = useState<{ transaction?: Transaction } | null>(null)
  const [filters, setFilters] = useState<Filters>(NO_FILTERS)
  const [deleting, setDeleting] = useState<Transaction | null>(null)
  const [importing, setImporting] = useState(false)
  const [choosingDates, setChoosingDates] = useState(false)
  // Ticked rows, stored with the list they belong to so they never outlive it
  const [selection, setSelection] = useState<{ query: string; ids: Set<string> }>({
    query: '',
    ids: new Set(),
  })
  const [deletingSelected, setDeletingSelected] = useState(false)
  const toast = useToast()
  // Bumped when categories change elsewhere (e.g. made while importing)
  const [lookupsVersion, setLookupsVersion] = useState(0)

  useEffect(() => {
    Promise.all([
      apiFetch<Account[]>('/api/accounts?includeArchived=true'),
      apiFetch<Category[]>('/api/categories?includeArchived=true'),
      apiFetch<IncomeSource[]>('/api/income-sources?includeArchived=true'),
    ]).then(([accounts, categories, sources]) => setLookups({ accounts, categories, sources }))
  }, [apiFetch, lookupsVersion])

  useEffect(() => {
    // If the month or range changes before this answer arrives, ignore it
    let stale = false
    apiFetch<Transaction[]>(`/api/transactions?${listQuery}`)
      .then((transactions) => !stale && setResult({ query: listQuery, transactions }))
      .catch((err: Error) => !stale && setResult({ query: listQuery, error: err.message }))
    return () => {
      stale = true
    }
  }, [apiFetch, listQuery, version])

  // Until the new list arrives, don't show the previous one or its error
  const current = result?.query === listQuery ? result : null
  const transactions = current?.transactions

  // Filtering happens here on the month already loaded, so no extra API calls
  const query = filters.search.trim().toLowerCase()
  const visible = (transactions ?? []).filter(
    (t) =>
      (filters.type === 'ALL' || t.type === filters.type) &&
      (filters.accountId === 'ALL' || t.account.id === filters.accountId) &&
      [describeTransaction(t).name, t.notes, t.account.name, t.incomeSource?.name].some((text) =>
        text?.toLowerCase().includes(query),
      ),
  )
  const filtering =
    query !== '' ||
    filters.type !== NO_FILTERS.type ||
    filters.accountId !== NO_FILTERS.accountId ||
    range !== null

  // Only ticked rows that are still shown count as selected
  const visibleIds = new Set(visible.map((t) => t.id))
  const checkedIds = new Set(
    selection.query === listQuery ? [...selection.ids].filter((id) => visibleIds.has(id)) : [],
  )
  const checked = visible.filter((t) => checkedIds.has(t.id))
  // Money in adds, spending subtracts; adjustments carry their own sign
  const checkedTotal = sumAmounts(
    checked.map((t) => (t.type === 'EXPENSE' ? `-${t.amount}` : t.amount)),
  )

  function check(id: string) {
    const ids = new Set(checkedIds)
    if (ids.has(id)) ids.delete(id)
    else ids.add(id)
    setSelection({ query: listQuery, ids })
  }

  function checkAll(on: boolean) {
    setSelection({ query: listQuery, ids: on ? new Set(visibleIds) : new Set() })
  }

  // Clear all: every filter, and back from a date range to the month view
  function clearAll() {
    setFilters(NO_FILTERS)
    if (range) setParams({ month })
  }

  // The range popup starts on the range in use, or the month being viewed
  function startingRange(): DateRange {
    if (range) return range
    const [y, m] = month.split('-').map(Number)
    const lastDay = `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`
    return { from: `${month}-01`, to: lastDay < today() ? lastDay : today() }
  }

  // Adds or edits, then reloads; a new date in another month opens that month
  async function saveTransaction(values: TransactionValues) {
    const editing = form?.transaction
    try {
      await apiFetch(editing ? `/api/transactions/${editing.id}` : '/api/transactions', {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify(values),
      })
    } catch (err) {
      return (err as Error).message
    }
    const savedMonth = values.date.slice(0, 7)
    if (!range && savedMonth !== month) setParams({ month: savedMonth })
    setVersion((v) => v + 1)
    return null
  }

  // Deletes every ticked row together (or none); returns the reason if it fails
  async function deleteChecked() {
    const ids = [...checkedIds]
    try {
      await apiFetch('/api/transactions/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ ids }),
      })
    } catch (err) {
      return (err as Error).message
    }
    toast({ title: `Deleted ${ids.length} ${ids.length === 1 ? 'transaction' : 'transactions'}` })
    setSelection({ query: listQuery, ids: new Set() })
    setVersion((v) => v + 1)
    return null
  }

  // Deletes after the confirm popup; returns the reason if it fails
  async function deleteTransaction() {
    if (!deleting) return null
    try {
      await apiFetch(`/api/transactions/${deleting.id}`, { method: 'DELETE' })
    } catch (err) {
      return (err as Error).message
    }
    setVersion((v) => v + 1)
    return null
  }

  return (
    <div className="page transactions">
      <PageHeader title="Transactions">
        <div className="transactions__actions">
          <button
            type="button"
            className="btn btn--secondary transactions__add"
            disabled={!lookups}
            onClick={() => setImporting(true)}
          >
            <FileUp size={18} /> Import
          </button>
          <button
            type="button"
            className="btn btn--primary transactions__add"
            disabled={!lookups}
            onClick={() => setForm({})}
          >
            <Plus size={18} /> Add transaction
          </button>
        </div>
      </PageHeader>

      <div className="transactions__toolbar">
        {range ? (
          <span className="transactions__range">
            {formatDate(range.from)} – {formatDate(range.to)}
            <button type="button" aria-label="Back to months" onClick={() => setParams({ month })}>
              <X size={16} />
            </button>
          </span>
        ) : (
          <MonthSwitcher month={month} onChange={(m) => setParams({ month: m })} />
        )}
      </div>

      {current?.error ? (
        <p className="form-error">{current.error}</p>
      ) : !transactions ? (
        <p>Loading...</p>
      ) : (
        <>
          <MonthTotals transactions={visible} />
          <div className="transactions__panel">
            <TransactionFilters
              filters={filters}
              accounts={(lookups?.accounts ?? []).filter((a) => a.archivedAt === null)}
              onChange={setFilters}
              onClear={clearAll}
              onDates={() => setChoosingDates(true)}
              dateRangeOn={range !== null}
              filtering={filtering}
            />
            {checked.length > 0 && (
              <div
                className="transactions__selection"
                role="region"
                aria-label="Selected transactions"
              >
                <span>
                  <strong>{checked.length}</strong> selected ·{' '}
                  {Number(checkedTotal) < 0 ? '−' : '+'}
                  {formatMoney(checkedTotal.replace('-', ''))}
                </span>
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => checkAll(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn--danger"
                  onClick={() => setDeletingSelected(true)}
                >
                  Delete
                </button>
              </div>
            )}
            {visible.length > 0 ? (
              <TransactionList
                transactions={visible}
                onSelect={(t) =>
                  // Adjustments can't be edited, so they go straight to Delete
                  t.type === 'ADJUSTMENT' ? setDeleting(t) : setForm({ transaction: t })
                }
                checkedIds={checkedIds}
                onCheck={check}
                onCheckAll={checkAll}
              />
            ) : filtering ? (
              <div className="transactions__empty">
                <p>No transactions match.</p>
                <button type="button" className="btn btn--secondary" onClick={clearAll}>
                  Clear filters
                </button>
              </div>
            ) : (
              <p className="transactions__empty">No transactions in {monthLabel(month)}.</p>
            )}
          </div>
        </>
      )}

      {form && lookups && (
        <TransactionFormModal
          transaction={form.transaction}
          {...lookups}
          onClose={() => setForm(null)}
          onSubmit={saveTransaction}
          onDelete={() => {
            // Swap the form for the confirm popup, so only one is open at a time
            setDeleting(form.transaction ?? null)
            setForm(null)
          }}
        />
      )}

      {importing && (
        <Suspense fallback={null}>
          <ImportModal
            accounts={lookups?.accounts ?? []}
            categories={lookups?.categories ?? []}
            onClose={() => setImporting(false)}
            onCategoriesChanged={() => setLookupsVersion((v) => v + 1)}
            onImported={(count, newestDate) => {
              setImporting(false)
              toast({
                title: `Imported ${count} ${count === 1 ? 'transaction' : 'transactions'}`,
                message: 'Your matches are remembered for next time.',
              })
              setParams({ month: newestDate.slice(0, 7) }) // show where they landed
              setVersion((v) => v + 1)
            }}
          />
        </Suspense>
      )}

      {choosingDates && (
        <DateRangeModal
          initial={startingRange()}
          onClose={() => setChoosingDates(false)}
          onApply={(chosen) => {
            setChoosingDates(false)
            setParams({ from: chosen.from, to: chosen.to })
          }}
        />
      )}

      {deletingSelected && (
        <DeleteModal
          name=""
          question={`Delete ${checked.length} ${checked.length === 1 ? 'transaction' : 'transactions'}?`}
          kindLabel="transactions"
          details={`Together they come to ${Number(checkedTotal) < 0 ? '−' : '+'}${formatMoney(checkedTotal.replace('-', ''))}`}
          onClose={() => setDeletingSelected(false)}
          onDelete={deleteChecked}
        />
      )}

      {deleting && (
        <DeleteModal
          name={describeTransaction(deleting).name}
          kindLabel="transaction"
          details={`${describeTransaction(deleting).amountText} · ${dayLabel(deleting.date)}`}
          onClose={() => setDeleting(null)}
          onDelete={deleteTransaction}
        />
      )}
    </div>
  )
}

export default Transactions
