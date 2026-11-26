import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { Split } from '../../lib/budgets'
import { monthLabel } from '../../lib/dates'
import Modal from '../Modal'
import { Field, FieldLabel, FormActions, FormError, Input } from '../form'

type Props = {
  month: string // the month being viewed; the split applies from here on
  split: Split // the split this month uses now
  from: string | null // the month that split started, if one was saved
  onClose: () => void
  onSubmit: (split: Split) => Promise<string | null> // the problem, if any
}

const SHARES = [
  { key: 'needsPct', label: 'Needs' },
  { key: 'wantsPct', label: 'Wants' },
  { key: 'savingsPct', label: 'Savings & debt' },
] as const

// How expected income is split into needs, wants and savings, from this month on
function PlanFormModal({ month, split, from, onClose, onSubmit }: Props) {
  const [shares, setShares] = useState({
    needsPct: String(split.needsPct),
    wantsPct: String(split.wantsPct),
    savingsPct: String(split.savingsPct),
  })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const numbers = SHARES.map(({ key }) => Number(shares[key]))
  const total = numbers.reduce((sum, n) => sum + (Number.isFinite(n) ? n : 0), 0)
  const wholeNumbers = SHARES.every(({ key }) => /^\d{1,3}$/.test(shares[key].trim()))
  const ready = wholeNumbers && total === 100

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const problem = await onSubmit({
      needsPct: numbers[0],
      wantsPct: numbers[1],
      savingsPct: numbers[2],
    })
    setSaving(false)
    if (problem) setError(problem)
    else onClose()
  }

  // A split that started in an earlier month is left as it was for those months
  const carried = from !== null && from !== month

  return (
    <Modal title="Edit your split" onClose={onClose}>
      <form onSubmit={submit}>
        <p className="mb-5 text-sm text-muted-foreground">
          How your expected income is shared out. Applies from {monthLabel(month)} on.
          {carried && ` ${monthLabel(from)} and earlier keep their current split.`}
        </p>

        <div className="mb-2 grid grid-cols-3 gap-3">
          {SHARES.map(({ key, label }) => (
            <Field key={key} className="mb-0">
              <FieldLabel>{label}</FieldLabel>
              <div className="relative">
                <Input
                  value={shares[key]}
                  inputMode="numeric"
                  autoFocus={key === 'needsPct'}
                  aria-label={`${label} percentage`}
                  onChange={(e) => setShares({ ...shares, [key]: e.target.value })}
                  className="w-full pr-8"
                />
                <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-muted-foreground">
                  %
                </span>
              </div>
            </Field>
          ))}
        </div>
        <p
          className={cn(
            'mb-5 text-sm tabular-nums',
            ready ? 'text-muted-foreground' : 'text-destructive',
          )}
          aria-live="polite"
        >
          {!wholeNumbers
            ? 'Use whole numbers from 0 to 100'
            : total === 100
              ? 'Adds up to 100%'
              : `Adds up to ${total}%, needs to be 100%`}
        </p>

        {error && <FormError role="alert">{error}</FormError>}

        <FormActions>
          <Button type="button" variant="outline" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="lg" disabled={!ready || saving}>
            Save split
          </Button>
        </FormActions>
      </form>
    </Modal>
  )
}

export default PlanFormModal
