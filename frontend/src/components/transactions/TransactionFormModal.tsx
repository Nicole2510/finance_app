import { useState } from 'react'
import Modal from '../Modal'
import DatePicker from '../DatePicker'
import { categoriesFor } from '../../lib/categories'
import { today } from '../../lib/dates'
import type { Account, Category, CategoryGroup, IncomeSource, Transaction } from '../../lib/types'
import './TransactionFormModal.css'

// What the API expects
export type TransactionValues = {
  type: Transaction['type']
  amount: string
  date: string
  accountId: string
  categoryId: string
  incomeSourceId: string | null
  notes: string | null
}

type Props = {
  transaction?: Transaction // the transaction to edit; left out when adding
  accounts: Account[]
  categories: Category[]
  sources: IncomeSource[]
  onClose: () => void
  // Returns an error message to show, or null if it saved
  onSubmit: (values: TransactionValues) => Promise<string | null>
}

const GROUP_LABELS: Record<CategoryGroup, string> = {
  NEEDS: 'Needs',
  WANTS: 'Wants',
  SAVINGS: 'Savings',
  DEBT: 'Debt',
  INVESTMENTS: 'Investments',
  INCOME: 'Income',
}

// Add / edit transaction popup
function TransactionFormModal({ transaction: t, accounts, categories, sources, onClose, onSubmit }: Props) {
  // Archived records are only offered if this transaction already uses them
  const usableAccounts = accounts.filter((a) => a.archivedAt === null || a.id === t?.account.id)
  const usableSources = sources
    .filter((s) => s.archivedAt === null || s.id === t?.incomeSource?.id)
    .sort((a, b) => a.name.localeCompare(b.name))

  const [type, setType] = useState<Transaction['type']>(t?.type ?? 'EXPENSE')
  const [amount, setAmount] = useState(t?.amount ?? '')
  const [date, setDate] = useState(t?.date ?? today())
  const [accountId, setAccountId] = useState(t?.account.id ?? usableAccounts[0]?.id ?? '')
  const [categoryId, setCategoryId] = useState(
    t?.category.id ?? categoriesFor('EXPENSE', categories)[0]?.id ?? '',
  )
  const [sourceId, setSourceId] = useState(t?.incomeSource?.id ?? '')
  const [notes, setNotes] = useState(t?.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const categoryOptions = categoriesFor(type, categories, t?.category.id)
  const account = accounts.find((a) => a.id === accountId)

  // Switching type changes which categories fit, so pick one that does
  function changeType(next: Transaction['type']) {
    setType(next)
    const options = categoriesFor(next, categories, t?.category.id)
    if (!options.some((c) => c.id === categoryId)) setCategoryId(options[0]?.id ?? '')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const problem = await onSubmit({
      type,
      amount: amount.trim(),
      date,
      accountId,
      categoryId,
      incomeSourceId: type === 'INCOME' && sourceId ? sourceId : null,
      notes: notes.trim() || null,
    })
    setSaving(false)
    if (problem) setError(problem)
    else onClose()
  }

  if (usableAccounts.length === 0) {
    return (
      <Modal title="Add transaction" onClose={onClose}>
        <p className="transaction-form__hint">Add an account first, so there's somewhere for the money to go.</p>
      </Modal>
    )
  }

  return (
    <Modal title={t ? 'Edit transaction' : 'Add transaction'} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="segmented" role="radiogroup" aria-label="Type">
          {(['EXPENSE', 'INCOME'] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={type === option}
              className={type === option ? 'is-selected' : undefined}
              onClick={() => changeType(option)}
            >
              {option === 'EXPENSE' ? 'Expense' : 'Income'}
            </button>
          ))}
        </div>

        <label className="form-field">
          <span className="form-field__label">Amount</span>
          <input
            className="form-input"
            value={amount}
            inputMode="decimal"
            placeholder="0.00"
            autoFocus
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>

        <div className="form-field">
          <span className="form-field__label">Date</span>
          <DatePicker value={date} min={account?.openingDate} max={today()} onChange={setDate} />
        </div>

        <label className="form-field">
          <span className="form-field__label">{type === 'INCOME' ? 'Paid into' : 'Paid from'}</span>
          <select
            className="form-input form-select"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          >
            {usableAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>

        <label className="form-field">
          <span className="form-field__label">Category</span>
          <select
            className="form-input form-select"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            {(Object.keys(GROUP_LABELS) as CategoryGroup[]).map((group) => {
              const inGroup = categoryOptions.filter((c) => c.group === group)
              return (
                inGroup.length > 0 && (
                  <optgroup key={group} label={GROUP_LABELS[group]}>
                    {inGroup.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.emoji ? `${c.emoji} ` : ''}
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                )
              )
            })}
          </select>
        </label>

        {type === 'INCOME' && (
          <label className="form-field">
            <span className="form-field__label">Income source (optional)</span>
            <select
              className="form-input form-select"
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
            >
              <option value="">None</option>
              {usableSources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="form-field">
          <span className="form-field__label">Notes (optional)</span>
          <input
            className="form-input"
            value={notes}
            maxLength={200}
            placeholder="e.g. Weekly shop"
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <div className="modal-actions">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn--primary"
            disabled={!amount.trim() || !accountId || !categoryId || saving}
          >
            {t ? 'Save changes' : 'Add transaction'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default TransactionFormModal
