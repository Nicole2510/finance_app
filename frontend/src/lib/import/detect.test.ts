import { describe, expect, it } from 'vitest'
import { detectColumns, detectHeaderRow, readRow, typeFromWord, type Mapping } from './detect'

// Made-up files in the shapes real exports come in
const bankExport = [
  ['Maple Bank statement'],
  ['Account: Chequing ****1234'],
  [],
  ['Date', 'Description', 'Debit', 'Credit', 'Balance'],
  ['10/18/2026', 'GROCERY STORE', '62.14', '', '937.86'],
  ['10/15/2026', 'ACME PAYROLL', '', '1,500.00', '2437.86'],
  ['10/14/2026', 'COFFEE', '4.50', '', '933.36'],
]

const spreadsheet = [
  ['Date', 'Category', 'Notes', 'Amount', 'Account'],
  ['2026-10-18', 'Groceries', 'Weekly shop', '-62.14', 'Maple Bank'],
  ['2026-10-15', 'Salary', 'Pay day', '$1,500.00', 'Maple Bank'],
  ['2026-10-14', 'Dining Out', '', '(24.99)', 'Card'],
  ['', 'Total', '', '1412.87', ''],
]

const typedSheet = [
  ['When', 'What', 'Type', 'Value'],
  ['Oct 18, 2026', 'Groceries', 'Expense', '62.14'],
  ['Oct 15, 2026', 'Salary', 'Income', '1500'],
]

describe('detectHeaderRow', () => {
  it('skips title lines above the real headings', () => {
    expect(detectHeaderRow(bankExport)).toBe(3)
  })

  it('finds headings on the first row', () => {
    expect(detectHeaderRow(spreadsheet)).toBe(0)
    expect(detectHeaderRow(typedSheet)).toBe(0)
  })
})

describe('detectColumns', () => {
  it('spots separate debit and credit columns', () => {
    const m = detectColumns(bankExport[3], bankExport.slice(4))

    expect(m.date).toBe(0)
    expect(m.dateFormat).toBe('MDY')
    expect(m.amount).toEqual({ style: 'split', debit: 2, credit: 3 })
    expect(m.description).toBe(1)
  })

  it('spots one ± amount column, plus category and account', () => {
    const m = detectColumns(spreadsheet[0], spreadsheet.slice(1))

    expect(m).toMatchObject({
      date: 0,
      dateFormat: 'YMD',
      amount: { style: 'signed', column: 3, negativeIs: 'EXPENSE' },
      category: 1,
      account: 4,
      description: 2,
    })
  })

  it('spots an amount with a separate income/expense column', () => {
    const m = detectColumns(typedSheet[0], typedSheet.slice(1))

    expect(m.dateFormat).toBe('MON_D_Y')
    expect(m.amount).toEqual({ style: 'typed', column: 3, typeColumn: 2 })
  })

  it("doesn't pick a date format when day/month could be month/day", () => {
    const m = detectColumns(
      ['Date', 'Amount'],
      [
        ['03/04/2026', '5'],
        ['05/06/2026', '6'],
      ],
    )

    expect(m.date).toBe(0)
    expect(m.dateFormat).toBeNull()
  })
})

describe('readRow', () => {
  const sheetMapping = detectColumns(spreadsheet[0], spreadsheet.slice(1))

  it('reads a spending row from a ± column', () => {
    expect(readRow(spreadsheet[1], sheetMapping)).toEqual({
      ok: true,
      date: '2026-10-18',
      type: 'EXPENSE',
      amount: '62.14',
      description: 'Weekly shop',
      categoryName: 'Groceries',
      accountName: 'Maple Bank',
    })
  })

  it('reads income and accounting-style negatives', () => {
    expect(readRow(spreadsheet[2], sheetMapping)).toMatchObject({
      type: 'INCOME',
      amount: '1500.00',
    })
    expect(readRow(spreadsheet[3], sheetMapping)).toMatchObject({
      type: 'EXPENSE',
      amount: '24.99',
    })
  })

  it('flips when positive amounts are spending', () => {
    const flipped: Mapping = {
      ...sheetMapping,
      amount: { style: 'signed', column: 3, negativeIs: 'INCOME' },
    }

    expect(readRow(spreadsheet[1], flipped)).toMatchObject({ type: 'INCOME', amount: '62.14' })
  })

  it('reads debit and credit columns', () => {
    const m = detectColumns(bankExport[3], bankExport.slice(4))

    expect(readRow(bankExport[4], m)).toMatchObject({ type: 'EXPENSE', amount: '62.14' })
    expect(readRow(bankExport[5], m)).toMatchObject({ type: 'INCOME', amount: '1500.00' })
  })

  it('reads a type column', () => {
    const m = detectColumns(typedSheet[0], typedSheet.slice(1))

    expect(readRow(typedSheet[1], m)).toMatchObject({ date: '2026-10-18', type: 'EXPENSE' })
    expect(readRow(typedSheet[2], m)).toMatchObject({ type: 'INCOME', amount: '1500.00' })
  })

  it.each<[string[], RegExp]>([
    [['', 'Groceries', 'Total', '-5', ''], /total/i],
    [['2026-02-30', 'Groceries', '', '-5', ''], /date/],
    [['2026-10-18', 'Groceries', '', '', ''], /amount/i],
    [['2026-10-18', 'Groceries', '', '0.00', ''], /amount/i],
  ])('skips %j', (row, reason) => {
    const result = readRow(row, sheetMapping)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toMatch(reason)
  })

  it("explains when it isn't ready", () => {
    const empty: Mapping = {
      date: null,
      dateFormat: null,
      amount: null,
      description: null,
      category: null,
      account: null,
    }

    expect(readRow(spreadsheet[1], empty)).toEqual({ ok: false, reason: 'Columns not matched yet' })
  })
})

describe('typeFromWord', () => {
  it.each([
    ['Income', 'INCOME'],
    ['CR', 'INCOME'],
    ['Deposit', 'INCOME'],
    ['expense', 'EXPENSE'],
    ['DR', 'EXPENSE'],
    ['Withdrawal', 'EXPENSE'],
    ['maybe', null],
  ])('%s → %s', (word, expected) => {
    expect(typeFromWord(word)).toBe(expected)
  })
})
