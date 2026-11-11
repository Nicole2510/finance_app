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
  const { icon: Icon } = accountTypes[account.type]
  const overdrawn = account.type !== 'CREDIT_CARD' && Number(account.currentBalance) < 0

  return (
    <Link
      to={`/accounts/${account.id}`}
      className={`account-row account-row--${account.type.toLowerCase()}${selected ? ' is-selected' : ''}${account.archivedAt ? ' is-archived' : ''}`}
      aria-current={selected ? 'page' : undefined}
    >
      <span className="account-row__icon">
        <Icon size={18} aria-hidden />
      </span>
      <span className="account-row__name">{account.name}</span>
      <span className={`account-row__balance${overdrawn ? ' is-negative' : ''}`}>
        {balanceText(account.type, account.currentBalance)}
      </span>
    </Link>
  )
}

export default AccountRow
