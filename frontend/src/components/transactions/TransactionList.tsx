import { useEffect, useRef } from 'react'
import type { Transaction } from '../../lib/types'
import TransactionRow from './TransactionRow'
import './TransactionList.css'

type Props = {
  transactions: Transaction[] // newest first, as the API sends them
  onSelect: (transaction: Transaction) => void
  checkedIds: Set<string>
  onCheck: (id: string) => void
  onCheckAll: (checked: boolean) => void
}

// Transactions as a table (stacked rows on phones), with a checkbox per row
function TransactionList({ transactions, onSelect, checkedIds, onCheck, onCheckAll }: Props) {
  const all = transactions.length > 0 && transactions.every((t) => checkedIds.has(t.id))
  const some = !all && transactions.some((t) => checkedIds.has(t.id))

  // "Some selected" is a third look for the header box, set on the element itself
  const headerBox = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (headerBox.current) headerBox.current.indeterminate = some
  }, [some])

  return (
    <table className="transaction-table">
      <thead>
        <tr>
          <th scope="col" className="transaction-row__check">
            <input
              ref={headerBox}
              type="checkbox"
              aria-label="Select all shown"
              checked={all}
              onChange={(e) => onCheckAll(e.target.checked)}
            />
          </th>
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
          <TransactionRow
            key={t.id}
            transaction={t}
            onSelect={() => onSelect(t)}
            checked={checkedIds.has(t.id)}
            onCheck={() => onCheck(t.id)}
          />
        ))}
      </tbody>
    </table>
  )
}

export default TransactionList
