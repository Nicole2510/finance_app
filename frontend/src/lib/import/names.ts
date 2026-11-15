// Step 3 of importing: matching the names in a file (categories, accounts)
// to the person's own. Exact matches are automatic; the rest are chosen once
// and remembered for next time.
import { categoriesFor } from '../categories'
import type { Account, Category, EntryType } from '../types'
import { CARD_FLAG_NAMES, type ReadRow } from './detect'

type ReadTransaction = Extract<ReadRow, { ok: true }>

// Names compared without emoji, capitals, "&", "(50)"-style notes or plural
// endings, so "Groceries 🛒", "groceries" and "Grocery" all compare as one
export function normalizeName(name: string) {
  return name
    .replace(/\(.*?\)/g, ' ')
    .replace(/&/g, ' and ')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((word) => word.replace(/(ies|es|s)$/, (end) => (end === 'ies' ? 'y' : '')))
    .join(' ')
}

// What a file's category becomes: one of the person's categories, or skipped
export type CategoryChoice =
  | { kind: 'category'; categoryId: string }
  | { kind: 'skip'; reason: string }
  | { kind: 'new'; name: string; group: Category['group']; emoji: string | null }

// A name to match. Money in with no category is matched by its notes instead.
export type NameToMatch = {
  key: string // type + normalized label, e.g. "EXPENSE|walmart"
  type: EntryType
  label: string // as written in the file
  count: number
}

export function categoryLabel(t: ReadTransaction) {
  return t.categoryName || t.description || '(no category)'
}

export function categoryKey(type: EntryType, label: string) {
  return `${type}|${normalizeName(label)}`
}

// The distinct category names in the file, most used first
export function namesToMatch(rows: ReadTransaction[]): NameToMatch[] {
  const byKey = new Map<string, NameToMatch>()
  for (const t of rows) {
    const label = categoryLabel(t)
    const key = categoryKey(t.type, label)
    const found = byKey.get(key)
    if (found) found.count++
    else byKey.set(key, { key, type: t.type, label, count: 1 })
  }
  return [...byKey.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

// The distinct account names in the file ("" when the file has none)
export function accountNames(rows: ReadTransaction[]) {
  const counts = new Map<string, number>()
  for (const t of rows) counts.set(t.accountName, (counts.get(t.accountName) ?? 0) + 1)
  return [...counts].map(([name, count]) => ({ name, count }))
}

// Rows that move money between the person's own accounts aren't income or
// spending, so they start as skipped (the person can change that)
const TRANSFERS: { type: EntryType | null; pattern: RegExp; reason: string }[] = [
  {
    type: 'EXPENSE',
    pattern: /credit (card )?payment|card payment|payment thank you|pay off (credit|card)/,
    reason: 'Paying a credit card: the purchases are already counted',
  },
  {
    type: 'INCOME',
    // Generic wording only: a person's own fund names are remembered from
    // their choices in step 3, not written into the code
    pattern: /\b(sinking fund|from saving|savings? withdrawal)\b/,
    reason: 'Money back from your own savings, not income',
  },
  {
    type: null,
    pattern: /\btransfer\b|between account/,
    reason: 'Looks like a transfer between your own accounts',
  },
]

export function transferReason(type: EntryType, label: string): string | null {
  const name = normalizeName(label)
  return (
    TRANSFERS.find((t) => (t.type === null || t.type === type) && t.pattern.test(name))?.reason ??
    null
  )
}

const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' })

// The first emoji in a name ("Hair 💇" → "💇"), whole even when it's made of
// several characters (👩🏽‍💻), so a new category can start with it
export function emojiOf(label: string): string | null {
  for (const { segment } of segmenter.segment(label)) {
    if (/\p{Extended_Pictographic}/u.test(segment)) return segment
  }
  return null
}

// A name without its emoji or extra spaces, as a new category would be called
export function cleanName(label: string) {
  return label
    .replace(/[^\p{L}\p{N}\s&'-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40)
}

// The best guess for a name: a remembered choice, then a transfer to skip,
// then a category with the same name (of the right kind), then the only
// category whose name starts with it ("Dining" → "Dining Out"), else nothing
export function suggestCategory(
  name: NameToMatch,
  categories: Category[],
  remembered: Record<string, CategoryChoice>,
): CategoryChoice | null {
  const saved = remembered[name.key]
  const usable = categoriesFor(name.type, categories)
  if (saved?.kind === 'skip') return saved
  if (saved?.kind === 'category' && usable.some((c) => c.id === saved.categoryId)) return saved

  const reason = transferReason(name.type, name.label)
  if (reason) return { kind: 'skip', reason }

  const wanted = normalizeName(name.label)
  const same = usable.find((c) => normalizeName(c.name) === wanted)
  if (same) return { kind: 'category', categoryId: same.id }

  const startsWith = usable.filter((c) => wanted && normalizeName(c.name).startsWith(`${wanted} `))
  return startsWith.length === 1 ? { kind: 'category', categoryId: startsWith[0].id } : null
}

// The best guess for an account name: remembered, then same name, then for
// a credit card flag the only card or only chequing account
export function suggestAccount(
  name: string,
  accounts: Account[],
  remembered: Record<string, string>,
): string | null {
  const active = accounts.filter((a) => a.archivedAt === null)
  const saved = remembered[normalizeName(name)]
  if (saved && active.some((a) => a.id === saved)) return saved

  const wanted = normalizeName(name)
  if (wanted) {
    const same = active.find((a) => normalizeName(a.name) === wanted)
    if (same) return same.id
    const partly = active.filter((a) => {
      const n = normalizeName(a.name)
      return n.length >= 3 && wanted.length >= 3 && (n.includes(wanted) || wanted.includes(n))
    })
    if (partly.length === 1) return partly[0].id
  }

  const onlyOf = (type: Account['type']) => {
    const matches = active.filter((a) => a.type === type)
    return matches.length === 1 ? matches[0].id : null
  }
  if (name === CARD_FLAG_NAMES.yes) return onlyOf('CREDIT_CARD')
  if (name === CARD_FLAG_NAMES.no) return onlyOf('CHEQUING')
  return null
}

// Choices are remembered in this browser, keyed by the normalized name
const STORAGE_KEY = 'nayad.import.names'

export type Remembered = {
  categories: Record<string, CategoryChoice>
  accounts: Record<string, string>
}

export function loadRemembered(): Remembered {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    return { categories: saved.categories ?? {}, accounts: saved.accounts ?? {} }
  } catch {
    return { categories: {}, accounts: {} } // blocked or corrupted storage: start fresh
  }
}

export function saveRemembered(next: Remembered) {
  try {
    const current = loadRemembered()
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        categories: { ...current.categories, ...next.categories },
        accounts: { ...current.accounts, ...next.accounts },
      }),
    )
  } catch {
    // Not being able to remember isn't worth interrupting an import for
  }
}
