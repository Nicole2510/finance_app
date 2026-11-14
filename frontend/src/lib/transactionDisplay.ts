import { categoryGroups } from './categoryGroups'
import { formatMoney } from './money'
import type { Transaction } from './types'

// How a transaction shows up in lists. Adjustments have no category, so they
// get their own name, icon and pill. Used everywhere transactions appear.
export function describeTransaction(t: Transaction) {
  if (t.type === 'ADJUSTMENT') {
    const negative = t.amount.startsWith('-')
    return {
      emoji: '⚖️',
      name: 'Balance adjustment',
      pill: { label: 'Adjustment', className: 'adjustment' },
      // e.g. "-3.15" → "−$3.15"; formatting the amount without its own minus
      amountText: `${negative ? '−' : '+'}${formatMoney(negative ? t.amount.slice(1) : t.amount)}`,
      isIncome: false,
    }
  }

  const isIncome = t.type === 'INCOME'
  return {
    emoji: t.category?.emoji ?? '·',
    name: t.category?.name ?? 'Uncategorised',
    pill: t.category
      ? { label: categoryGroups[t.category.group].label, className: t.category.group.toLowerCase() }
      : null,
    amountText: `${isIncome ? '+' : '−'}${formatMoney(t.amount)}`,
    isIncome,
  }
}
