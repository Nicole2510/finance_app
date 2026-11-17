import { describe, expect, it } from 'vitest'
import { detectDateFormat, parseAmount, parseDate } from './parse'

describe('parseDate', () => {
  it.each([
    ['2026-10-18', 'YMD', '2026-10-18'],
    ['2026/10/18', 'YMD', '2026-10-18'],
    ['18/10/2026', 'DMY', '2026-10-18'],
    ['18.10.26', 'DMY', '2026-10-18'],
    ['10/18/2026', 'MDY', '2026-10-18'],
    ['10/18/2026 0:00', 'MDY', '2026-10-18'],
    ['2026-10-18T14:30:00Z', 'YMD', '2026-10-18'],
    ['Oct 18, 2026', 'MON_D_Y', '2026-10-18'],
    ['October 18 2026', 'MON_D_Y', '2026-10-18'],
    ['Sept. 3, 2026', 'MON_D_Y', '2026-09-03'],
    ['18-Oct-2026', 'D_MON_Y', '2026-10-18'],
    ['18 Oct 2026', 'D_MON_Y', '2026-10-18'],
  ] as const)('reads %s as %s', (value, format, expected) => {
    expect(parseDate(value, format)).toBe(expected)
  })

  it.each([
    ['2026-02-30', 'YMD'], // not a real day
    ['31/04/2026', 'DMY'], // April has 30 days
    ['13/18/2026', 'MDY'], // month 13
    ['18/10/2026', 'MDY'], // wrong format for this value
    ['Smarch 3, 2026', 'MON_D_Y'],
    ['', 'YMD'],
    ['Total', 'YMD'],
  ] as const)('refuses %s as %s', (value, format) => {
    expect(parseDate(value, format)).toBeNull()
  })
})

describe('detectDateFormat', () => {
  it('picks the only format that fits every value', () => {
    expect(detectDateFormat(['18/10/2026', '03/11/2026', '25/12/2026']).format).toBe('DMY')
    expect(detectDateFormat(['10/18/2026', '11/03/2026']).format).toBe('MDY')
    expect(detectDateFormat(['2026-10-18', '2026-11-03']).format).toBe('YMD')
    expect(detectDateFormat(['Oct 18, 2026']).format).toBe('MON_D_Y')
  })

  it('never guesses when day/month and month/day both fit', () => {
    const result = detectDateFormat(['03/04/2026', '05/06/2026'])

    expect(result.format).toBeNull()
    expect(result.ambiguous).toBe(true)
    expect(result.fits).toEqual(expect.arrayContaining(['DMY', 'MDY']))
  })

  it("isn't thrown off by one typo among many dates", () => {
    const dates = ['10/18/2026', '10/19/2026', '10/20/2026', '10/21/2026', '02/30/2026']

    expect(detectDateFormat(dates).format).toBe('MDY')
  })

  it('finds nothing when most values are not dates', () => {
    expect(detectDateFormat(['10/18/2026', 'soon', 'later']).format).toBeNull()
  })

  it('ignores blank cells and finds nothing in a column of text', () => {
    expect(detectDateFormat(['2026-10-18', '', '2026-10-19']).format).toBe('YMD')
    expect(detectDateFormat(['Groceries', 'Rent']).format).toBeNull()
    expect(detectDateFormat([]).format).toBeNull()
  })
})

describe('parseAmount', () => {
  it.each([
    ['62.14', '62.14'],
    ['-62.14', '-62.14'],
    ['62', '62.00'],
    ['62.5', '62.50'],
    ['$1,200.00', '1200.00'],
    ['-$1,200.00', '-1200.00'],
    ['$-1,200.00', '-1200.00'],
    ['(62.14)', '-62.14'],
    ['($62.14)', '-62.14'],
    ['62.14-', '-62.14'],
    ['+62.14', '62.14'],
    ['CAD 62.14', '62.14'],
    ['C$62.14', '62.14'],
    ['62,14', '62.14'],
    ['1 200,50', '1200.50'],
    ['1,234,567.89', '1234567.89'],
    ['0.10', '0.10'],
    ['007.50', '7.50'],
    ['-0.00', '0.00'],
  ])('reads %s as %s', (value, expected) => {
    expect(parseAmount(value)).toBe(expected)
  })

  it.each(['', 'abc', 'Groceries', '12.345', '1.2.3', '$', '--5', '12345678901.00', '2026-10-18'])(
    'refuses %j',
    (value) => {
      expect(parseAmount(value)).toBeNull()
    },
  )
})
