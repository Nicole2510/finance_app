import { sumAmounts } from './money'
import type { BudgetLine, CategoryGroup } from './types'

// Money strings as whole cents, so comparisons are exact
const cents = (amount: string) => Math.round(Number(amount) * 100)

export type Progress = {
  used: number // percent of the budget spent, e.g. 219 (not capped)
  bar: number // the same, capped at 100 for drawing a bar
  over: boolean
  remaining: string // budget minus spent; negative when over, e.g. "-8.74"
}

// How far through a budget the spending is; null when there's no budget
export function progress(spent: string, budget: string | null): Progress | null {
  if (budget === null) return null
  const used = Math.round((cents(spent) / cents(budget)) * 100)
  const remaining = cents(budget) - cents(spent)
  return {
    used,
    bar: Math.min(100, used),
    over: remaining < 0,
    remaining: (remaining / 100).toFixed(2),
  }
}

// The month as a whole. "Planned" means categories that have a budget: the
// remaining budget compares those budgets with spending in those categories.
export function totals(lines: BudgetLine[]) {
  const planned = lines.filter((l) => l.budget !== null)
  const budgeted = sumAmounts(planned.map((l) => l.budget!))
  const plannedSpent = sumAmounts(planned.map((l) => l.spent))
  const remaining = sumAmounts([budgeted, `-${plannedSpent}`])
  return {
    budgeted,
    plannedSpent,
    remaining,
    // Share of the budget still left, e.g. 27 (0 when nothing is budgeted)
    percentLeft: cents(budgeted) > 0 ? Math.round((cents(remaining) / cents(budgeted)) * 100) : 0,
  }
}

// The tabs above the plan. "Savings & debt" is the 20% of 50/30/20.
export const PLAN_TABS: { id: string; label: string; groups: CategoryGroup[] | null }[] = [
  { id: 'all', label: 'All categories', groups: null },
  { id: 'needs', label: 'Needs', groups: ['NEEDS'] },
  { id: 'wants', label: 'Wants', groups: ['WANTS'] },
  { id: 'savings', label: 'Savings & debt', groups: ['SAVINGS', 'DEBT', 'INVESTMENTS'] },
]

// Plan order: by group, then the biggest budgets first, unbudgeted last
const GROUP_RANK: Record<CategoryGroup, number> = {
  NEEDS: 0,
  WANTS: 1,
  SAVINGS: 2,
  DEBT: 3,
  INVESTMENTS: 4,
  INCOME: 5,
}

export function planOrder(a: BudgetLine, b: BudgetLine) {
  return (
    GROUP_RANK[a.group] - GROUP_RANK[b.group] ||
    (b.budget === null ? -1 : cents(b.budget)) - (a.budget === null ? -1 : cents(a.budget)) ||
    a.name.localeCompare(b.name)
  )
}
