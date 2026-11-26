import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { parseBudgetInput } from '../../lib/budgets'
import { formatMoney } from '../../lib/money'
import { useToast } from '../../lib/toast'

type Props = {
  name: string // the category, for screen readers
  budget: string | null
  disabled?: boolean // e.g. archived categories can't be budgeted
  onSave: (amount: string | null) => Promise<void>
  className?: string
}

// A budget you can click to change. Enter or clicking away saves, Escape
// cancels, and clearing the box removes the budget.
function BudgetAmount({ name, budget, disabled = false, onSave, className }: Props) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  // Set once a finish has started, so Enter and the blur that follows don't both save
  const finished = useRef(false)
  const toast = useToast()

  function start() {
    finished.current = false
    setEditing(true)
  }

  async function finish(text: string, fromEnter: boolean) {
    if (finished.current) return
    const parsed = parseBudgetInput(text)
    if (!parsed.ok) {
      toast({ title: parsed.message, tone: 'error' })
      if (!fromEnter) setEditing(false) // clicked away: keep the old budget
      return
    }
    finished.current = true
    setEditing(false)
    if (parsed.amount === budget) return // nothing changed
    setSaving(true)
    await onSave(parsed.amount)
    setSaving(false)
  }

  if (editing) {
    return (
      <input
        autoFocus
        inputMode="decimal"
        defaultValue={budget ?? ''}
        placeholder="0.00"
        aria-label={`Budget for ${name}`}
        onFocus={(e) => e.target.select()}
        onBlur={(e) => finish(e.target.value, false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') finish(e.currentTarget.value, true)
          if (e.key === 'Escape') {
            finished.current = true
            setEditing(false)
          }
        }}
        className={cn(
          'w-28 rounded-[10px] border border-primary bg-card px-2.5 py-1.5 text-right tabular-nums outline-none ring-3 ring-primary/15',
          className,
        )}
      />
    )
  }

  return (
    <button
      type="button"
      disabled={disabled || saving}
      onClick={start}
      aria-label={
        budget
          ? `Budget for ${name}: ${formatMoney(budget)}. Change it`
          : `Set a budget for ${name}`
      }
      className={cn(
        'cursor-pointer rounded-[10px] border border-transparent bg-transparent px-2.5 py-1.5 tabular-nums hover:border-border hover:bg-muted disabled:cursor-default disabled:hover:border-transparent disabled:hover:bg-transparent',
        saving && 'opacity-50',
        className,
      )}
    >
      {budget ? (
        formatMoney(budget)
      ) : (
        <span className="text-muted-foreground">{disabled ? '—' : 'Set budget'}</span>
      )}
    </button>
  )
}

export default BudgetAmount
