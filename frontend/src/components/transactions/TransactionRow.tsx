import { cn } from '@/lib/utils'
import type { Transaction } from '../../lib/types'
import { dayLabel } from '../../lib/dates'
import { describeTransaction } from '../../lib/transactionDisplay'

type Props = {
  transaction: Transaction
  onSelect: () => void
  checked: boolean
  onCheck: () => void
}

// Group pill tints, matching the Categories page tiles
const PILL_BG: Record<string, string> = {
  needs: 'bg-[#f6ebdf]',
  wants: 'bg-[#f6e3e1]',
  savings: 'bg-[#e5ebe2]',
  debt: 'bg-[#f3e9df]',
  investments: 'bg-[#e3eaec]',
  income: 'bg-[#e8e7f0]',
  adjustment: 'bg-border',
}

// Cells shown only on wider screens; on phones the date and account move
// under the category name instead
const wideOnly = 'max-[720px]:hidden'
const muted = 'text-sm whitespace-nowrap text-foreground/80'

// One table row. Clicking it (or Enter / Space when focused) opens it.
function TransactionRow({ transaction: t, onSelect, checked, onCheck }: Props) {
  const { emoji, name, pill, amountText, isIncome } = describeTransaction(t)
  const details = [t.incomeSource?.name, t.notes].filter(Boolean).join(' · ')

  return (
    <tr
      className={cn(
        'cursor-pointer transition-colors hover:bg-muted/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary',
        // A line between rows (on phones the row is a flex line, so it goes on the row)
        '[&+&>td]:border-t [&+&>td]:border-border max-[720px]:flex max-[720px]:items-center max-[720px]:[&+&]:border-t max-[720px]:[&+&]:border-border max-[720px]:[&+&>td]:border-t-0',
        '[&>td]:px-4 [&>td]:py-3 [&>td]:align-middle max-[720px]:[&>td]:px-3 max-[720px]:[&>td]:py-2.5',
        checked && 'bg-muted hover:bg-muted',
      )}
      tabIndex={0}
      aria-label={`Open ${name}, ${amountText}`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return // keys meant for the checkbox
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
    >
      <td className="pr-0! max-[720px]:shrink-0">
        {/* Selecting is separate from opening, so the click stops here */}
        <input
          type="checkbox"
          aria-label={`Select ${name}, ${amountText}, ${dayLabel(t.date)}`}
          checked={checked}
          className="size-[17px] cursor-pointer accent-foreground"
          onClick={(e) => e.stopPropagation()}
          onChange={onCheck}
        />
      </td>
      <td className={cn(muted, wideOnly)}>{dayLabel(t.date)}</td>
      <td className="max-[720px]:min-w-0 max-[720px]:flex-1">
        {/* Flex layout lives on an inner wrapper: a flex <td> stops behaving like a table cell */}
        <div className="flex items-center gap-3">
          <span
            className="grid size-[38px] shrink-0 place-items-center rounded-[10px] bg-muted text-lg"
            aria-hidden
          >
            {emoji}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-medium">{name}</span>
            {details && (
              <span className="max-w-80 truncate text-[13px] text-muted-foreground max-[720px]:max-w-none">
                {details}
              </span>
            )}
            {/* Phones hide the date and account columns, so show them here */}
            <span className="hidden truncate text-[13px] text-muted-foreground max-[720px]:block">
              {dayLabel(t.date)} · {t.account.name}
            </span>
          </span>
        </div>
      </td>
      <td className={wideOnly}>
        {pill && (
          <span
            className={cn(
              'inline-block rounded-full px-2.5 py-[3px] text-xs font-medium whitespace-nowrap text-foreground/80',
              PILL_BG[pill.className],
            )}
          >
            {pill.label}
          </span>
        )}
      </td>
      <td className={cn(muted, wideOnly)}>{t.account.name}</td>
      <td
        className={cn(
          'text-right font-medium whitespace-nowrap tabular-nums max-[720px]:shrink-0',
          isIncome && 'text-(--green)',
        )}
      >
        {amountText}
      </td>
    </tr>
  )
}

export default TransactionRow
