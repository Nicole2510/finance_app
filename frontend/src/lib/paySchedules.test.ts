import { describe, it, expect } from 'vitest'
import {
  choiceOf,
  currentSchedule,
  dayLabel,
  describeSchedule,
  periodLabel,
  scheduleFields,
} from './paySchedules'
import type { PaySchedule } from './types'

const s = (fields: Partial<PaySchedule> = {}): PaySchedule => ({
  id: 'x',
  startsOn: '2026-11-07',
  endsOn: null,
  amount: '800.00',
  frequency: 'WEEKS',
  interval: 2,
  dayOne: null,
  dayTwo: null,
  ...fields,
})

describe('describing a schedule', () => {
  it.each<[Partial<PaySchedule>, string]>([
    [{}, '$800.00 every 2 weeks'],
    [{ interval: 1 }, '$800.00 every week'],
    [{ interval: 4 }, '$800.00 every 4 weeks'],
    [{ frequency: 'MONTHS', interval: 1 }, '$800.00 every month'],
    [{ frequency: 'MONTHS', interval: 3 }, '$800.00 every 3 months'],
    [
      { frequency: 'TWICE_A_MONTH', interval: null, dayOne: 15, dayTwo: 31 },
      '$800.00 twice a month (15th & last day)',
    ],
    [
      { frequency: 'MONTHS', interval: 1, endsOn: '2026-11-07', amount: '500.00' },
      '$500.00 one-time',
    ],
  ])('%o reads as %s', (fields, text) => {
    expect(describeSchedule(s(fields))).toBe(text)
  })

  it('names days of the month', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 30, 31].map(dayLabel)).toEqual([
      '1st',
      '2nd',
      '3rd',
      '4th',
      '11th',
      '12th',
      '13th',
      '21st',
      '22nd',
      '23rd',
      '30th',
      'last day',
    ])
  })
})

describe('periodLabel', () => {
  it('says when a schedule applies', () => {
    expect(periodLabel(s())).toBe('From Nov 7, 2026 · ongoing')
    expect(periodLabel(s({ startsOn: '2026-01-02', endsOn: '2026-02-12' }))).toBe(
      'Jan 2, 2026 – Feb 12, 2026',
    )
    expect(periodLabel(s({ endsOn: '2026-11-07' }))).toBe('On Nov 7, 2026')
  })
})

describe('choiceOf', () => {
  it('matches saved schedules to the form choices', () => {
    expect(choiceOf(s())).toBe('biweekly')
    expect(choiceOf(s({ interval: 1 }))).toBe('weekly')
    expect(choiceOf(s({ interval: 3 }))).toBe('custom')
    expect(choiceOf(s({ frequency: 'MONTHS', interval: 1 }))).toBe('monthly')
    expect(choiceOf(s({ frequency: 'MONTHS', interval: 1, endsOn: '2026-11-07' }))).toBe('once')
    expect(choiceOf(s({ frequency: 'MONTHS', interval: 12 }))).toBe('custom')
    expect(choiceOf(s({ frequency: 'TWICE_A_MONTH', interval: null }))).toBe('twice')
  })

  it('round-trips through what the form sends', () => {
    const custom = { every: 3, unit: 'MONTHS' as const }
    expect(scheduleFields('biweekly', custom)).toEqual({ frequency: 'WEEKS', interval: 2 })
    expect(scheduleFields('once', custom)).toEqual({ frequency: 'MONTHS', interval: 1 })
    expect(scheduleFields('twice', custom)).toEqual({ frequency: 'TWICE_A_MONTH', interval: null })
    expect(scheduleFields('custom', custom)).toEqual({ frequency: 'MONTHS', interval: 3 })
  })
})

describe('currentSchedule', () => {
  const old = s({ id: 'old', startsOn: '2026-01-02', endsOn: null })
  const raise = s({ id: 'raise', startsOn: '2026-11-21', amount: '850.00' })

  it('is the latest schedule that has started and not ended', () => {
    expect(currentSchedule([old, raise], '2026-12-01')?.id).toBe('raise')
    expect(currentSchedule([old, raise], '2026-11-20')?.id).toBe('old')
  })

  it('is the next one to start when none is paying yet', () => {
    expect(currentSchedule([raise], '2026-10-01')?.id).toBe('raise')
  })

  it('is nothing once the pay has ended', () => {
    expect(currentSchedule([s({ endsOn: '2026-12-04' })], '2027-01-10')).toBeUndefined()
  })
})
