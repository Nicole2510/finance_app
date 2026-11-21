// Shapes returned by the API

// SAVINGS, DEBT and INVESTMENTS together make up the "20%" in 50/30/20
export type CategoryGroup = 'NEEDS' | 'WANTS' | 'SAVINGS' | 'DEBT' | 'INVESTMENTS' | 'INCOME'

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

// Income and expenses are entered by hand; adjustments come from reconciling
export type EntryType = 'INCOME' | 'EXPENSE'

// A transaction comes with the names of what it belongs to, so lists can show them
export type Transaction = {
  id: string
  type: EntryType | 'ADJUSTMENT'
  // Positive for income and expenses (type gives the direction);
  // adjustments carry their own sign, e.g. "-3.15"
  amount: string
  date: string // "YYYY-MM-DD"
  notes: string | null
  account: { id: string; name: string }
  category: { id: string; name: string; emoji: string | null; group: CategoryGroup } | null
  incomeSource: { id: string; name: string } | null
}

// One spending category on the Budgets page, for one month
export type BudgetLine = {
  id: string // the category's id
  name: string
  emoji: string | null
  group: CategoryGroup
  archived: boolean
  budget: string | null // null when no budget is set
  spent: string
}

export type BudgetMonth = { month: string; categories: BudgetLine[] }
