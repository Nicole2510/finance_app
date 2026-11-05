import { Banknote, CreditCard, Landmark, PiggyBank, TrendingUp, type LucideIcon } from 'lucide-react'
import type { AccountType } from './types'

// Display names and icon for each account type, in the order groups are shown
export const accountTypes: Record<AccountType, { label: string; plural: string; icon: LucideIcon }> = {
  CHEQUING: { label: 'Chequing', plural: 'Chequing', icon: Landmark },
  SAVINGS: { label: 'Savings', plural: 'Savings', icon: PiggyBank },
  CREDIT_CARD: { label: 'Credit card', plural: 'Credit cards', icon: CreditCard },
  INVESTMENT: { label: 'Investment', plural: 'Investments', icon: TrendingUp },
  CASH: { label: 'Cash', plural: 'Cash', icon: Banknote },
}
