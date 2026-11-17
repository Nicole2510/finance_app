import { describe, expect, it } from 'vitest'
import type { Account, Category } from '../types'
import { CARD_FLAG_NAMES, type ReadRow } from './detect'
import {
  accountNames,
  cleanName,
  emojiOf,
  categoryKey,
  namesToMatch,
  normalizeName,
  suggestAccount,
  suggestCategory,
  transferReason,
  type NameToMatch,
} from './names'

const category = (
  id: string,
  name: string,
  group: Category['group'],
  archived = false,
): Category => ({
  id,
  name,
  emoji: null,
  group,
  archivedAt: archived ? '2026-10-01T00:00:00Z' : null,
})
const categories = [
  category('groceries', 'Groceries', 'NEEDS'),
  category('household', 'Household', 'NEEDS'),
  category('dining', 'Dining Out', 'WANTS'),
  category('savings', 'Rainy Day', 'SAVINGS'),
  category('salary', 'Salary', 'INCOME'),
  category('old', 'Hobbies', 'WANTS', true),
]

const account = (id: string, name: string, type: Account['type'], archived = false): Account => ({
  id,
  name,
  type,
  openingBalance: '0.00',
  openingDate: '2026-01-01',
  currentBalance: '0.00',
  archivedAt: archived ? '2026-10-01T00:00:00Z' : null,
  updatedAt: '2026-10-01T00:00:00Z',
})
const accounts = [
  account('bank', 'Maple Bank', 'CHEQUING'),
  account('card', 'Maple Visa', 'CREDIT_CARD'),
  account('savings', 'Birch Savings', 'SAVINGS'),
]

const tx = (type: 'INCOME' | 'EXPENSE', categoryName: string, description = '', accountName = '') =>
  ({
    row: 0,
    ok: true,
    date: '2026-10-01',
    type,
    amount: '1.00',
    categoryName,
    description,
    accountName,
  }) as Extract<ReadRow, { ok: true }>

const nameFor = (type: 'INCOME' | 'EXPENSE', label: string): NameToMatch => ({
  key: categoryKey(type, label),
  type,
  label,
  count: 1,
})

describe('normalizeName', () => {
  it.each([
    ['Groceries 🛒', 'grocery'],
    ['groceries', 'grocery'],
    ['Grocery', 'grocery'],
    ['Household (50)', 'household'],
    ['Personal care & grooming', 'personal care and grooming'],
    ['  Eating   Out 🍜 ', 'eating out'],
  ])('%j → %j', (name, expected) => {
    expect(normalizeName(name)).toBe(expected)
  })
})

describe('namesToMatch', () => {
  it('lists each name once per type, most used first, using notes when there is no category', () => {
    const names = namesToMatch([
      tx('EXPENSE', 'Groceries 🛒'),
      tx('EXPENSE', 'groceries'),
      tx('EXPENSE', 'Walmart'),
      tx('INCOME', '', 'EMPLOYER CO'),
      tx('INCOME', 'Groceries'), // same word as money in is a separate name
    ])

    expect(names.map((n) => [n.type, n.label, n.count])).toEqual([
      ['EXPENSE', 'Groceries 🛒', 2],
      ['INCOME', 'EMPLOYER CO', 1], // ties are alphabetical
      ['INCOME', 'Groceries', 1],
      ['EXPENSE', 'Walmart', 1],
    ])
  })
})

describe('transferReason', () => {
  it.each([
    ['EXPENSE', 'Credit payment', /credit card/],
    ['EXPENSE', 'Credit card payment', /credit card/],
    ['INCOME', 'From savings', /savings/],
    ['INCOME', 'Sinking fund', /savings/],
    ['INCOME', 'Savings withdrawal', /savings/],
    ['EXPENSE', 'Transfer to savings', /transfer/],
  ] as const)('%s %j is a transfer', (type, label, reason) => {
    expect(transferReason(type, label)).toMatch(reason)
  })

  it.each([
    ['EXPENSE', 'Sinking fund'], // money into a fund counts as savings
    ['INCOME', 'Holiday jar'], // a person's own fund names come from their remembered choices
    ['EXPENSE', 'Rainy day'],
    ['EXPENSE', 'Groceries'],
    ['INCOME', 'EMPLOYER CO'],
    ['INCOME', 'Credit payment'], // only paying a card is a transfer
  ] as const)('%s %j is not', (type, label) => {
    expect(transferReason(type, label)).toBeNull()
  })
})

describe('suggestCategory', () => {
  it('matches the same name, ignoring emoji and plurals', () => {
    expect(suggestCategory(nameFor('EXPENSE', 'Groceries 🛒'), categories, {})).toEqual({
      kind: 'category',
      categoryId: 'groceries',
    })
    expect(suggestCategory(nameFor('EXPENSE', 'Rainy day'), categories, {})).toEqual({
      kind: 'category',
      categoryId: 'savings',
    })
  })

  it('matches the only category whose name starts with it', () => {
    expect(suggestCategory(nameFor('EXPENSE', 'Dining'), categories, {})).toEqual({
      kind: 'category',
      categoryId: 'dining',
    })
  })

  it("doesn't guess when a start matches more than one category", () => {
    const two = [...categories, category('dining2', 'Dining In', 'WANTS')]

    expect(suggestCategory(nameFor('EXPENSE', 'Dining'), two, {})).toBeNull()
    expect(suggestCategory(nameFor('EXPENSE', 'Din'), categories, {})).toBeNull() // part of a word
  })

  it('only matches categories of the right kind', () => {
    expect(suggestCategory(nameFor('INCOME', 'Groceries'), categories, {})).toBeNull()
    expect(suggestCategory(nameFor('EXPENSE', 'Salary'), categories, {})).toBeNull()
  })

  it('skips transfers by default', () => {
    expect(suggestCategory(nameFor('EXPENSE', 'Credit payment'), categories, {})).toMatchObject({
      kind: 'skip',
    })
  })

  it('leaves unknown names and archived categories for the person to choose', () => {
    expect(suggestCategory(nameFor('EXPENSE', 'Walmart'), categories, {})).toBeNull()
    expect(suggestCategory(nameFor('EXPENSE', 'Hobbies'), categories, {})).toBeNull()
  })

  it('uses a remembered choice first, even over a transfer', () => {
    const name = nameFor('EXPENSE', 'Walmart')
    const card = nameFor('EXPENSE', 'Credit payment')
    const remembered = {
      [name.key]: { kind: 'category' as const, categoryId: 'groceries' },
      [card.key]: { kind: 'category' as const, categoryId: 'household' },
    }

    expect(suggestCategory(name, categories, remembered)).toEqual({
      kind: 'category',
      categoryId: 'groceries',
    })
    expect(suggestCategory(card, categories, remembered)).toEqual({
      kind: 'category',
      categoryId: 'household',
    })
  })

  it('ignores a remembered category that has since been archived', () => {
    const name = nameFor('EXPENSE', 'Crafts')

    expect(
      suggestCategory(name, categories, { [name.key]: { kind: 'category', categoryId: 'old' } }),
    ).toBeNull()
  })
})

describe('suggestAccount', () => {
  it('matches the same or a clearly matching name', () => {
    expect(suggestAccount('MAPLE BANK', accounts, {})).toBe('bank')
    expect(suggestAccount('birch', accounts, {})).toBe('savings')
  })

  it("doesn't guess when a name could be more than one account", () => {
    expect(suggestAccount('MAPLE', accounts, {})).toBeNull()
    expect(suggestAccount('LENDER', accounts, {})).toBeNull()
  })

  it('matches a credit card flag to the only card or chequing account', () => {
    expect(suggestAccount(CARD_FLAG_NAMES.yes, accounts, {})).toBe('card')
    expect(suggestAccount(CARD_FLAG_NAMES.no, accounts, {})).toBe('bank')
    expect(
      suggestAccount(
        CARD_FLAG_NAMES.yes,
        [...accounts, account('card2', 'Other', 'CREDIT_CARD')],
        {},
      ),
    ).toBeNull()
  })

  it('uses a remembered choice, unless that account is archived', () => {
    expect(suggestAccount('LENDER', accounts, { lender: 'savings' })).toBe('savings')
    const archived = [account('gone', 'Gone', 'CASH', true), ...accounts]
    expect(suggestAccount('LENDER', archived, { lender: 'gone' })).toBeNull()
  })
})

describe('accountNames', () => {
  it('counts each account name in the file', () => {
    const rows = [
      tx('EXPENSE', 'A', '', 'MAPLE'),
      tx('EXPENSE', 'B', '', 'MAPLE'),
      tx('EXPENSE', 'C', '', 'LENDER'),
    ]

    expect(accountNames(rows)).toEqual([
      { name: 'MAPLE', count: 2 },
      { name: 'LENDER', count: 1 },
    ])
  })
})

describe('emojiOf and cleanName', () => {
  it.each([
    ['Hair 💇', '💇', 'Hair'],
    ['Neetcode 👩🏽‍💻', '👩🏽‍💻', 'Neetcode'], // one emoji made of several characters
    ['Gym - Membership 🤸🏽‍♂️', '🤸🏽‍♂️', 'Gym - Membership'],
    ['Walmart', null, 'Walmart'],
  ])('%j → emoji %j, name %j', (label, emoji, name) => {
    expect(emojiOf(label)).toBe(emoji)
    expect(cleanName(label)).toBe(name)
  })
})
