import { formatMoney } from './money'
import type { AccountType } from './types'

// ───────────────────────────────────────────────────────────────────────────
// 🧑‍💻 PRACTICE: convert the amount typed in the form into what the API stores.
//
// For credit cards the form asks "Amount owed", but the API stores money owed
// as a NEGATIVE balance. Every other account type is stored as typed.
//
//   toStoredBalance('CHEQUING', '2430.00')    → '2430.00'
//   toStoredBalance('CREDIT_CARD', '530.00')  → '-530.00'
//   toStoredBalance('CREDIT_CARD', '-20')     → '20'    (card in credit: bank owes you)
//   toStoredBalance('CREDIT_CARD', '0')       → '0'     (not '-0')
//
// Work with the string directly (add or remove the leading "-"), not with
// Number(), so the cents are never rounded.
// Hints: value.startsWith('-'), value.slice(1)
// ───────────────────────────────────────────────────────────────────────────

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
