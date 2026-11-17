import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import Modal from '../Modal'
import DatePicker from '../DatePicker'
import { categoriesFor } from '../../lib/categories'
import { formatDate, today } from '../../lib/dates'
import type { Account, Category, EntryType, IncomeSource, Transaction } from '../../lib/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import CategoryPicker from '../CategoryPicker'
import ListPicker from '../ListPicker'
import { Field, FieldLabel, FormActions, FormError, Input } from '../form'

// What the API expects
export type TransactionValues = {
  type: EntryType
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
  onDelete?: () => void // only when editing; the page asks to confirm
}

// Add / edit transaction popup
function TransactionFormModal({
  transaction: t,
  accounts,
  categories,
  sources,
  onClose,
  onSubmit,
  onDelete,
}: Props) {
  // Archived records are only offered if this transaction already uses them
  const usableAccounts = accounts.filter((a) => a.archivedAt === null || a.id === t?.account.id)
  const usableSources = sources
    .filter((s) => s.archivedAt === null || s.id === t?.incomeSource?.id)
    .sort((a, b) => a.name.localeCompare(b.name))

  const [type, setType] = useState<EntryType>(
    t?.type === 'INCOME' ? 'INCOME' : 'EXPENSE', // the form never opens adjustments
  )
  const [amount, setAmount] = useState(t?.amount ?? '')
  const [date, setDate] = useState(t?.date ?? today())
  const [accountId, setAccountId] = useState(t?.account.id ?? usableAccounts[0]?.id ?? '')
  const [categoryId, setCategoryId] = useState(
    t?.category?.id ?? categoriesFor('EXPENSE', categories)[0]?.id ?? '',
  )
  // The category last chosen for each type, so switching Expense → Income →
  // Expense brings back what you had instead of a different category
  const [chosenByType, setChosenByType] = useState<Partial<Record<EntryType, string>>>({})
  const [sourceId, setSourceId] = useState(t?.incomeSource?.id ?? '')
  const [notes, setNotes] = useState(t?.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const categoryOptions = categoriesFor(type, categories, t?.category?.id)
  const account = accounts.find((a) => a.id === accountId)

  // Switching type changes which categories fit, so pick one that does
  // Switching type: remember this type's category, then restore the other
  // type's (or pick its first category the first time you switch to it)
  function changeType(next: EntryType) {
    if (next === type) return
    const chosen = { ...chosenByType, [type]: categoryId }
    setChosenByType(chosen)
    setType(next)

    const options = categoriesFor(next, categories, t?.category?.id)
    const previous = chosen[next]
    setCategoryId(
      previous && options.some((c) => c.id === previous) ? previous : (options[0]?.id ?? ''),
    )
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
        <p className="text-muted-foreground">
          Add an account first, so there's somewhere for the money to go.
        </p>
      </Modal>
    )
  }

  return (
    <Modal
      title={t ? 'Edit transaction' : 'Add transaction'}
      badge={
        t && (
          <p
            className={cn(
              '-mt-2 mb-4 inline-block rounded-full px-3 py-1 text-[13px] font-medium text-foreground/80',
              type === 'EXPENSE' ? 'bg-muted' : 'bg-[#e8e7f0]',
            )}
          >
            {type === 'EXPENSE' ? 'Expense' : 'Income'}
          </p>
        )
      }
      onClose={onClose}
    >
      <form onSubmit={submit}>
        {/* Only new transactions choose a type; a saved one shows it in the header */}
        {!t && (
          // Expense / Income switch
          <div
            className="mb-5 grid grid-cols-2 gap-1 rounded-[10px] bg-muted p-1"
            role="radiogroup"
            aria-label="Type"
          >
            {(['EXPENSE', 'INCOME'] as const).map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={type === option}
                className={cn(
                  'cursor-pointer rounded-lg border-none bg-transparent px-3 py-[9px] font-medium text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                  type === option &&
                    'bg-card text-foreground shadow-[0_1px_3px_rgba(30,27,46,0.12)]',
                )}
                onClick={() => changeType(option)}
              >
                {option === 'EXPENSE' ? 'Expense' : 'Income'}
              </button>
            ))}
          </div>
        )}

        <Field>
          <FieldLabel>Amount</FieldLabel>
          <Input
            value={amount}
            inputMode="decimal"
            placeholder="0.00"
            autoFocus
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>

        <Field as="div">
          <FieldLabel>Date</FieldLabel>
          <DatePicker value={date} max={today()} onChange={setDate} />
          {account && date < account.openingDate && (
            <span className="text-[13px] text-muted-foreground">
              Before this account's opening date ({formatDate(account.openingDate)}): kept as
              history, and doesn't change the balance.
            </span>
          )}
        </Field>

        <Field as="div">
          <FieldLabel id="account-label">
            {type === 'INCOME' ? 'Paid into' : 'Paid from'}
          </FieldLabel>
          <ListPicker
            title={type === 'INCOME' ? 'Paid into' : 'Paid from'}
            labelId="account-label"
            value={accountId}
            options={usableAccounts.map((a) => ({ value: a.id, label: a.name }))}
            onChange={setAccountId}
            placeholder="Choose an account"
          />
        </Field>

        <Field as="div">
          <FieldLabel id="category-label">Category</FieldLabel>
          {/* A floating card drawn by the app, so it stays inside the window */}
          <CategoryPicker
            categories={categoryOptions}
            value={categoryId}
            onChange={setCategoryId}
            labelId="category-label"
          />
        </Field>

        {type === 'INCOME' && (
          <Field as="div">
            <FieldLabel id="source-label">Income source (optional)</FieldLabel>
            <ListPicker
              title="Income source"
              labelId="source-label"
              value={sourceId}
              options={[
                { value: '', label: 'None' },
                ...usableSources.map((s) => ({ value: s.id, label: s.name })),
              ]}
              onChange={setSourceId}
            />
          </Field>
        )}

        <Field>
          <FieldLabel>Notes (optional)</FieldLabel>
          <Input
            value={notes}
            maxLength={200}
            placeholder="e.g. Weekly shop"
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>

        {error && <FormError role="alert">{error}</FormError>}

        <FormActions>
          <Button type="button" variant="outline" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="lg"
            disabled={!amount.trim() || !accountId || !categoryId || saving}
          >
            {t ? 'Save changes' : 'Add transaction'}
          </Button>
        </FormActions>

        {t && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] border-none bg-transparent p-2.5 font-medium text-destructive hover:bg-destructive/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Trash2 size={16} aria-hidden /> Delete transaction
          </button>
        )}
      </form>
    </Modal>
  )
}

export default TransactionFormModal
