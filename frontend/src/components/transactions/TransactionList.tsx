import type { Transaction } from '../../lib/types'
import { dayLabel } from '../../lib/dates'
import TransactionRow from './TransactionRow'
import './TransactionList.css'

type Props = {
  transactions: Transaction[]
  onSelect: (transaction: Transaction) => void
}

// Transactions grouped under a heading for each day (they arrive newest first)
function TransactionList({ transactions, onSelect }: Props) {
  const days = new Map<string, Transaction[]>()
  for (const t of transactions) {
    days.set(t.date, [...(days.get(t.date) ?? []), t])
  }

  return (
    <div className="transaction-list">
      {[...days].map(([date, onDay]) => (
        <section key={date} className="transaction-list__day">
          <h2 className="transaction-list__date">{dayLabel(date)}</h2>
          <ul>
            {onDay.map((t) => (
              <TransactionRow key={t.id} transaction={t} onSelect={() => onSelect(t)} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

export default TransactionList
