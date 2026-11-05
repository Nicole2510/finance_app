import { Link } from 'react-router'
import type { Account } from '../../lib/types'
import { accountTypes } from '../../lib/accountTypes'
import { balanceText } from '../../lib/accountBalance'
import './AccountRow.css'

type Props = {
  account: Account
  selected: boolean
}

// One account in the list; its link is what selects it
function AccountRow({ account, selected }: Props) {
  const { label, icon: Icon } = accountTypes[account.type]

  return (
    <Link
      to={`/accounts/${account.id}`}
      className={`account-row account-row--${account.type.toLowerCase()}${selected ? ' is-selected' : ''}${account.archivedAt ? ' is-archived' : ''}`}
      aria-current={selected ? 'page' : undefined}
    >
      <span className="account-row__icon">
        <Icon size={20} aria-hidden />
      </span>
      <span className="account-row__text">
        <span className="account-row__name">{account.name}</span>
        <span className="account-row__meta">
          {label} · {balanceText(account.type, account.currentBalance)}
        </span>
      </span>
    </Link>
  )
}

export default AccountRow
