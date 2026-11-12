// Formats an API money string for display: "2430.5" → "$2,430.50"
const formatter = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' })

export function formatMoney(amount: string) {
  return formatter.format(Number(amount))
}

// Adds money strings exactly. Done in whole cents, because adding decimals
// directly can pick up rounding errors (0.1 + 0.2 = 0.30000000000000004)
export function sumAmounts(amounts: string[]) {
  const cents = amounts.reduce((sum, amount) => sum + Math.round(Number(amount) * 100), 0)
  return (cents / 100).toFixed(2)
}
