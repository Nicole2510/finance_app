// Soft background tints for each group, shared by the Categories tiles and the
// group pills on Transactions (Tailwind classes, keyed by lower-case group)
export const groupTint: Record<string, string> = {
  needs: 'bg-[#f6ebdf]',
  wants: 'bg-[#f6e3e1]',
  savings: 'bg-[#e5ebe2]',
  debt: 'bg-[#f3e9df]',
  investments: 'bg-[#e3eaec]',
  income: 'bg-[#e8e7f0]',
  sources: 'bg-[#ebe8e3]',
  adjustment: 'bg-border',
}
