import type { Category, Transaction } from './types'

// ───────────────────────────────────────────────────────────────────────────
// 🧑‍💻 PRACTICE: which categories the transaction form offers for a type.
//
//   type 'INCOME'  → only categories in the INCOME group
//   type 'EXPENSE' → every group EXCEPT INCOME (Needs, Wants, Savings & Debt)
//
//   Leave out archived categories (archivedAt isn't null), with one exception:
//   keepId is the category a transaction being edited already uses. Keep that
//   one even if it's archived, so editing an old transaction still works.
//
//   Return them sorted by name.
//
// Hints: categories.filter(...)  and  [...list].sort((a, b) => a.name.localeCompare(b.name))
// ───────────────────────────────────────────────────────────────────────────
export function categoriesFor(
  type: Transaction['type'],
  categories: Category[], // array containing all categories
  keepId?: string, // optional category id to keep even if archived
): Category[] {
  const filteredCategories = categories.filter((category) => {
    // Filter based on the transaction type
    const matchesType = type === 'INCOME'
      ? category.group === 'INCOME'
      : category.group !== 'INCOME'

    // Include active categories or the existing category being edited
    const isActive = category.archivedAt === null
    const isKept = category.id === keepId

    return matchesType && (isActive || isKept)
  })
  
  // Return categories in alphabetical order by name
  return filteredCategories.sort((a, b) => a.name.localeCompare(b.name))
}
