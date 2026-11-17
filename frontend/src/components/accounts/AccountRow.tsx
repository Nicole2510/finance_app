import { Link } from 'react-router'
import type { Account } from '../../lib/types'
import { cn } from '@/lib/utils'
import { accountTint, accountTypes } from '../../lib/accountTypes'
import { balanceText } from '../../lib/accountBalance'

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
      className={cn(
        'flex items-center gap-3.5 rounded-[14px] px-2.5 py-2 text-foreground no-underline transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        selected && 'bg-accent hover:bg-accent',
        account.archivedAt && '[&>*]:opacity-60',
      )}
      aria-current={selected ? 'page' : undefined}
    >
      <span
        className={cn(
          'grid size-[38px] shrink-0 place-items-center rounded-[10px] text-foreground/80',
          accountTint[account.type],
        )}
      >
        <Icon size={18} aria-hidden />
      </span>
      <span className="min-w-0 flex-1 truncate font-medium">{account.name}</span>
      <span className={cn('shrink-0 tabular-nums', overdrawn && 'text-destructive')}>
        {balanceText(account.type, account.currentBalance)}
      </span>
    </Link>
  )
}

export default AccountRow
