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
    <section className="[&+&]:mt-2">
      <h2 className="flex justify-between gap-3 px-2.5 pt-2.5 pb-1.5 text-xs font-medium tracking-[0.06em] text-muted-foreground uppercase tabular-nums">
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
