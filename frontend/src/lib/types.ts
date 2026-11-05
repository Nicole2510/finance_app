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

// Defines the allowed account types in the frontend
export type AccountType = 'CHEQUING' | 'SAVINGS' | 'CREDIT_CARD' | 'CASH' | 'INVESTMENT'

// Money is represented as strings to preserve decimal precision.
// Defines the properties and their types for an account object.
export type Account = {
  id: string
  name: string
  type: AccountType
  openingBalance: string
  openingDate: string // "YYYY-MM-DD"
  currentBalance: string
  archivedAt: string | null
  updatedAt: string
}
