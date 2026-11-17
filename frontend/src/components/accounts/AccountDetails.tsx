import { Link } from 'react-router' // Users can navigate between pages without full page reloads
import { Archive, ArchiveRestore, ArrowLeft, Pencil, Scale, Trash2 } from 'lucide-react' // Icons for the "back" link and the menu actions
import type { ReactNode } from 'react'
import type { Account, Transaction } from '../../lib/types'
import { cn } from '@/lib/utils'
import { accountTint, accountTypes } from '../../lib/accountTypes'
import { balanceText } from '../../lib/accountBalance'
import { daysAgo, formatDate } from '../../lib/dates'
import ActionsMenu from '../ActionsMenu'
import RecentTransactions from './RecentTransactions'

type Props = {
  account: Account
  onEdit: () => void
  onToggleArchive: () => void
  onDelete: () => void
  onReconcile: () => void
  recent: Transaction[] | null // latest transactions; null while loading
}

// A small labelled fact, e.g. the opening balance
function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-[14px] bg-muted px-4 py-3.5">
      <dt className="text-xs tracking-[0.06em] text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-1.5 font-medium tabular-nums">{children}</dd>
    </div>
  )
}

// Right panel: the selected account's balances and activity
function AccountDetails({
  account,
  onEdit,
  onToggleArchive,
  onDelete,
  onReconcile,
  recent,
}: Props) {
  const archived = account.archivedAt !== null
  const { label, icon: Icon } = accountTypes[account.type]

  return (
    <article className="rounded-[20px] border border-border bg-card p-7 max-[480px]:p-5">
      {/* Only shown on phones, where the list is hidden */}
      <Link
        to="/accounts"
        className="mb-[18px] hidden items-center gap-2 text-muted-foreground no-underline max-[980px]:inline-flex"
      >
        <ArrowLeft size={18} aria-hidden /> All accounts
      </Link>

      <header className="flex flex-wrap items-center gap-3.5">
        <span
          className={cn(
            'grid size-12 shrink-0 place-items-center rounded-[14px] text-foreground/80',
            accountTint[account.type],
          )}
        >
          <Icon size={22} aria-hidden />
        </span>
        <div className="min-w-0 flex-[1_1_160px]">
          <h2 className="text-xl font-semibold wrap-anywhere">{account.name}</h2>
          <p className="mt-1 text-muted-foreground">
            {label} · updated {daysAgo(account.updatedAt)}
            {archived && (
              <span className="ml-2.5 rounded-full bg-border px-2.5 py-0.5 text-[13px] text-foreground/80">
                Archived
              </span>
            )}
          </p>
        </div>
        {/* On small phones the balance drops to its own line, under the name */}
        <div className="text-right max-[480px]:order-1 max-[480px]:w-full max-[480px]:text-left">
          <p className="text-xs tracking-[0.06em] text-muted-foreground uppercase">Balance</p>
          <p className="text-[clamp(24px,3vw,32px)] font-semibold tracking-[-0.01em] tabular-nums wrap-anywhere">
            {balanceText(account.type, account.currentBalance)}
          </p>
        </div>
        <ActionsMenu
          label={`Actions for ${account.name}`}
          actions={[
            {
              label: 'Edit account',
              hint: 'Change name, type or opening details',
              icon: Pencil,
              onSelect: onEdit,
            },
            // Archived accounts are read-only, so only active ones can be reconciled
            ...(archived
              ? []
              : [
                  {
                    label: 'Reconcile balance',
                    hint: 'Match the balance your bank shows',
                    icon: Scale,
                    onSelect: onReconcile,
                  },
                ]),
            {
              label: archived ? 'Restore account' : 'Archive account',
              hint: archived
                ? 'Show it in your accounts again'
                : 'Hide it while preserving history',
              icon: archived ? ArchiveRestore : Archive,
              onSelect: onToggleArchive,
            },
            {
              label: 'Delete account',
              hint: 'Only possible with no transactions',
              icon: Trash2,
              danger: true,
              onSelect: onDelete,
            },
          ]}
        />
      </header>

      <dl className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        <Fact label="Opening balance">{balanceText(account.type, account.openingBalance)}</Fact>
        <Fact label="Balance as of">{formatDate(account.openingDate)}</Fact>
      </dl>

      {/* key: a different account starts collapsed again */}
      <RecentTransactions key={account.id} transactions={recent} />
    </article>
  )
}

export default AccountDetails
