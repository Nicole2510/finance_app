import { useState } from 'react'
import Modal from '../Modal'
import { balanceText, toStoredBalance } from '../../lib/accountBalance'
import { formatMoney } from '../../lib/money'
import type { Account } from '../../lib/types'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel, FormActions, FormError, Input } from '../form'

type Props = {
  account: Account
  onClose: () => void
  // Sends the real balance; returns an error message, or null if it worked
  onSubmit: (actualBalance: string) => Promise<string | null>
}

const MONEY = /^-?\d{1,10}(\.\d{1,2})?$/

// Enter what the bank says; Nayad records an adjustment for the difference
function ReconcileModal({ account, onClose, onSubmit }: Props) {
  const [entered, setEntered] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const isCard = account.type === 'CREDIT_CARD'
  // Credit cards are typed as an amount owed, like everywhere else
  const actual = entered.trim() ? toStoredBalance(account.type, entered.trim()) : ''
  const valid = MONEY.test(actual)
  // Worked out in cents so the preview is exact; the server does the real maths
  const diff = valid
    ? Math.round(Number(actual) * 100) - Math.round(Number(account.currentBalance) * 100)
    : null

  function preview() {
    if (diff === null) return null
    if (diff === 0) return 'That already matches, so nothing needs adjusting.'
    const amount = formatMoney(String(Math.abs(diff) / 100))
    if (isCard)
      return diff < 0 ? `Adds ${amount} to what you owe.` : `Takes ${amount} off what you owe.`
    return diff > 0 ? `Adds ${amount} to the balance.` : `Takes ${amount} off the balance.`
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const problem = await onSubmit(actual)
    setSaving(false)
    if (problem) setError(problem)
    else onClose()
  }

  return (
    <Modal title="Reconcile balance" onClose={onClose}>
      <form onSubmit={submit}>
        <p className="reconcile__current">
          In Nayad: <strong>{balanceText(account.type, account.currentBalance)}</strong>
        </p>

        <Field>
          <FieldLabel>
            {isCard ? 'Amount owed, according to your bank' : 'Balance, according to your bank'}
          </FieldLabel>
          <Input
            value={entered}
            inputMode="decimal"
            placeholder="0.00"
            autoFocus
            onChange={(e) => setEntered(e.target.value)}
          />
        </Field>

        {preview() && (
          <p className="reconcile__preview" aria-live="polite">
            {preview()} It's recorded as a balance adjustment dated today, so your history stays
            intact.
          </p>
        )}

        {error && <FormError role="alert">{error}</FormError>}

        <FormActions>
          <Button type="button" variant="outline" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="lg" disabled={!diff || saving}>
            Add adjustment
          </Button>
        </FormActions>
      </form>
    </Modal>
  )
}

export default ReconcileModal
