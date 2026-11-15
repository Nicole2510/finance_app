import type { Category, EntryType } from './types'

export function categoriesFor(
  type: EntryType,
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
