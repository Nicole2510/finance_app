import { describe, it, expect } from 'vitest'
import { parseBudgetInput, planOrder, progress, totals } from './budgets'
import type { BudgetLine } from './types'

const line = (
  budget: string | null,
  spent: string,
  extra: Partial<BudgetLine> = {},
): BudgetLine => ({
  id: `${budget}-${spent}-${extra.name}`,
  name: 'Groceries',
  emoji: null,
  group: 'NEEDS',
  archived: false,
  budget,
  spent,
  ...extra,
})

describe('progress', () => {
  it('is null without a budget', () => {
    expect(progress('25.00', null)).toBeNull()
  })

  it('shows what is used and what remains', () => {
    expect(progress('250.55', '600.00')).toEqual({
      used: 42,
      bar: 42,
      over: false,
      remaining: '349.45',
    })
  })

  it('is exact with cents', () => {
    expect(progress('0.30', '0.30')).toEqual({
      used: 100,
      bar: 100,
      over: false,
      remaining: '0.00',
    })
    expect(progress('0.10', '0.30')?.remaining).toBe('0.20')
  })

  it('shows the real percentage when over, with the bar capped and a negative remaining', () => {
    expect(progress('16.09', '7.35')).toEqual({
      used: 219,
      bar: 100,
      over: true,
      remaining: '-8.74',
    })
  })

  it('starts at 0% when nothing is spent', () => {
    expect(progress('0.00', '17.25')).toEqual({ used: 0, bar: 0, over: false, remaining: '17.25' })
  })
})

describe('totals', () => {
  it('compares budgets with spending in budgeted categories only', () => {
    const t = totals([line('300.00', '120.00'), line(null, '30.10'), line('50.00', '0.00')])
    expect(t).toEqual({
      budgeted: '350.00',
      plannedSpent: '120.00',
      remaining: '230.00',
      percentLeft: 66,
    })
  })

  it('goes negative when spending passes the budget', () => {
    expect(totals([line('100.00', '130.25')])).toMatchObject({
      remaining: '-30.25',
      percentLeft: -30,
    })
  })

  it('is zero with no budgets', () => {
    expect(totals([line(null, '40.00')])).toEqual({
      budgeted: '0.00',
      plannedSpent: '0.00',
      remaining: '0.00',
      percentLeft: 0,
    })
  })
})

describe('planOrder', () => {
  it('sorts by group, then biggest budget, with unbudgeted ones last', () => {
    const lines = [
      line(null, '0.00', { name: 'Snacks', group: 'WANTS' }),
      line('78.00', '0.00', { name: 'Bus Pass' }),
      line(null, '0.00', { name: 'Health' }),
      line('700.00', '0.00', { name: 'Rent' }),
      line('22.99', '0.00', { name: 'Gym', group: 'WANTS' }),
    ]
    expect([...lines].sort(planOrder).map((l) => l.name)).toEqual([
      'Rent',
      'Bus Pass',
      'Health',
      'Gym',
      'Snacks',
    ])
  })
})

describe('parseBudgetInput', () => {
  it.each([
    ['450', '450.00'],
    ['450.5', '450.50'],
    ['$1,200', '1200.00'],
    [' 39.96 ', '39.96'],
  ])('reads %j as %s', (text, amount) => {
    expect(parseBudgetInput(text)).toEqual({ ok: true, amount })
  })

  it('treats an empty box as removing the budget', () => {
    expect(parseBudgetInput('  ')).toEqual({ ok: true, amount: null })
  })

  it.each(['0', '0.00', '-50', 'abc', '12.345', '12345678901'])('rejects %j', (text) => {
    expect(parseBudgetInput(text).ok).toBe(false)
  })
})
