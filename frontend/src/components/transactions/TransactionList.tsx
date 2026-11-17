import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import type { Transaction } from '../../lib/types'
import TransactionRow from './TransactionRow'

type Props = {
  transactions: Transaction[] // newest first, as the API sends them
  onSelect: (transaction: Transaction) => void
  checkedIds: Set<string>
  onCheck: (id: string) => void
  onCheckAll: (checked: boolean) => void
}

const heading =
  'bg-card px-4 py-3 text-left text-xs font-semibold tracking-[0.06em] text-foreground/80 uppercase'

// Transactions as a table (stacked rows on phones), with a checkbox per row
function TransactionList({ transactions, onSelect, checkedIds, onCheck, onCheckAll }: Props) {
  const all = transactions.length > 0 && transactions.every((t) => checkedIds.has(t.id))
  const some = !all && transactions.some((t) => checkedIds.has(t.id))

  // "Some selected" is a third look for the header box, set on the element itself
  const headerBox = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (headerBox.current) headerBox.current.indeterminate = some
  }, [some])

  // The headings and the rows are two tables sharing the same column widths,
  // so only the rows scroll and the scrollbar starts below the headings
  const columns = (
    <colgroup>
      <col className="w-11" />
      <col className="w-32" />
      <col />
      <col className="w-36" />
      <col className="w-44" />
      <col className="w-36" />
    </colgroup>
  )

  return (
    <div className="flex min-h-0 flex-col">
      {/* Both parts reserve the scrollbar's width, so the columns line up.
          Headings are hidden on phones, where rows stack. */}
      <div className="shrink-0 overflow-hidden border-b border-border [scrollbar-gutter:stable] max-[720px]:hidden">
        <table className="w-full table-fixed border-collapse max-[720px]:block">
          {columns}
          <thead>
            <tr>
              <th scope="col" className={cn(heading, 'pr-0')}>
                <input
                  ref={headerBox}
                  type="checkbox"
                  aria-label="Select all shown"
                  checked={all}
                  onChange={(e) => onCheckAll(e.target.checked)}
                />
              </th>
              <th scope="col" className={heading}>
                Date
              </th>
              <th scope="col" className={heading}>
                Category
              </th>
              <th scope="col" className={heading}>
                Group
              </th>
              <th scope="col" className={heading}>
                Account
              </th>
              <th scope="col" className={cn(heading, 'text-right')}>
                Amount
              </th>
            </tr>
          </thead>
        </table>
      </div>
      {/* mb-2 keeps the scrollbar clear of the panel's rounded corner */}
      <div className="mb-2 min-h-0 overflow-y-auto [scrollbar-gutter:stable] max-[860px]:mb-0 max-[860px]:overflow-visible">
        <table className="w-full table-fixed border-collapse max-[720px]:block">
          {columns}
          <tbody className="max-[720px]:block">
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
      </div>
    </div>
  )
}

export default TransactionList
