// Step 4 of importing: every transaction ready for a final look. Pure
// functions; the screen and the server calls live in the components.
import type { EntryType } from '../types'
import type { ReadRow } from './detect'
import { categoryKey, categoryLabel, type CategoryChoice } from './names'

type ReadTransaction = Extract<ReadRow, { ok: true }>

export type ReviewStatus = 'ready' | 'skipped' | 'duplicate' | 'problem'

export type ReviewRow = {
  id: number // position in the file's transactions, so edits find their row
  date: string
  type: EntryType
  amount: string
  notes: string
  label: string // the file's category (or notes) as written
  accountId: string
  categoryId: string | null // null when skipped as a transfer
  include: boolean
  status: ReviewStatus
  message?: string
}

// Turns the read transactions and the step 3 choices into review rows.
// `created` maps the keys of names given a new category to its new id.
export function buildReviewRows(
  transactions: ReadTransaction[],
  categoryChoices: Record<string, CategoryChoice | null>,
  accountChoices: Record<string, string | null>,
  created: Record<string, string>,
): ReviewRow[] {
  return transactions.map((t, id) => {
    const label = categoryLabel(t)
    const key = categoryKey(t.type, label)
    const choice = categoryChoices[key]
    const categoryId =
      choice?.kind === 'category'
        ? choice.categoryId
        : choice?.kind === 'new'
          ? (created[key] ?? null)
          : null
    const skipped = choice?.kind === 'skip'
    return {
      id,
      date: t.date,
      type: t.type,
      amount: t.amount,
      notes: t.description,
      label,
      accountId: accountChoices[t.accountName] ?? '',
      categoryId,
      include: !skipped && categoryId !== null,
      status: skipped ? 'skipped' : 'ready',
      message: skipped ? choice.reason : undefined,
    }
  })
}

// The rows to send to the server, in the shape a manual add uses. Notes are
// trimmed to the 200 characters the server allows.
export function toImportRows(rows: ReviewRow[]) {
  return rows.map((r) => ({
    type: r.type,
    amount: r.amount,
    date: r.date,
    accountId: r.accountId,
    categoryId: r.categoryId,
    notes: r.notes ? r.notes.slice(0, 200) : null,
  }))
}

type ServerResult = { index: number; status: 'ready' | 'problem' | 'duplicate'; message?: string }

// Applies the server's preview to the rows it was sent (`sentIds[i]` is the
// review row behind result i). Duplicates start unticked; problems can't be
// imported until fixed (e.g. by choosing another category).
export function applyServerPreview(
  rows: ReviewRow[],
  sentIds: number[],
  results: ServerResult[],
): ReviewRow[] {
  const byId = new Map(results.map((r) => [sentIds[r.index], r]))
  return rows.map((row) => {
    const result = byId.get(row.id)
    if (!result || result.status === 'ready') return row
    return {
      ...row,
      status: result.status,
      message: result.message,
      include: result.status === 'duplicate' ? false : row.include && result.status !== 'problem',
    }
  })
}

// Totals for the summary line, in whole cents so they stay exact
export function summarize(rows: ReviewRow[]) {
  const included = rows.filter((r) => r.include)
  const cents = (type: EntryType) =>
    included
      .filter((r) => r.type === type)
      .reduce((sum, r) => sum + Math.round(Number(r.amount) * 100), 0)
  return {
    importing: included.length,
    spending: (cents('EXPENSE') / 100).toFixed(2),
    income: (cents('INCOME') / 100).toFixed(2),
    leftOut: rows.length - included.length,
    duplicates: rows.filter((r) => r.status === 'duplicate').length,
    problems: rows.filter((r) => r.status === 'problem').length,
  }
}
