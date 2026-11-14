import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Plus } from 'lucide-react'
import { useApiFetch } from '../lib/api'
import { currentMonth, dayLabel, monthLabel } from '../lib/dates'
import { formatMoney } from '../lib/money'
import { NO_FILTERS, type Filters } from '../lib/transactionFilters'
import type { Account, Category, IncomeSource, Transaction } from '../lib/types'
import DeleteModal from '../components/DeleteModal'
import PageHeader from '../components/PageHeader'
import MonthSwitcher from '../components/transactions/MonthSwitcher'
import MonthTotals from '../components/transactions/MonthTotals'
import TransactionFilters from '../components/transactions/TransactionFilters'
import TransactionList from '../components/transactions/TransactionList'
import TransactionFormModal, {
  type TransactionValues,
} from '../components/transactions/TransactionFormModal'
import './Page.css'
import './Transactions.css'

function Transactions() {
  const apiFetch = useApiFetch()
  // The month lives in the URL (?month=2026-10), so refresh and back keep it
  const [params, setParams] = useSearchParams()
  const month = params.get('month') ?? currentMonth()
  // The answer is stored with the month it's for, success or error
  const [result, setResult] = useState<{
    month: string
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

  useEffect(() => {
    Promise.all([
      apiFetch<Account[]>('/api/accounts?includeArchived=true'),
      apiFetch<Category[]>('/api/categories?includeArchived=true'),
      apiFetch<IncomeSource[]>('/api/income-sources?includeArchived=true'),
    ]).then(([accounts, categories, sources]) => setLookups({ accounts, categories, sources }))
  }, [apiFetch])

  useEffect(() => {
    // If the month changes before this answer arrives, ignore the old answer
    let stale = false
    apiFetch<Transaction[]>(`/api/transactions?month=${month}`)
      .then((transactions) => !stale && setResult({ month, transactions }))
      .catch((err: Error) => !stale && setResult({ month, error: err.message }))
    return () => {
      stale = true
    }
  }, [apiFetch, month, version])

  // Until the new month arrives, don't show the previous month's list or error
  const current = result?.month === month ? result : null
  const transactions = current?.transactions

  // Filtering happens here on the month already loaded, so no extra API calls
  const query = filters.search.trim().toLowerCase()
  const visible = (transactions ?? []).filter(
    (t) =>
      (filters.type === 'ALL' || t.type === filters.type) &&
      (filters.accountId === 'ALL' || t.account.id === filters.accountId) &&
      [t.category.name, t.notes, t.account.name, t.incomeSource?.name].some((text) =>
        text?.toLowerCase().includes(query),
      ),
  )
  const filtering =
    query !== '' || filters.type !== NO_FILTERS.type || filters.accountId !== NO_FILTERS.accountId

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
    if (savedMonth !== month) setParams({ month: savedMonth })
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
        <button
          type="button"
          className="btn btn--primary transactions__add"
          disabled={!lookups}
          onClick={() => setForm({})}
        >
          <Plus size={18} /> Add transaction
        </button>
      </PageHeader>

      <div className="transactions__toolbar">
        <MonthSwitcher month={month} onChange={(m) => setParams({ month: m })} />
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
            />
            {visible.length > 0 ? (
              <TransactionList transactions={visible} onSelect={(t) => setForm({ transaction: t })} />
            ) : filtering ? (
              <div className="transactions__empty">
                <p>No transactions match.</p>
                <button type="button" className="btn btn--secondary" onClick={() => setFilters(NO_FILTERS)}>
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

      {deleting && (
        <DeleteModal
          name={deleting.category.name}
          kindLabel="transaction"
          details={`${formatMoney(deleting.amount)} · ${dayLabel(deleting.date)}`}
          onClose={() => setDeleting(null)}
          onDelete={deleteTransaction}
        />
      )}
    </div>
  )
}

export default Transactions
