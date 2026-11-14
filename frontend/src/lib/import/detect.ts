// Works out the shape of an imported file: which row has the headings, which
// column is which, and what each row means. Everything here is a suggestion
// the person confirms; nothing is guessed when it could be read two ways.
import { DATE_FORMATS, detectDateFormat, parseAmount, parseDate, type DateFormat } from './parse'
import type { EntryType } from '../types'

export type AmountMapping =
  // One column: negative means one direction, positive the other
  | { style: 'signed'; column: number; negativeIs: EntryType }
  // Money out and money in in separate columns (most bank exports)
  | { style: 'split'; debit: number; credit: number }
  // An amount, plus a column saying income or expense
  | { style: 'typed'; column: number; typeColumn: number }

export type Mapping = {
  date: number | null
  dateFormat: DateFormat | null
  amount: AmountMapping | null
  description: number | null
  category: number | null
  account: number | null
}

const anyDate = (value: string) => DATE_FORMATS.some((f) => parseDate(value, f.id))
const anyAmount = (value: string) => parseAmount(value) !== null

// A row that looks like a transaction: it has a date and an amount
function looksLikeTransaction(row: string[]) {
  return row.some(anyDate) && row.some((cell) => !anyDate(cell) && anyAmount(cell))
}

// The heading row is the row of labels sitting right above rows that look
// like transactions. Title lines and blank lines above it are skipped.
export function detectHeaderRow(rows: string[][]): number {
  let best = 0
  let bestScore = -1
  for (let i = 0; i < Math.min(rows.length - 1, 15); i++) {
    const labels = rows[i].filter((cell) => cell && !anyDate(cell) && !anyAmount(cell)).length
    const following = rows.slice(i + 1, i + 6).filter(looksLikeTransaction).length
    const score = labels > 1 && following > 0 ? following * 10 + labels : -1
    if (score > bestScore) {
      best = i
      bestScore = score
    }
  }
  return best
}

const TYPE_WORDS: Record<EntryType, RegExp> = {
  INCOME: /^(income|credit|cr|deposit|in|money in|received)$/i,
  EXPENSE: /^(expense|debit|dr|withdrawal|payment|out|money out|spent|purchase)$/i,
}

// Income or expense from a word in a type column, or null if it isn't one
export function typeFromWord(word: string): EntryType | null {
  if (TYPE_WORDS.INCOME.test(word.trim())) return 'INCOME'
  if (TYPE_WORDS.EXPENSE.test(word.trim())) return 'EXPENSE'
  return null
}

// Suggests what each column is, from its heading and its values
export function detectColumns(headers: string[], dataRows: string[][]): Mapping {
  const sample = dataRows.slice(0, 50)
  const columnValues = (c: number) => sample.map((row) => row[c] ?? '')
  const filledShare = (c: number, test: (v: string) => boolean) => {
    const filled = columnValues(c).filter(Boolean)
    return filled.length ? filled.filter(test).length / filled.length : 0
  }
  const byHeading = (pattern: RegExp, exclude: number[] = []) =>
    headers.findIndex((h, c) => pattern.test(h) && !exclude.includes(c))
  const found = (c: number) => (c === -1 ? null : c)

  // Date: a dated heading whose values read as dates, else the most date-like column
  const dateColumns = headers.map((_, c) => c).filter((c) => filledShare(c, anyDate) >= 0.8)
  const datedHeading = dateColumns.find((c) => /date|posted|when|day/i.test(headers[c]))
  const date = datedHeading ?? dateColumns[0] ?? null
  const dateFormat = date === null ? null : detectDateFormat(columnValues(date)).format

  const amountLike = (c: number) => c !== date && filledShare(c, anyAmount) >= 0.8
  const used = date === null ? [] : [date]

  // Amount: separate debit/credit columns, an amount + type column, or one ± column
  let amount: AmountMapping | null = null
  const debit = byHeading(/debit|withdraw|money out|paid out|outflow|spent|out\b/i, used)
  const credit = byHeading(/credit|deposit|money in|paid in|inflow|received|\bin\b/i, used)
  if (
    debit !== -1 &&
    credit !== -1 &&
    debit !== credit &&
    amountLike(debit) &&
    amountLike(credit)
  ) {
    amount = { style: 'split', debit, credit }
  } else {
    const named = byHeading(/amount|amt|value|sum|price|cost|total/i, used)
    const column =
      named !== -1 && amountLike(named) ? named : headers.findIndex((_, c) => amountLike(c))
    if (column !== -1) {
      const typeColumn = headers.findIndex(
        (_, c) =>
          c !== column && c !== date && filledShare(c, (v) => typeFromWord(v) !== null) >= 0.8,
      )
      if (typeColumn !== -1) {
        amount = { style: 'typed', column, typeColumn }
      } else {
        // Negatives are usually spending; if a file only has positives it's
        // usually a list of spending too. Either way the person can flip it.
        amount = { style: 'signed', column, negativeIs: 'EXPENSE' }
      }
    }
  }

  const taken = [
    ...used,
    ...(amount?.style === 'split' ? [amount.debit, amount.credit] : []),
    ...(amount?.style === 'typed' ? [amount.column, amount.typeColumn] : []),
    ...(amount?.style === 'signed' ? [amount.column] : []),
  ]
  const category = found(byHeading(/categor/i, taken))
  const account = found(
    byHeading(/account|card|bank|wallet/i, [...taken, ...(category === null ? [] : [category])]),
  )
  const others = [...taken, category, account].filter((c): c is number => c !== null)
  const description = found(
    byHeading(/desc|memo|note|detail|payee|merchant|narrative|particular|name|item|what/i, others),
  )

  return { date, dateFormat, amount, description, category, account }
}

export type ReadRow =
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

// Reads one row with the confirmed mapping
export function readRow(row: string[], mapping: Mapping): ReadRow {
  const cell = (c: number | null) => (c === null ? '' : (row[c] ?? '').trim())
  const description = cell(mapping.description)

  if (/^(sub)?totals?\b|^balance\b|^opening balance|^closing balance/i.test(description)) {
    return { ok: false, reason: 'Looks like a total, not a transaction' }
  }
  if (mapping.date === null || !mapping.dateFormat || !mapping.amount) {
    return { ok: false, reason: 'Columns not matched yet' }
  }

  const date = parseDate(cell(mapping.date), mapping.dateFormat)
  if (!date) return { ok: false, reason: `Can't read the date "${cell(mapping.date)}"` }

  let signed: string | null = null
  let type: EntryType | null = null
  const a = mapping.amount
  if (a.style === 'split') {
    const out = parseAmount(cell(a.debit))
    const inn = parseAmount(cell(a.credit))
    // Some banks write money out as a negative in the debit column
    if (out && Number(out) !== 0) [signed, type] = [out.replace('-', ''), 'EXPENSE']
    else if (inn && Number(inn) !== 0) [signed, type] = [inn.replace('-', ''), 'INCOME']
  } else if (a.style === 'typed') {
    const value = parseAmount(cell(a.column))
    type = typeFromWord(cell(a.typeColumn))
    if (value) signed = value.replace('-', '')
    if (!type) return { ok: false, reason: `"${cell(a.typeColumn)}" isn't income or expense` }
  } else {
    const value = parseAmount(cell(a.column))
    if (value) {
      const negative = value.startsWith('-')
      signed = value.replace('-', '')
      type = negative === (a.negativeIs === 'EXPENSE') ? 'EXPENSE' : 'INCOME'
    }
  }

  if (!signed || !type || Number(signed) === 0) {
    return { ok: false, reason: 'No amount' }
  }
  return {
    ok: true,
    date,
    type,
    amount: signed,
    description,
    categoryName: cell(mapping.category),
    accountName: cell(mapping.account),
  }
}
