import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { Transaction } from '../../lib/types'
import { dayLabel } from '../../lib/dates'
import { describeTransaction } from '../../lib/transactionDisplay'

// The panel loads at most this many; older ones live on the Transactions page
export const RECENT_MAX = 50
const COLLAPSED = 10

// An account's latest transactions: 10 up front, and "View all" opens the rest
// (up to 50) in a list that scrolls inside the panel
function RecentTransactions({ transactions }: { transactions: Transaction[] | null }) {
  const [expanded, setExpanded] = useState(false)

  if (!transactions)
    return (
      <Section>
        <p className="mt-2 text-muted-foreground">Loading...</p>
      </Section>
    )
  if (transactions.length === 0)
    return (
      <Section>
        <p className="mt-2 text-muted-foreground">No transactions yet.</p>
      </Section>
    )

  const shown = expanded ? transactions : transactions.slice(0, COLLAPSED)
  const hasMore = transactions.length > COLLAPSED

  return (
    <Section
      action={
        hasMore && (
          <button
            type="button"
            // "View all (43)" / "Show less": a small link beside the heading
            className="cursor-pointer border-none bg-transparent p-0 text-sm text-muted-foreground underline underline-offset-3 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Show less' : `View all (${transactions.length})`}
          </button>
        )
      }
    >
      {/* "View all": the full list scrolls inside the panel, at about the height
          of the 10 rows shown before, so the panel doesn't jump in size */}
      <ul className={cn('mt-3 list-none p-0', expanded && 'max-h-[600px] overflow-y-auto pr-1')}>
        {shown.map((t) => {
          const { emoji, name, amountText, isIncome } = describeTransaction(t)
          return (
            <li
              key={t.id}
              className="flex items-center gap-3 py-2 [&+&]:border-t [&+&]:border-border"
            >
              <span
                className="grid size-[34px] shrink-0 place-items-center rounded-[10px] bg-muted"
                aria-hidden
              >
                {emoji}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-medium">{name}</span>
                <span className="text-[13px] text-muted-foreground">{dayLabel(t.date)}</span>
              </span>
              <span
                className={cn('shrink-0 font-medium tabular-nums', isIncome && 'text-(--green)')}
              >
                {amountText}
              </span>
            </li>
          )
        })}
      </ul>

      {expanded && transactions.length === RECENT_MAX && (
        <p className="mt-3 text-center text-sm text-muted-foreground">
          Showing the latest {RECENT_MAX}. See Transactions for older ones.
        </p>
      )}
    </Section>
  )
}

// The heading every state shares, with an optional link beside it
function Section({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <section className="mt-6 border-t border-border pt-[22px]">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-lg font-semibold">Recent transactions</h3>
        {action}
      </div>
      {children}
    </section>
  )
}

export default RecentTransactions
