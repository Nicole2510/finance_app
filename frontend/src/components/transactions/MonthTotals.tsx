import type { Transaction } from '../../lib/types'
import { formatMoney, sumAmounts } from '../../lib/money'
import './MonthTotals.css'

// Income, expenses and what's left for the transactions shown
function MonthTotals({ transactions }: { transactions: Transaction[] }) {
  const amountsOf = (type: Transaction['type']) =>
    transactions.filter((t) => t.type === type).map((t) => t.amount)
  const income = sumAmounts(amountsOf('INCOME'))
  const expenses = sumAmounts(amountsOf('EXPENSE'))
  const net = sumAmounts([income, `-${expenses}`])

  return (
    <dl className="month-totals">
      <div>
        <dt>Income</dt>
        <dd className="is-income">{formatMoney(income)}</dd>
      </div>
      <div>
        <dt>Expenses</dt>
        <dd>{formatMoney(expenses)}</dd>
      </div>
      <div>
        <dt>Net</dt>
        <dd className={Number(net) < 0 ? 'is-negative' : undefined}>{formatMoney(net)}</dd>
      </div>
    </dl>
  )
}

export default MonthTotals
