import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { Transaction } from '../../lib/types'
import { formatMoney, sumAmounts } from '../../lib/money'

// One card: a small label and a big number
function Total({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className="rounded-[20px] border border-border bg-card px-[18px] py-4">
      <dt className="text-xs tracking-[0.06em] text-muted-foreground uppercase">{label}</dt>
      <dd className={cn('mt-1.5 text-[22px] font-semibold tabular-nums', className)}>{children}</dd>
    </div>
  )
}

// Income, expenses and what's left for the transactions shown
function MonthTotals({ transactions }: { transactions: Transaction[] }) {
  const amountsOf = (type: Transaction['type']) =>
    transactions.filter((t) => t.type === type).map((t) => t.amount)
  const income = sumAmounts(amountsOf('INCOME'))
  const expenses = sumAmounts(amountsOf('EXPENSE'))
  const net = sumAmounts([income, `-${expenses}`])

  return (
    <dl className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
      <Total label="Income" className="text-(--green)">
        {formatMoney(income)}
      </Total>
      <Total label="Expenses">{formatMoney(expenses)}</Total>
      <Total label="Net" className={Number(net) < 0 ? 'text-destructive' : undefined}>
        {formatMoney(net)}
      </Total>
    </dl>
  )
}

export default MonthTotals
