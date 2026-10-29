// Shapes returned by the API

export type CategoryGroup = 'NEEDS' | 'WANTS' | 'SAVINGS_DEBT' | 'INCOME'

export type Category = {
  id: string
  name: string
  emoji: string | null
  group: CategoryGroup
  archivedAt: string | null
}

export type IncomeSource = {
  id: string
  name: string
  emoji: string | null
  archivedAt: string | null
}
