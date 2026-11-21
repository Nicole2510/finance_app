import { Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import { totals } from '../../lib/budgets'
import { formatMoney } from '../../lib/money'
import type { BudgetLine } from '../../lib/types'
import ProgressBar from './ProgressBar'

// The month at a glance: total budget, what's been spent against it, what remains
function BudgetHero({ lines }: { lines: BudgetLine[] }) {
  const t = totals(lines)
  const hasBudget = Number(t.budgeted) > 0
  const over = Number(t.remaining) < 0
  const usedPercent = hasBudget ? 100 - t.percentLeft : 0

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

      {hasBudget && (
        <>
          <ProgressBar percent={usedPercent} over={over} className="mt-5 h-2.5" />
          <div className="mt-6 border-t border-border pt-5">
            <p className="text-muted-foreground">Remaining budget</p>
            <p
              className={cn(
                'mt-1 text-3xl font-semibold tabular-nums',
                over ? 'text-destructive' : 'text-(--green)',
              )}
            >
              {formatMoney(t.remaining)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {over ? 'Over your planned budget' : `${t.percentLeft}% left to spend`}
            </p>
          </div>
        </>
      )}
    </section>
  )
}

export default BudgetHero
