import type { Transaction } from '../../lib/types'
import { dayLabel } from '../../lib/dates'
import { describeTransaction } from '../../lib/transactionDisplay'

type Props = {
  transaction: Transaction
  onSelect: () => void
}

// One table row. Clicking it (or Enter / Space when focused) opens it.
function TransactionRow({ transaction: t, onSelect }: Props) {
  const { emoji, name, pill, amountText, isIncome } = describeTransaction(t)
  const details = [t.incomeSource?.name, t.notes].filter(Boolean).join(' · ')

  return (
    <tr
      className="transaction-row"
      tabIndex={0}
      aria-label={`Open ${name}, ${amountText}`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
    >
      <td className="transaction-row__date">{dayLabel(t.date)}</td>
      <td className="transaction-row__category">
        {/* Flex layout lives on an inner wrapper: a flex <td> stops behaving like a table cell */}
        <div className="transaction-row__category-inner">
          <span className="transaction-row__emoji" aria-hidden>
            {emoji}
          </span>
          <span className="transaction-row__text">
            <span className="transaction-row__name">{name}</span>
            {details && <span className="transaction-row__details">{details}</span>}
            {/* Phones hide the date and account columns, so show them here */}
            <span className="transaction-row__phone-meta">
              {dayLabel(t.date)} · {t.account.name}
            </span>
          </span>
        </div>
      </td>
      <td className="transaction-row__group">
        {pill && <span className={`group-pill group-pill--${pill.className}`}>{pill.label}</span>}
      </td>
      <td className="transaction-row__account">{t.account.name}</td>
      <td className={`transaction-row__amount${isIncome ? ' is-income' : ''}`}>{amountText}</td>
    </tr>
  )
}

export default TransactionRow
