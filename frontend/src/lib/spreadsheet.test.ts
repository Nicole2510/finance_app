import { describe, expect, it } from 'vitest'
import { cellToText } from './spreadsheet'

describe('cellToText', () => {
  it('writes dates as YYYY-MM-DD from their UTC parts', () => {
    expect(cellToText(new Date(Date.UTC(2026, 9, 18)))).toBe('2026-10-18')
    // Midnight UTC on Jan 1 is still Dec 31 in Canada; it must stay Jan 1
    expect(cellToText(new Date('2027-01-01T00:00:00.000Z'))).toBe('2027-01-01')
  })

  it('writes numbers plainly', () => {
    expect(cellToText(-62.14)).toBe('-62.14')
    expect(cellToText(1500)).toBe('1500')
    expect(cellToText(0.1 + 0.2)).toBe('0.30000000000000004') // left for the amount reader to refuse
    expect(cellToText(Number.NaN)).toBe('')
  })

  it('handles empty cells, true/false and text', () => {
    expect(cellToText(null)).toBe('')
    expect(cellToText(undefined)).toBe('')
    expect(cellToText(true)).toBe('TRUE')
    expect(cellToText('  Groceries ')).toBe('Groceries')
  })
})
