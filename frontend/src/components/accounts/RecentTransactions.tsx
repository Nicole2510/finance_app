import { useState, type ReactNode } from 'react'
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
        <p>Loading...</p>
      </Section>
    )
  if (transactions.length === 0)
    return (
      <Section>
        <p>No transactions yet.</p>
      </Section>
    )

  const shown = expanded ? transactions : transactions.slice(0, COLLAPSED)
  const hasMore = transactions.length > COLLAPSED

  return (
    <Section>
      <ul className={`recent-list${expanded ? ' is-expanded' : ''}`}>
        {shown.map((t) => {
          const { emoji, name, amountText, isIncome } = describeTransaction(t)
          return (
            <li key={t.id} className="recent-list__item">
              <span className="recent-list__emoji" aria-hidden>
                {emoji}
              </span>
              <span className="recent-list__text">
                <span className="recent-list__name">{name}</span>
                <span className="recent-list__date">{dayLabel(t.date)}</span>
              </span>
              <span className={`recent-list__amount${isIncome ? ' is-income' : ''}`}>
                {amountText}
              </span>
            </li>
          )
        })}
      </ul>

      {expanded && transactions.length === RECENT_MAX && (
        <p className="recent-list__note">
          Showing the latest {RECENT_MAX}. See Transactions for older ones.
        </p>
      )}

      {hasMore && (
        <button
          type="button"
          className="btn btn--secondary recent-list__more"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Show less' : `View all (${transactions.length})`}
        </button>
      )}
    </Section>
  )
}

// The heading every state shares
function Section({ children }: { children: ReactNode }) {
  return (
    <section className="account-details__activity">
      <h3>Recent transactions</h3>
      {children}
    </section>
  )
}

export default RecentTransactions
