import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Plus } from 'lucide-react'
import { useApiFetch } from '../lib/api'
import type { Account, AccountType, Transaction } from '../lib/types'
import { accountTypes } from '../lib/accountTypes'
import { today } from '../lib/dates'
import DeleteModal from '../components/DeleteModal'
import PageHeader from '../components/PageHeader'
import AccountDetails from '../components/accounts/AccountDetails'
import AccountFormModal, { type AccountValues } from '../components/accounts/AccountFormModal'
import AccountList from '../components/accounts/AccountList'
import ReconcileModal from '../components/accounts/ReconcileModal'
import { RECENT_MAX } from '../components/accounts/RecentTransactions'
import type { TypeFilter } from '../components/accounts/AccountFilters'
import './Page.css'
import './Accounts.css'

const TYPE_ORDER = Object.keys(accountTypes) as AccountType[]

function Accounts() {
  const apiFetch = useApiFetch()
  const navigate = useNavigate()
  const { id } = useParams() // the selected account comes from the URL
  const [accounts, setAccounts] = useState<Account[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [reconciling, setReconciling] = useState(false)
  // Bumped after reconciling, so the recent list loads again with the adjustment
  const [recentVersion, setRecentVersion] = useState(0)
  const [actionError, setActionError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL')

  useEffect(() => {
    apiFetch<Account[]>('/api/accounts?includeArchived=true')
      .then(setAccounts)
      .catch((err: Error) => setLoadError(err.message))
  }, [apiFetch])

  // The selected account's latest transactions (up to 50, in one request),
  // stored with the account they're for so switching accounts never shows the
  // previous one's list
  const [recent, setRecent] = useState<{ accountId: string; transactions: Transaction[] } | null>(
    null,
  )

  useEffect(() => {
    if (!id) return
    let stale = false // ignore the answer if another account is chosen first
    apiFetch<Transaction[]>(`/api/transactions?accountId=${id}&limit=${RECENT_MAX}`)
      .then((transactions) => !stale && setRecent({ accountId: id, transactions }))
      .catch(() => !stale && setRecent({ accountId: id, transactions: [] }))
    return () => {
      stale = true
    }
  }, [apiFetch, id, recentVersion])

  // Saves a new account and opens it; returns an error message if it fails
  async function addAccount(values: AccountValues) {
    try {
      const created = await apiFetch<Account>('/api/accounts', {
        method: 'POST',
        body: JSON.stringify(values),
      })
      setAccounts((list) => [...(list ?? []), created])
      navigate(`/accounts/${created.id}`)
      return null
    } catch (err) {
      return (err as Error).message
    }
  }

  // Saves changes to the selected account; returns an error message if it fails
  async function saveAccount(values: Partial<AccountValues> & { archived?: boolean }) {
    try {
      const updated = await apiFetch<Account>(`/api/accounts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(values),
      })
      setAccounts((list) => (list ?? []).map((a) => (a.id === updated.id ? updated : a)))
      return null
    } catch (err) {
      return (err as Error).message
    }
  }

  // Records an adjustment so the balance matches the bank; returns an error message if it fails
  async function reconcileAccount(actualBalance: string) {
    try {
      const { account } = await apiFetch<{ adjustment: string; account: Account }>(
        `/api/accounts/${id}/reconcile`,
        { method: 'POST', body: JSON.stringify({ actualBalance, date: today() }) },
      )
      setAccounts((list) => (list ?? []).map((a) => (a.id === account.id ? account : a)))
      setRecentVersion((v) => v + 1)
      return null
    } catch (err) {
      return (err as Error).message
    }
  }

  async function setArchived(archived: boolean) {
    setActionError(null)
    const problem = await saveAccount({ archived })
    if (problem) setActionError(problem)
  }

  // Deletes the selected account; returns the reason if the server refuses
  async function deleteAccount() {
    try {
      await apiFetch(`/api/accounts/${id}`, { method: 'DELETE' })
      navigate('/accounts')
      setAccounts((list) => (list ?? []).filter((a) => a.id !== id))
      return null
    } catch (err) {
      return (err as Error).message
    }
  }

  function clearFilters() {
    setSearch('')
    setTypeFilter('ALL')
  }

  // Worked out on each render from what's already loaded, so no extra API calls
  const all = accounts ?? []
  const selected = all.find((a) => a.id === id)
  const query = search.trim().toLowerCase()
  const matching = all
    .filter(
      (a) =>
        a.name.toLowerCase().includes(query) && (typeFilter === 'ALL' || a.type === typeFilter),
    )
    .sort(
      (a, b) =>
        TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) || a.name.localeCompare(b.name),
    )
  const filtering = query !== '' || typeFilter !== 'ALL'

  return (
    <div className="page accounts">
      <PageHeader title="Accounts">
        <button
          type="button"
          className="btn btn--primary accounts__add"
          onClick={() => setAdding(true)}
        >
          <Plus size={18} /> Add account
        </button>
      </PageHeader>

      {loadError ? (
        <p className="form-error">{loadError}</p>
      ) : !accounts ? (
        <p>Loading...</p>
      ) : all.length === 0 ? (
        <p className="accounts__empty">No accounts yet. Add your first one to start tracking.</p>
      ) : (
        <div className={`accounts__layout${id ? ' has-selection' : ''}`}>
          <AccountList
            active={matching.filter((a) => a.archivedAt === null)}
            archived={matching.filter((a) => a.archivedAt !== null)}
            filtering={filtering}
            selectedId={id}
            search={search}
            type={typeFilter}
            onSearchChange={setSearch}
            onTypeChange={setTypeFilter}
            onClear={clearFilters}
          />
          <div className="accounts__panel">
            {actionError && (
              <p className="form-error" role="alert">
                {actionError}
              </p>
            )}
            {selected ? (
              <AccountDetails
                account={selected}
                onEdit={() => setEditing(true)}
                onToggleArchive={() => setArchived(selected.archivedAt === null)}
                onDelete={() => setDeleting(true)}
                onReconcile={() => setReconciling(true)}
                recent={recent?.accountId === selected.id ? recent.transactions : null}
              />
            ) : (
              <p className="accounts__empty">
                {id ? 'Account not found.' : 'Select an account to see its details.'}
              </p>
            )}
          </div>
        </div>
      )}

      {adding && <AccountFormModal onClose={() => setAdding(false)} onSubmit={addAccount} />}
      {deleting && selected && (
        <DeleteModal
          name={selected.name}
          kindLabel="account"
          onClose={() => setDeleting(false)}
          onDelete={deleteAccount}
          onArchive={() => setArchived(true)}
        />
      )}
      {reconciling && selected && (
        <ReconcileModal
          account={selected}
          onClose={() => setReconciling(false)}
          onSubmit={reconcileAccount}
        />
      )}
      {editing && selected && (
        <AccountFormModal
          account={selected}
          onClose={() => setEditing(false)}
          onSubmit={saveAccount}
        />
      )}
    </div>
  )
}

export default Accounts
