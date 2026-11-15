import type { CategoryGroup } from './types'

// Display name for each category group, in the order they're shown
export const categoryGroups: Record<CategoryGroup, { label: string }> = {
  NEEDS: { label: 'Needs' },
  WANTS: { label: 'Wants' },
  SAVINGS: { label: 'Savings' },
  DEBT: { label: 'Debt' },
  INVESTMENTS: { label: 'Investments' },
  INCOME: { label: 'Income' },
}

export const GROUP_ORDER = Object.keys(categoryGroups) as CategoryGroup[]
