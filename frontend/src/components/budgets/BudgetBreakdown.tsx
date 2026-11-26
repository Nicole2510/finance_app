import { Link } from 'react-router'
import { Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { breakdown, type Split } from '../../lib/budgets'
import { formatMoney, sumAmounts } from '../../lib/money'
import type { BudgetLine, MonthIncome } from '../../lib/types'
import ProgressBar from './ProgressBar'

type Props = {
  split: Split // the month's split (50/30/20 until one is saved)
  income: MonthIncome
  lines: BudgetLine[]
  onEdit: () => void
}

// How received compares with expected: "+$250.00" / "−$400.00", or nothing
function receivedGap(income: MonthIncome) {
  const gap = Number(sumAmounts([income.received, `-${income.expected}`]))
  if (Number(income.expected) === 0 || gap === 0) return null
  return `${gap > 0 ? '+' : '−'}${formatMoney(String(Math.abs(gap)))}`
}

// Expected income split into Needs, Wants and Savings & debt targets, against
// what's planned. With no expected income the targets are $0, and a small
// "Set up pay" link points to the pay schedules.
function BudgetBreakdown({ split, income, lines, onEdit }: Props) {
  const label = `${split.needsPct}/${split.wantsPct}/${split.savingsPct}`
  const noIncome = Number(income.expected) === 0
  const paydays = income.paydays.length
  const gap = receivedGap(income)

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">{label} budget breakdown</h2>
          {/* Expected and received are two separate figures; only expected sets the targets */}
          <p className="mt-1 text-sm text-muted-foreground tabular-nums">
            Expected{' '}
            {noIncome ? (
              <Link
                to="/categories?open=sources"
                className="font-medium text-primary underline-offset-3 hover:underline"
              >
                Set up pay
              </Link>
            ) : (
              <>
                {formatMoney(income.expected)} · {paydays} {paydays === 1 ? 'payday' : 'paydays'}
              </>
            )}{' '}
            · Received {formatMoney(income.received)}
            {gap && ` (${gap})`}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={onEdit}>
          <Pencil size={16} /> Edit split
        </Button>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-5">
        {breakdown(split, income.expected, lines).map((b) => (
          <article
            key={b.id}
            className="rounded-[20px] border border-border bg-card p-6 max-sm:p-5"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-semibold">{b.label}</h3>
              <span className="text-2xl font-semibold text-primary">{b.percent}%</span>
            </div>
            <p className="mt-4 text-3xl font-semibold tabular-nums">{formatMoney(b.target)}</p>
            <p className="text-muted-foreground">Monthly target</p>

            <ProgressBar percent={b.bar} over={b.over} className="mt-6" />
            <div className="mt-3 flex flex-wrap justify-between gap-x-3 gap-y-1 text-sm tabular-nums">
              <span className="text-muted-foreground">{formatMoney(b.planned)} planned</span>
              <span className={cn(b.over ? 'text-destructive' : 'text-(--green)')}>
                {formatMoney(b.difference)} {b.over ? 'over target' : 'unallocated'}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export default BudgetBreakdown
