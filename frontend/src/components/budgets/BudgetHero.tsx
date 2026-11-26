import type { ReactNode } from 'react'
import { Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import { totals, unallocated } from '../../lib/budgets'
import { formatMoney } from '../../lib/money'
import type { BudgetLine, MonthIncome } from '../../lib/types'
import ProgressBar from './ProgressBar'

// A big figure with a label above and a note below
function Figure({
  label,
  amount,
  good,
  note,
}: {
  label: string
  amount: string
  good: boolean // green when good, red when not
  note: ReactNode
}) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-1 text-3xl font-semibold tabular-nums',
          good ? 'text-(--green)' : 'text-destructive',
        )}
      >
        {formatMoney(amount)}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{note}</p>
    </div>
  )
}

// The month at a glance: total budget, what's been spent against it, what
// remains, and the expected income not yet given to a budget
function BudgetHero({ lines, income }: { lines: BudgetLine[]; income: MonthIncome }) {
  const t = totals(lines)
  const hasBudget = Number(t.budgeted) > 0
  const over = Number(t.remaining) < 0
  const usedPercent = hasBudget ? 100 - t.percentLeft : 0
  const funds = unallocated(income.expected, lines)

  return (
    <section className="rounded-[20px] border border-border bg-card p-7 max-sm:p-5">
      <h2 className="flex items-center gap-2.5 text-lg font-semibold">
        <Wallet size={20} className="text-primary" aria-hidden /> Monthly budget
      </h2>

      <p className="mt-3 text-[clamp(34px,5vw,46px)] font-semibold tracking-tight tabular-nums">
        {formatMoney(t.budgeted)}
      </p>
      <p className="text-muted-foreground">
        {hasBudget
          ? `${formatMoney(t.plannedSpent)} spent across your planned categories`
          : 'No budgets yet this month. Set some in the plan below.'}
      </p>
      {hasBudget && <ProgressBar percent={usedPercent} over={over} className="mt-5 h-2.5" />}

      <div className="mt-6 grid grid-cols-2 gap-6 border-t border-border pt-5 max-sm:grid-cols-1">
        {hasBudget && (
          <Figure
            label="Remaining budget"
            amount={t.remaining}
            good={!over}
            note={over ? 'Over your planned budget' : `${t.percentLeft}% left to spend`}
          />
        )}
        <Figure
          label="Unallocated funds"
          amount={funds}
          good={Number(funds) >= 0}
          note={
            Number(income.expected) === 0
              ? 'No income expected yet'
              : Number(funds) < 0
                ? 'Exceeded expected income'
                : `From ${formatMoney(income.expected)} expected income`
          }
        />
      </div>
    </section>
  )
}

export default BudgetHero
