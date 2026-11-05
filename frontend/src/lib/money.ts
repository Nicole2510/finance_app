// Formats an API money string for display: "2430.5" → "$2,430.50"
const formatter = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' })

export function formatMoney(amount: string) {
  return formatter.format(Number(amount))
}
