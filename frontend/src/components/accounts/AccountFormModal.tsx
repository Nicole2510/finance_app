import { useState } from 'react'
import Modal from '../Modal'
import DatePicker from '../DatePicker'
import { accountTypes } from '../../lib/accountTypes'
import { toStoredBalance } from '../../lib/accountBalance'
import { today } from '../../lib/dates'
import type { Account, AccountType } from '../../lib/types'
import { Button } from '@/components/ui/button'
import ListPicker from '../ListPicker'

// What the API expects (credit card balances already negative)
export type AccountValues = {
  name: string
  type: AccountType
  openingBalance: string
  openingDate: string
}

type Props = {
  account?: Account // the account to edit; left out when adding
  onClose: () => void
  // Returns an error message to show, or null if it saved
  onSubmit: (values: AccountValues) => Promise<string | null>
}

// Add / edit account popup
function AccountFormModal({ account, onClose, onSubmit }: Props) {
  const [name, setName] = useState(account?.name ?? '')
  const [type, setType] = useState<AccountType>(account?.type ?? 'CHEQUING')
  // Flipping a stored balance gives back what the form shows, so the same function works
  const [amount, setAmount] = useState(
    account ? toStoredBalance(account.type, account.openingBalance) : '',
  )
  const [openingDate, setOpeningDate] = useState(account?.openingDate ?? today())
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const isCard = type === 'CREDIT_CARD'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const problem = await onSubmit({
      name: name.trim(),
      type,
      openingBalance: toStoredBalance(type, amount.trim()),
      openingDate,
    })
    setSaving(false)
    if (problem) setError(problem)
    else onClose()
  }

  return (
    <Modal title={account ? 'Edit account' : 'Add account'} onClose={onClose}>
      <form onSubmit={submit}>
        <label className="form-field">
          <span className="form-field__label">Name</span>
          <input
            className="form-input"
            value={name}
            maxLength={40}
            autoFocus
            placeholder="e.g. Maple Bank"
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <div className="form-field">
          <span className="form-field__label" id="account-type-label">
            Type
          </span>
          <ListPicker<AccountType>
            title="Account type"
            labelId="account-type-label"
            value={type}
            options={Object.entries(accountTypes).map(([id, { label }]) => ({
              value: id as AccountType,
              label,
            }))}
            onChange={setType}
          />
        </div>

        <label className="form-field">
          <span className="form-field__label">{isCard ? 'Amount owed' : 'Opening balance'}</span>
          <input
            className="form-input"
            value={amount}
            inputMode="decimal"
            placeholder="0.00"
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>

        <div className="form-field">
          <span className="form-field__label">Balance as of</span>
          <DatePicker value={openingDate} max={today()} onChange={setOpeningDate} />
        </div>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <div className="modal-actions">
          <Button type="button" variant="outline" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="lg"
            disabled={!name.trim() || !amount.trim() || !openingDate || saving}
          >
            {account ? 'Save changes' : 'Create account'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default AccountFormModal
