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

// Reads a typed budget, e.g. "$1,200" or "450.5". An empty box means "no
// budget" (amount null). Anything else that isn't a positive amount is a problem.
export function parseBudgetInput(
  text: string,
): { ok: true; amount: string | null } | { ok: false; message: string } {
  const cleaned = text.replace(/[$,\s]/g, '')
  if (cleaned === '') return { ok: true, amount: null }
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(cleaned)) {
    return { ok: false, message: 'Enter an amount like 450 or 450.50' }
  }
  if (Number(cleaned) === 0) {
    return { ok: false, message: 'A budget must be more than $0. Clear the box to remove it.' }
  }
  return { ok: true, amount: Number(cleaned).toFixed(2) }
}

// The split used when none has been saved yet
export const DEFAULT_SPLIT = { needsPct: 50, wantsPct: 30, savingsPct: 20 }
export type Split = typeof DEFAULT_SPLIT

// Expected income not yet given to a budget; negative when more is budgeted
// than expected
export function unallocated(expected: string, lines: BudgetLine[]) {
  return sumAmounts([expected, `-${totals(lines).budgeted}`])
}

export type Bucket = {
  id: 'needs' | 'wants' | 'savings'
  label: string
  percent: number // the plan's share, e.g. 50
  target: string // that share of expected income
  planned: string // budgets set in the bucket's categories
  over: boolean // more planned than the target
  difference: string // how far over, or how much is still unallocated (positive)
  bar: number // planned as a share of the target, capped at 100
}

// The 50/30/20 breakdown: each bucket's target from expected income, against
// what's planned. With no expected income, every target is $0.
export function breakdown(split: Split, expected: string, lines: BudgetLine[]): Bucket[] {
  const shares = { needs: split.needsPct, wants: split.wantsPct, savings: split.savingsPct }
  return (['needs', 'wants', 'savings'] as const).map((id) => {
    const tab = PLAN_TABS.find((t) => t.id === id)!
    const percent = shares[id]
    const target = Math.round((cents(expected) * percent) / 100)
    const planned = cents(totals(lines.filter((l) => tab.groups!.includes(l.group))).budgeted)
    return {
      id,
      label: tab.label,
      percent,
      target: (target / 100).toFixed(2),
      planned: (planned / 100).toFixed(2),
      over: planned > target,
      difference: (Math.abs(target - planned) / 100).toFixed(2),
      bar: target > 0 ? Math.min(100, Math.round((planned / target) * 100)) : planned > 0 ? 100 : 0,
    }
  })
}
