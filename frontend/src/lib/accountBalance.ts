import { formatMoney } from './money'
import type { Account, AccountType } from './types'

// entered - the amount typed in the form, as a string
export function toStoredBalance(type: AccountType, entered: string): string {
  if (type !== 'CREDIT_CARD') return entered
  if (Number(entered) === 0) return '0' // don't store "-0"

  return entered.startsWith('-') ? entered.slice(1) : `-${entered}`
}

// Balance text for display. Credit cards are stored negative, so they read as
// an amount owed: "$554.99 owed"
export function balanceText(type: AccountType, amount: string) {
  if (type !== 'CREDIT_CARD') return formatMoney(amount)
  return `${formatMoney(String(-Number(amount)))} owed`
}

// Total of several current balances. Added up in whole cents, because adding
// decimals directly can pick up rounding errors (0.1 + 0.2 = 0.30000000000000004)
export function sumBalances(accounts: Account[]) {
  const cents = accounts.reduce((sum, a) => sum + Math.round(Number(a.currentBalance) * 100), 0)
  return (cents / 100).toFixed(2)
}
