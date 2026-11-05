import type { Account, AccountType } from '../../lib/types'
import { accountTypes } from '../../lib/accountTypes'
import { balanceText, sumBalances } from '../../lib/accountBalance'
import AccountRow from './AccountRow'

type Props = {
  type: AccountType
  accounts: Account[]
  selectedId: string | undefined
}

// One account type in the list: its heading, subtotal and accounts
function AccountGroup({ type, accounts, selectedId }: Props) {
  return (
    <section className="account-group">
      <h2 className="account-group__heading">
        <span>{accountTypes[type].plural}</span>
        <span>{balanceText(type, sumBalances(accounts))}</span>
      </h2>
      {accounts.map((account) => (
        <AccountRow key={account.id} account={account} selected={account.id === selectedId} />
      ))}
    </section>
  )
}

export default AccountGroup
