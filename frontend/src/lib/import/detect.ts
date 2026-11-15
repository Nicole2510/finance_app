// Works out the shape of an imported spreadsheet: where the transaction table
// is (even beside budgets and summaries), what each of its columns holds, and
// what each row means. Everything is a suggestion the person confirms; nothing
// is guessed when it could be read two ways.
import { DATE_FORMATS, detectDateFormat, parseAmount, parseDate, type DateFormat } from './parse'
import type { EntryType } from '../types'

export type AmountMapping =
  // One column: negative means one direction, positive the other
  | { style: 'signed'; column: number; negativeIs: EntryType }
  // Money out and money in in separate columns. A row can fill both, in which
  // case it holds two separate transactions (the money in has its own notes).
  | { style: 'split'; outgoing: number; incoming: number; incomingNotes: number | null }
  // An amount, plus a column saying what kind it is (Income, Expenses, Bills...)
  | { style: 'typed'; column: number; typeColumn: number }

export type AccountMapping =
  // A column naming the account, e.g. MAPLEBANK
  | { kind: 'column'; column: number }
  // A TRUE/FALSE column saying whether it went on a credit card
  | { kind: 'cardFlag'; column: number }

export type Mapping = {
  headerRow: number // -1 when the file has no headings
  date: number | null
  dateFormat: DateFormat | null
  amount: AmountMapping | null
  category: number | null
  description: number | null
  account: AccountMapping | null
}

export const CARD_FLAG_NAMES = { yes: 'Credit card', no: 'Not on a credit card' }

const anyDate = (value: string) => DATE_FORMATS.some((f) => parseDate(value, f.id))
const anyAmount = (value: string) => parseAmount(value) !== null

// A row that looks like a transaction: it has a date and an amount
export function looksLikeTransaction(row: string[]) {
  return row.some(anyDate) && row.some((cell) => !anyDate(cell) && anyAmount(cell))
}

// Headings as plain lowercase words. Undoes letter-spaced styling, so
// "D A T E" and "A C C O U N T " read as "date" and "account".
export function normalizeHeading(text: string) {
  return text
    .trim()
    .split(/\s{2,}/)
    .map((word) => {
      const letters = word.split(' ')
      return letters.length > 1 && letters.every((l) => l.length <= 1) ? letters.join('') : word
    })
    .join(' ')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s/&]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

type Role =
  | 'date'
  | 'type'
  | 'category'
  | 'amount'
  | 'outgoing'
  | 'incoming'
  | 'cardFlag'
  | 'account'
  | 'notes'

// What a heading says its column holds, or null if it's not a transaction column
export function roleOf(heading: string): Role | null {
  const h = normalizeHeading(heading)
  if (!h) return null
  if (/credit card|card transaction|on card|by card/.test(h)) return 'cardFlag'
  if (/\bdate\b|^day$|^when$|^posted/.test(h)) return 'date'
  if (/^(transaction )?type$|^kind$|income\/expense|^in\/out$/.test(h)) return 'type'
  if (/categor/.test(h)) return 'category'
  if (/^(amount|amt|value|sum|price|cost)$/.test(h)) return 'amount'
  if (/outgoing|money out|paid out|debit|withdrawal|^spent$|^expenses?$/.test(h)) return 'outgoing'
  if (/incoming|money in|paid in|^credits?$|deposit|received|^income$/.test(h)) return 'incoming'
  if (/account|bank|wallet/.test(h)) return 'account'
  if (/note|desc|memo|detail|payee|merchant|comment|narrative|^what$|^item$/.test(h)) return 'notes'
  return null
}

const TYPE_WORDS: Record<EntryType, RegExp> = {
  INCOME: /^(income|credit|cr|deposit|in|money in|received|refund)$/,
  EXPENSE:
    /^(expenses?|debit|dr|withdrawal|payment|out|money out|spent|purchase|bills?|subscriptions?|bills? ?\/ ?subscriptions?)$/,
}

// Rows marked as debts (borrowing, lending, paying back) need Debts & Loans
// (M6) to be recorded properly, so they're held back until then
const DEBT_WORDS = /^(debts?|loans?|borrowed|lent|iou|owed?)$/

export const HELD_FOR_DEBTS = 'A debt: imports with Debts & Loans (coming soon)'

// Income or expense from a word in a type column, or null if it isn't one
export function typeFromWord(word: string): EntryType | null {
  const w = normalizeHeading(word)
  if (TYPE_WORDS.INCOME.test(w)) return 'INCOME'
  if (TYPE_WORDS.EXPENSE.test(w)) return 'EXPENSE'
  return null
}

// Turns the columns found under the headings into a mapping
function mappingFromRoles(
  headerRow: number,
  roles: { column: number; role: Role }[],
  rows: string[][],
): Mapping {
  const first = (role: Role, after = -1) =>
    roles.find((r) => r.role === role && r.column > after)?.column ?? null

  const date = first('date')
  const amountColumn = first('amount')
  const typeColumn = first('type')
  const outgoing = first('outgoing')
  const incoming = first('incoming')

  let amount: AmountMapping | null = null
  let incomingNotes: number | null = null
  if (outgoing !== null && incoming !== null) {
    incomingNotes = first('notes', incoming)
    amount = { style: 'split', outgoing, incoming, incomingNotes }
  } else if (amountColumn !== null && typeColumn !== null) {
    amount = { style: 'typed', column: amountColumn, typeColumn }
  } else if (amountColumn !== null) {
    amount = { style: 'signed', column: amountColumn, negativeIs: 'EXPENSE' }
  } else if (outgoing !== null) {
    amount = { style: 'signed', column: outgoing, negativeIs: 'INCOME' } // positive = spending
  } else if (incoming !== null) {
    amount = { style: 'signed', column: incoming, negativeIs: 'EXPENSE' } // positive = income
  }

  const accountColumn = first('account')
  const cardFlag = first('cardFlag')
  const account: AccountMapping | null =
    accountColumn !== null
      ? { kind: 'column', column: accountColumn }
      : cardFlag !== null
        ? { kind: 'cardFlag', column: cardFlag }
        : null

  const description =
    roles.find((r) => r.role === 'notes' && r.column !== incomingNotes)?.column ?? null

  const dates = date === null ? [] : rows.slice(headerRow + 1).map((row) => row[date] ?? '')
  return {
    headerRow,
    date,
    dateFormat: date === null ? null : detectDateFormat(dates).format,
    amount,
    category: first('category'),
    description,
    account,
  }
}

// How far a table's headings can be spread apart (spreadsheets often merge
// cells, leaving empty columns between headings)
const MAX_GAP = 8

export type FoundTable = {
  mapping: Mapping
  columns: number[] // the table's own columns, left to right
  transactions: number // how many transactions it reads as
}

// Every table in a sheet that has a Date heading. A table's columns are the
// recognisable headings beside the Date one; it ends at a heading that isn't
// a transaction column (the start of another table) or a wide gap. Sorted
// with the one holding the most transactions first.
export function findTables(rows: string[][]): FoundTable[] {
  const tables: FoundTable[] = []

  rows.slice(0, 40).forEach((row, r) => {
    row.forEach((cell, c) => {
      if (roleOf(cell) !== 'date') return

      const columns = [c]
      for (const step of [1, -1]) {
        let gap = 0
        for (let x = c + step; x >= 0 && x < row.length; x += step) {
          if (!row[x]?.trim()) {
            if (++gap > MAX_GAP) break
            continue
          }
          const role = roleOf(row[x])
          if (!role || role === 'date') break
          columns.push(x)
          gap = 0
        }
      }
      columns.sort((a, b) => a - b)

      const roles = columns.map((column) => ({ column, role: roleOf(row[column])! }))
      const mapping = mappingFromRoles(r, roles, rows)
      if (!mapping.amount) return
      const transactions = readRows(rows, mapping).filter((t) => t.ok).length
      tables.push({ mapping, columns, transactions })
    })
  })

  return tables.sort((a, b) => b.transactions - a.transactions)
}

// For files with no recognisable headings (some banks export none): finds
// the first row that looks like a transaction and works from the values
export function detectWithoutHeadings(rows: string[][]): Mapping | null {
  const start = rows.findIndex(looksLikeTransaction)
  if (start === -1) return null
  const sample = rows.slice(start, start + 50)
  const width = Math.max(...sample.map((r) => r.length))
  const share = (c: number, test: (v: string) => boolean) => {
    const filled = sample.map((r) => r[c] ?? '').filter(Boolean)
    return filled.length ? filled.filter(test).length / filled.length : 0
  }
  const columns = Array.from({ length: width }, (_, c) => c)

  const date = columns.find((c) => share(c, anyDate) >= 0.8) ?? null
  const amounts = columns.filter((c) => c !== date && share(c, anyAmount) >= 0.8)
  if (date === null || amounts.length === 0) return null

  // Two amount columns where each row fills only one: money out and money in
  const [a, b] = amounts
  const oneOrOther = b !== undefined && sample.every((r) => !(r[a]?.trim() && r[b]?.trim()))
  const amount: AmountMapping = oneOrOther
    ? { style: 'split', outgoing: a, incoming: b, incomingNotes: null }
    : { style: 'signed', column: a, negativeIs: 'EXPENSE' }

  // The column with the longest text is usually the description
  const textLength = (c: number) => sample.reduce((sum, r) => sum + (r[c]?.length ?? 0), 0)
  const description =
    columns
      .filter((c) => c !== date && !amounts.includes(c))
      .sort((x, y) => textLength(y) - textLength(x))[0] ?? null

  return {
    headerRow: start - 1,
    date,
    dateFormat: detectDateFormat(sample.map((r) => r[date] ?? '')).format,
    amount,
    category: null,
    description,
    account: null,
  }
}

export type ReadRow = { row: number } & (
  | {
      ok: true
      date: string // "YYYY-MM-DD"
      type: EntryType
      amount: string // positive, 2 decimals
      description: string
      categoryName: string
      accountName: string
    }
  | { ok: false; reason: string }
)

// The columns that hold a transaction's own details (a TRUE/FALSE flag alone
// doesn't make a row a transaction, so it's left out)
function detailColumns(m: Mapping): number[] {
  const a = m.amount
  const amountColumns =
    a?.style === 'split'
      ? [a.outgoing, a.incoming]
      : a?.style === 'typed'
        ? [a.column, a.typeColumn]
        : a
          ? [a.column]
          : []
  return [m.date, m.category, m.description, ...amountColumns].filter(
    (c): c is number => c !== null,
  )
}

const TOTAL = /^(sub)?totals?\b|^balance\b|^opening balance|^closing balance|^start balance/i

// Reads every row of the table with the confirmed mapping. A day's date is
// often written only on its first row, so blank dates carry the last one down.
// One row can hold two transactions (money out and money in side by side).
export function readRows(rows: string[][], m: Mapping): ReadRow[] {
  const results: ReadRow[] = []
  if (m.date === null || !m.dateFormat || !m.amount) return results

  const details = detailColumns(m)
  let lastDate: string | null = null

  for (let r = m.headerRow + 1; r < rows.length; r++) {
    const row = rows[r]
    const cell = (c: number | null) => (c === null ? '' : (row[c] ?? '').trim())
    if (details.every((c) => !cell(c))) continue // blank, or belongs to another table

    const description = cell(m.description)
    const categoryName = cell(m.category)
    if (TOTAL.test(description) || TOTAL.test(categoryName)) {
      results.push({ row: r, ok: false, reason: 'Looks like a total, not a transaction' })
      continue
    }

    const dateText = cell(m.date)
    let date: string | null = lastDate
    if (dateText) {
      date = parseDate(dateText, m.dateFormat)
      if (!date) {
        results.push({ row: r, ok: false, reason: `Can't read the date "${dateText}"` })
        continue
      }
      lastDate = date
    }
    if (!date) {
      results.push({ row: r, ok: false, reason: 'No date' })
      continue
    }

    const accountName =
      m.account?.kind === 'column'
        ? cell(m.account.column)
        : m.account?.kind === 'cardFlag'
          ? /^(true|yes|y|x|1)$/i.test(cell(m.account.column))
            ? CARD_FLAG_NAMES.yes
            : CARD_FLAG_NAMES.no
          : ''

    // Reads one amount cell; a problem is reported against this row
    const amountOf = (text: string) => {
      const value = parseAmount(text)
      if (value === null) {
        results.push({ row: r, ok: false, reason: `Can't read the amount "${text}"` })
      }
      return value
    }
    const add = (type: EntryType, value: string, desc: string, category: string) => {
      const amount = value.replace('-', '')
      if (Number(amount) === 0) return
      results.push({
        row: r,
        ok: true,
        date: date!,
        type,
        amount,
        description: desc,
        categoryName: category,
        accountName,
      })
    }

    const a = m.amount
    if (a.style === 'split') {
      const out = cell(a.outgoing)
      const inn = cell(a.incoming)
      if (!out && !inn) {
        results.push({ row: r, ok: false, reason: 'No amount' })
        continue
      }
      const outValue = out ? amountOf(out) : null
      const inValue = inn ? amountOf(inn) : null
      if (outValue) add('EXPENSE', outValue, description, categoryName)
      if (inValue) {
        // Side by side, the row's category and notes belong to the money out;
        // the money in has its own notes column
        const both = Boolean(out)
        add(
          'INCOME',
          inValue,
          cell(a.incomingNotes) || (both ? '' : description),
          both ? '' : categoryName,
        )
      }
    } else if (a.style === 'typed') {
      const text = cell(a.column)
      if (!text) {
        results.push({ row: r, ok: false, reason: 'No amount' })
        continue
      }
      if (DEBT_WORDS.test(normalizeHeading(cell(a.typeColumn)))) {
        results.push({ row: r, ok: false, reason: HELD_FOR_DEBTS })
        continue
      }
      const type = typeFromWord(cell(a.typeColumn))
      if (!type) {
        results.push({
          row: r,
          ok: false,
          reason: `"${cell(a.typeColumn)}" isn't income or expense`,
        })
        continue
      }
      const value = amountOf(text)
      if (value) add(type, value, description, categoryName)
    } else {
      const text = cell(a.column)
      if (!text) {
        results.push({ row: r, ok: false, reason: 'No amount' })
        continue
      }
      const value = amountOf(text)
      if (value) {
        const negative = value.startsWith('-')
        add(
          negative === (a.negativeIs === 'EXPENSE') ? 'EXPENSE' : 'INCOME',
          value,
          description,
          categoryName,
        )
      }
    }
  }
  return results
}

// In a workbook, the sheet with the most transactions is the likeliest one
export function bestSheet(sheets: { rows: string[][] }[]): number {
  let best = 0
  let bestCount = -1
  sheets.forEach((sheet, i) => {
    const count =
      findTables(sheet.rows)[0]?.transactions ?? sheet.rows.filter(looksLikeTransaction).length
    if (count > bestCount) {
      best = i
      bestCount = count
    }
  })
  return best
}
