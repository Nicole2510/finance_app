import { describe, expect, it } from 'vitest'
import type { ReadRow } from './detect'
import { categoryKey } from './names'
import { applyServerPreview, buildReviewRows, summarize, toImportRows } from './review'

type T = Extract<ReadRow, { ok: true }>
const tx = (
  type: 'INCOME' | 'EXPENSE',
  amount: string,
  categoryName: string,
  description = '',
  accountName = 'BANK',
): T => ({
  row: 0,
  ok: true,
  date: '2026-10-01',
  type,
  amount,
  categoryName,
  description,
  accountName,
})

const transactions = [
  tx('EXPENSE', '62.14', 'Groceries 🛒', 'Weekly shop'),
  tx('EXPENSE', '255.00', 'Credit payment'),
  tx('EXPENSE', '19.08', 'Thai express', '', 'CARD'),
  tx('INCOME', '2163.08', '', 'Employer'),
]
const choices = {
  [categoryKey('EXPENSE', 'Groceries 🛒')]: { kind: 'category' as const, categoryId: 'groceries' },
  [categoryKey('EXPENSE', 'Credit payment')]: {
    kind: 'skip' as const,
    reason: 'Paying a credit card',
  },
  [categoryKey('EXPENSE', 'Thai express')]: {
    kind: 'new' as const,
    name: 'Thai express',
    group: 'WANTS' as const,
    emoji: '🥡',
  },
  [categoryKey('INCOME', 'Employer')]: { kind: 'category' as const, categoryId: 'salary' },
}
const accounts = { BANK: 'bank-id', CARD: 'card-id' }
const created = { [categoryKey('EXPENSE', 'Thai express')]: 'new-id' }

describe('buildReviewRows', () => {
  const rows = buildReviewRows(transactions, choices, accounts, created)

  it('uses the matched category and account', () => {
    expect(rows[0]).toMatchObject({
      categoryId: 'groceries',
      accountId: 'bank-id',
      include: true,
      status: 'ready',
      notes: 'Weekly shop',
    })
    expect(rows[2]).toMatchObject({ categoryId: 'new-id', accountId: 'card-id', include: true })
    expect(rows[3]).toMatchObject({ type: 'INCOME', categoryId: 'salary', label: 'Employer' })
  })

  it('leaves skipped names out, with the reason', () => {
    expect(rows[1]).toMatchObject({
      include: false,
      status: 'skipped',
      categoryId: null,
      message: 'Paying a credit card',
    })
  })
})

describe('toImportRows', () => {
  it('sends the shape a manual add uses, with notes cut to 200 characters', () => {
    const rows = buildReviewRows(
      [tx('EXPENSE', '5.00', 'Groceries 🛒', 'x'.repeat(250))],
      choices,
      accounts,
      {},
    )

    expect(toImportRows(rows)).toEqual([
      {
        type: 'EXPENSE',
        amount: '5.00',
        date: '2026-10-01',
        accountId: 'bank-id',
        categoryId: 'groceries',
        notes: 'x'.repeat(200),
      },
    ])
    expect(toImportRows([{ ...rows[0], notes: '' }])[0].notes).toBeNull()
  })
})

describe('applyServerPreview', () => {
  const rows = buildReviewRows(transactions, choices, accounts, created)
  // Only included rows are sent: ids 0, 2 and 3
  const sent = [0, 2, 3]

  it('unticks duplicates and blocks problems, keeping the reason', () => {
    const result = applyServerPreview(rows, sent, [
      { index: 0, status: 'duplicate', message: 'Looks like a transaction you already have' },
      {
        index: 1,
        status: 'problem',
        message: "The date can't be before the account's opening date",
      },
      { index: 2, status: 'ready' },
    ])

    expect(result[0]).toMatchObject({ status: 'duplicate', include: false })
    expect(result[2]).toMatchObject({
      status: 'problem',
      include: false,
      message: expect.stringMatching(/opening date/),
    })
    expect(result[3]).toMatchObject({ status: 'ready', include: true })
    expect(result[1]).toMatchObject({ status: 'skipped' }) // not sent, so unchanged
  })
})

describe('summarize', () => {
  it('adds up what will be imported, exactly', () => {
    const rows = buildReviewRows(
      [
        tx('EXPENSE', '0.10', 'Groceries 🛒'),
        tx('EXPENSE', '0.20', 'Groceries 🛒'),
        tx('EXPENSE', '255.00', 'Credit payment'),
        tx('INCOME', '100.00', '', 'Employer'),
      ],
      choices,
      accounts,
      {},
    )

    expect(summarize(rows)).toEqual({
      importing: 3,
      spending: '0.30',
      income: '100.00',
      leftOut: 1,
      duplicates: 0,
      problems: 0,
    })
  })
})
