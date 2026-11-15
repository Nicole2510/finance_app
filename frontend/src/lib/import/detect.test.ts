import { describe, expect, it } from 'vitest'
import {
  bestSheet,
  CARD_FLAG_NAMES,
  HELD_FOR_DEBTS,
  detectWithoutHeadings,
  findTables,
  normalizeHeading,
  readRows,
  roleOf,
  typeFromWord,
  type Mapping,
} from './detect'

// Made-up files with the same shapes as real ones (fake names and amounts)

// A dashboard on the left, letter-spaced headings, Type + Amount, a side
// table on the right, dates only on each day's first row, and a typo
const pad = (n: number) => Array<string>(n).fill('')
const row = (left: string[], cells: Record<number, string>, width = 60) => {
  const r = [...left, ...pad(width - left.length)]
  for (const [c, v] of Object.entries(cells)) r[Number(c)] = v
  return r
}
const dashboardSheet = [
  row([], { 3: 'October' }),
  row([], { 11: 'T R A N S A C T I O N S', 45: 'B U D G E T   V S   A C T U A L' }),
  row([], {}),
  row([], {
    11: 'D A T E',
    14: 'T Y P E',
    19: 'C A T E G O R Y',
    24: 'A M O U N T',
    27: 'A C C O U N T ',
    32: 'N O T E S',
    45: 'C A T E G O R Y',
    48: 'B U D G E T',
  }),
  row([], {
    3: ' - DASHBOARD - ',
    11: '10/1/2026',
    14: 'Income',
    19: 'Allowance 💰',
    24: '$1,200.50',
    27: 'MAPLE BANK',
    45: 'Groceries',
    48: '$400.00',
  }),
  row([], { 14: 'Bills/Subscriptions', 19: 'Rent 🏡', 24: '$700.00', 27: 'MAPLE BANK' }),
  row([], { 3: 'O V E R V I E W' }),
  row([], {
    11: '10/2/2026',
    14: 'Expenses',
    19: 'Groceries 🛒',
    24: '$80.25',
    27: 'MAPLE BANK',
    32: 'Market, Corner shop',
  }),
  row([], { 14: 'Debt', 19: 'Cabs 🚕', 24: '$9.75', 27: 'LENDER', 32: 'Taxi' }),
  row([], { 14: 'Expenses', 19: 'Snacks 🍿', 24: '6..99', 27: 'MAPLE BANK' }),
  row([], { 3: 'T O T A L', 5: '0.00' }),
  row([], {
    11: '10/14/2026',
    14: 'Expenses',
    19: 'Household 🧺',
    24: '$7.95',
    27: 'MAPLE BANK',
    32: 'Dollar store',
  }),
]

// Outgoing and Incoming side by side (one row can hold both), a TRUE/FALSE
// credit card column, tables to the right, and empty FALSE rows at the end
const sideBySideSheet = [
  [
    'Date',
    'Category',
    'Outgoing ',
    'Notes',
    'Credit card transactions',
    'Incoming',
    'Notes',
    '',
    'Calculated Balance',
    'Notes',
    '',
    'Income Date',
    'Income',
    'Source',
  ],
  [
    '10/31/2026',
    'Shop A',
    '90.76',
    'Me',
    'TRUE',
    '92.93',
    'Friend',
    '',
    '178.07',
    '',
    '',
    'Start balance',
    '167.00',
    'Carry over',
  ],
  [
    '',
    'Groceries',
    '19.57',
    'Shop A',
    'TRUE',
    '',
    '',
    '',
    'Real Balance',
    '',
    '',
    'November 6',
    '2163.08',
    'TRUE',
  ],
  ['11/1/2026', 'Rent', '1103', '', 'FALSE', '1103', 'Savings jar', '', '', '', '', '', '', ''],
  ['', 'Credit payment', '255', '', 'FALSE', '', '', '', '', '', '', '', '', ''],
  ['11/13/2026', 'Utilities', '25', 'Laundry', 'FALSE', '', '', '', '', '', '', '', '', ''],
  ['', '', '', '', 'FALSE', '', '', '', '', '', '', '', '', ''],
  ['', '', '', '', 'FALSE', '', '', '', '', '', '', '', '', ''],
]

const bankExport = [
  ['Maple Bank statement'],
  ['Account: Chequing ****1234'],
  [],
  ['Date', 'Description', 'Debit', 'Credit', 'Balance'],
  ['10/18/2026', 'GROCERY STORE', '62.14', '', '937.86'],
  ['10/15/2026', 'EMPLOYER PAYROLL', '', '1,500.00', '2437.86'],
]

const noHeadings = [
  ['10/18/2026', '-62.14', 'GROCERY STORE #12'],
  ['10/15/2026', '1500.00', 'EMPLOYER PAYROLL'],
  ['10/14/2026', '-4.50', 'COFFEE'],
]

const okRows = (results: ReturnType<typeof readRows>) => results.filter((r) => r.ok)

describe('normalizeHeading and roleOf', () => {
  it.each([
    ['D A T E', 'date'],
    ['A C C O U N T ', 'account'],
    ['Outgoing ', 'outgoing'],
    ['T O T A L  W A N T S', 'total wants'],
    ['Groceries 🛒', 'groceries'],
  ])('normalizes %j to %j', (heading, expected) => {
    expect(normalizeHeading(heading)).toBe(expected)
  })

  it.each([
    ['D A T E', 'date'],
    ['Income Date', 'date'],
    ['T Y P E', 'type'],
    ['C A T E G O R Y', 'category'],
    ['A M O U N T', 'amount'],
    ['Outgoing ', 'outgoing'],
    ['Incoming', 'incoming'],
    ['Credit card transactions', 'cardFlag'],
    ['Debit', 'outgoing'],
    ['Credit', 'incoming'],
    ['N O T E S', 'notes'],
    ['Calculated Balance', null],
    ['B U D G E T', null],
  ])('%j is a %s column', (heading, role) => {
    expect(roleOf(heading)).toBe(role)
  })
})

describe('findTables', () => {
  it('finds a letter-spaced table between a dashboard and a budget', () => {
    const [table] = findTables(dashboardSheet)

    expect(table.columns).toEqual([11, 14, 19, 24, 27, 32])
    expect(table.mapping).toMatchObject({
      headerRow: 3,
      date: 11,
      dateFormat: 'MDY',
      amount: { style: 'typed', column: 24, typeColumn: 14 },
      category: 19,
      description: 32,
      account: { kind: 'column', column: 27 },
    })
  })

  it('finds side-by-side money out and money in, and ignores the tables beside it', () => {
    const tables = findTables(sideBySideSheet)

    expect(tables[0].columns).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(tables[0].mapping).toMatchObject({
      date: 0,
      amount: { style: 'split', outgoing: 2, incoming: 5, incomingNotes: 6 },
      category: 1,
      description: 3,
      account: { kind: 'cardFlag', column: 4 },
    })
    // The small income list to the right is found too, but ranked last
    expect(tables.at(-1)?.mapping.date).toBe(11)
  })

  it('finds a bank export under its title lines', () => {
    const [table] = findTables(bankExport)

    expect(table.mapping).toMatchObject({
      headerRow: 3,
      amount: { style: 'split', outgoing: 2, incoming: 3 },
      description: 1,
    })
  })

  it('finds nothing in a sheet with no Date heading', () => {
    expect(
      findTables([
        ['Month', 'Total'],
        ['October', '12'],
      ]),
    ).toEqual([])
  })
})

describe('readRows', () => {
  it('reads Type + Amount rows, carrying each day down and flagging typos', () => {
    const results = readRows(dashboardSheet, findTables(dashboardSheet)[0].mapping)

    expect(okRows(results)).toEqual([
      expect.objectContaining({
        date: '2026-10-01',
        type: 'INCOME',
        amount: '1200.50',
        categoryName: 'Allowance 💰',
        accountName: 'MAPLE BANK',
      }),
      expect.objectContaining({
        date: '2026-10-01',
        type: 'EXPENSE',
        amount: '700.00',
        categoryName: 'Rent 🏡',
      }),
      expect.objectContaining({
        date: '2026-10-02',
        type: 'EXPENSE',
        amount: '80.25',
        description: 'Market, Corner shop',
      }),
      expect.objectContaining({ date: '2026-10-14', type: 'EXPENSE', amount: '7.95' }),
    ])
    // The dashboard's rows aren't read; the typo is reported, not dropped
    const problems = results.filter((r) => !r.ok)
    expect(problems).toEqual([
      { row: 8, ok: false, reason: HELD_FOR_DEBTS }, // the "Debt" row waits for Debts & Loans
      { row: 9, ok: false, reason: 'Can\'t read the amount "6..99"' },
    ])
  })

  it('splits a row holding both money out and money in into two transactions', () => {
    const results = readRows(sideBySideSheet, findTables(sideBySideSheet)[0].mapping)

    expect(okRows(results)).toEqual([
      {
        row: 1,
        ok: true,
        date: '2026-10-31',
        type: 'EXPENSE',
        amount: '90.76',
        description: 'Me',
        categoryName: 'Shop A',
        accountName: CARD_FLAG_NAMES.yes,
      },
      {
        row: 1,
        ok: true,
        date: '2026-10-31',
        type: 'INCOME',
        amount: '92.93',
        description: 'Friend',
        categoryName: '',
        accountName: CARD_FLAG_NAMES.yes,
      },
      expect.objectContaining({
        row: 2,
        date: '2026-10-31',
        type: 'EXPENSE',
        amount: '19.57',
        categoryName: 'Groceries',
      }),
      expect.objectContaining({
        row: 3,
        date: '2026-11-01',
        type: 'EXPENSE',
        amount: '1103.00',
        accountName: CARD_FLAG_NAMES.no,
      }),
      expect.objectContaining({
        row: 3,
        type: 'INCOME',
        amount: '1103.00',
        description: 'Savings jar',
      }),
      expect.objectContaining({ row: 4, date: '2026-11-01', categoryName: 'Credit payment' }),
      expect.objectContaining({ row: 5, date: '2026-11-13', amount: '25.00' }),
    ])
    // Empty rows with only FALSE in them are ignored, not reported
    expect(results.filter((r) => !r.ok)).toEqual([])
  })

  it('reads money in alone with its own notes and the row category', () => {
    const rows = [
      sideBySideSheet[0],
      ['10/31/2026', 'Refunds', '', '', 'FALSE', '4.56', 'Coffee refund'],
    ]

    expect(okRows(readRows(rows, findTables(rows)[0].mapping))).toEqual([
      expect.objectContaining({
        type: 'INCOME',
        amount: '4.56',
        description: 'Coffee refund',
        categoryName: 'Refunds',
      }),
    ])
  })

  it('flips a single column when positive amounts are spending', () => {
    const rows = [
      ['Date', 'Amount'],
      ['2026-10-18', '62.14'],
      ['2026-10-19', '-10'],
    ]
    const m: Mapping = {
      ...findTables(rows)[0].mapping,
      amount: { style: 'signed', column: 1, negativeIs: 'INCOME' },
    }

    expect(okRows(readRows(rows, m)).map((r) => r.ok && r.type)).toEqual(['EXPENSE', 'INCOME'])
  })

  it.each<[string[], RegExp]>([
    [['2026-10-18', 'Total', '-5'], /total/i],
    [['2026-02-30', 'Groceries', '-5'], /date/],
    [['2026-10-18', 'Groceries', ''], /no amount/i],
    [['', 'Groceries', '-5'], /no date/i],
  ])('reports %j', (cells, reason) => {
    // The problem row first, then enough ordinary rows to detect the format
    const ordinary = ['01', '02', '03', '04', '05'].map((d) => [`2026-10-${d}`, 'Rent', '-1'])
    const rows = [['Date', 'Category', 'Amount'], cells, ...ordinary]
    const [result] = readRows(rows, findTables(rows)[0].mapping)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toMatch(reason)
  })

  it('reads nothing until the columns are matched', () => {
    const empty: Mapping = {
      headerRow: 0,
      date: null,
      dateFormat: null,
      amount: null,
      category: null,
      description: null,
      account: null,
    }

    expect(readRows(bankExport, empty)).toEqual([])
  })
})

describe('detectWithoutHeadings', () => {
  it('works from the values when a file has no headings', () => {
    const m = detectWithoutHeadings(noHeadings)

    expect(m).toMatchObject({
      headerRow: -1,
      date: 0,
      dateFormat: 'MDY',
      amount: { style: 'signed', column: 1 },
      description: 2,
    })
    expect(okRows(readRows(noHeadings, m!))).toHaveLength(3)
  })

  it('gives up on a sheet with no transactions', () => {
    expect(detectWithoutHeadings([['Remember to pay rent']])).toBeNull()
  })
})

describe('typeFromWord', () => {
  it.each([
    ['Income', 'INCOME'],
    ['CR', 'INCOME'],
    ['Expenses', 'EXPENSE'],
    ['Bills/Subscriptions', 'EXPENSE'],
    ['Debt', null], // held back for Debts & Loans instead
    ['DR', 'EXPENSE'],
    ['maybe', null],
  ])('%s → %s', (word, expected) => {
    expect(typeFromWord(word)).toBe(expected)
  })
})

describe('bestSheet', () => {
  it('picks the sheet with the most transactions', () => {
    const summary = {
      rows: [
        ['Month', 'Total'],
        ['October', '1412.87'],
      ],
    }

    expect(bestSheet([summary, { rows: dashboardSheet }])).toBe(1)
  })
})
