import type { Transaction } from '../../lib/types'
import { formatMoney } from '../../lib/money'

type Props = {
  transaction: Transaction
  onSelect: () => void
}

// One transaction: category, where it was paid from or into, and the amount.
// The whole row is a button that opens it for editing.
function TransactionRow({ transaction: t, onSelect }: Props) {
  const isIncome = t.type === 'INCOME'
  const details = [t.account.name, t.incomeSource?.name, t.notes].filter(Boolean).join(' · ')

  return (
    <li>
      <button type="button" className="transaction-row" onClick={onSelect}>
        <span className="transaction-row__emoji" aria-hidden>
          {t.category.emoji ?? '·'}
        </span>
        <span className="transaction-row__text">
          <span className="transaction-row__name">{t.category.name}</span>
          <span className="transaction-row__details">{details}</span>
        </span>
        <span className={`transaction-row__amount${isIncome ? ' is-income' : ''}`}>
          {isIncome ? '+' : '−'}
          {formatMoney(t.amount)}
        </span>
      </button>
    </li>
  )
}

export default TransactionRow
