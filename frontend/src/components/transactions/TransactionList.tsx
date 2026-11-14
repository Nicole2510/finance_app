import type { Transaction } from '../../lib/types'
import TransactionRow from './TransactionRow'
import './TransactionList.css'

type Props = {
  transactions: Transaction[] // newest first, as the API sends them
  onSelect: (transaction: Transaction) => void
}

// Transactions as a table (stacked rows on phones)
function TransactionList({ transactions, onSelect }: Props) {
  return (
    <table className="transaction-table">
      <thead>
        <tr>
          <th scope="col">Date</th>
          <th scope="col">Category</th>
          <th scope="col">Group</th>
          <th scope="col">Account</th>
          <th scope="col" className="transaction-table__amount">
            Amount
          </th>
        </tr>
      </thead>
      <tbody>
        {transactions.map((t) => (
          <TransactionRow key={t.id} transaction={t} onSelect={() => onSelect(t)} />
        ))}
      </tbody>
    </table>
  )
}

export default TransactionList
