import { formatMoney, sumAmounts } from './money'
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

// Total of several current balances, e.g. a group's subtotal
export function sumBalances(accounts: Account[]) {
  return sumAmounts(accounts.map((a) => a.currentBalance))
}
