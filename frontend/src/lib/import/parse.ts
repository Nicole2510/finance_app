// Reading single cells from an imported file: dates and amounts in the many
// ways banks and spreadsheets write them. Pure functions, so they're easy to test.

export type DateFormat = 'YMD' | 'DMY' | 'MDY' | 'MON_D_Y' | 'D_MON_Y'

export const DATE_FORMATS: { id: DateFormat; label: string }[] = [
  { id: 'YMD', label: '2026-10-18 (year-month-day)' },
  { id: 'DMY', label: '18/10/2026 (day/month/year)' },
  { id: 'MDY', label: '10/18/2026 (month/day/year)' },
  { id: 'MON_D_Y', label: 'Oct 18, 2026' },
  { id: 'D_MON_Y', label: '18-Oct-2026' },
]

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

function monthFromName(name: string) {
  const index = MONTHS.indexOf(name.slice(0, 3).toLowerCase())
  return index === -1 ? null : index + 1
}

// "26" → 2026; four-digit years stay as they are
function fullYear(year: string) {
  return year.length === 2 ? 2000 + Number(year) : Number(year)
}

// Builds "YYYY-MM-DD", or null if it isn't a real day (e.g. Feb 30)
function toKey(year: number, month: number | null, day: number) {
  if (!month || month < 1 || month > 12 || day < 1 || year < 1900 || year > 2100) return null
  const date = new Date(year, month - 1, day)
  if (date.getMonth() !== month - 1) return null // rolled over, so the day didn't exist
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// Reads a date written in the given format. Returns "YYYY-MM-DD" or null.
export function parseDate(value: string, format: DateFormat): string | null {
  // Spreadsheets often add a time ("10/18/2026 0:00"); the day is all we need
  const text = value.trim().replace(/[ T]\d{1,2}:\d{2}(:\d{2})?(\.\d+)?\s*([AP]M)?Z?$/i, '')
  let m: RegExpMatchArray | null

  switch (format) {
    case 'YMD':
      m = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
      return m ? toKey(Number(m[1]), Number(m[2]), Number(m[3])) : null
    case 'DMY':
      m = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/)
      return m ? toKey(fullYear(m[3]), Number(m[2]), Number(m[1])) : null
    case 'MDY':
      m = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/)
      return m ? toKey(fullYear(m[3]), Number(m[1]), Number(m[2])) : null
    case 'MON_D_Y':
      m = text.match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})$/)
      return m ? toKey(Number(m[3]), monthFromName(m[1]), Number(m[2])) : null
    case 'D_MON_Y':
      m = text.match(/^(\d{1,2})[-\s]([A-Za-z]{3,9})\.?[-\s,]+(\d{2}|\d{4})$/)
      return m ? toKey(fullYear(m[3]), monthFromName(m[2]), Number(m[1])) : null
  }
}

// The format that reads the most of these dates, as long as it reads at least
// 80% (so one typo doesn't stop the rest; that row is reported instead).
// Day/month and month/day reading the same dates (every day is 12 or under)
// is ambiguous: never guessed.
export function detectDateFormat(values: string[]) {
  const filled = values.map((v) => v.trim()).filter(Boolean)
  const counts = DATE_FORMATS.map((f) => ({
    id: f.id,
    count: filled.filter((v) => parseDate(v, f.id)).length,
  }))
  const most = Math.max(0, ...counts.map((c) => c.count))
  const fits =
    filled.length && most >= filled.length * 0.8
      ? counts.filter((c) => c.count === most).map((c) => c.id)
      : []
  const ambiguous = fits.includes('DMY') && fits.includes('MDY')
  return { format: ambiguous ? null : (fits[0] ?? null), ambiguous, fits }
}

// Reads an amount the way people and banks write it. Returns a signed string
// with 2 decimals ("-62.14"), or null if it isn't an amount.
//   -62.14   $1,200.00   (62.14)   62.14-   CAD 62.14   62,14   1 200,50
export function parseAmount(value: string): string | null {
  let text = value.trim()
  if (!text) return null

  let negative = false
  if (/^\(.*\)$/.test(text)) {
    negative = true // accounting style: (62.14) means -62.14
    text = text.slice(1, -1)
  }
  text = text.replace(/\b(CAD|USD|EUR|GBP)\b|C\$|US\$|[$€£]/gi, '').replace(/\s+/g, '')
  if (text.startsWith('-')) {
    negative = !negative
    text = text.slice(1)
  } else if (text.endsWith('-')) {
    negative = !negative
    text = text.slice(0, -1)
  } else if (text.startsWith('+')) {
    text = text.slice(1)
  }

  // Thousands commas (1,200.50) or a decimal comma (62,14 or 1200,50)
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(text)) text = text.replace(/,/g, '')
  else if (/^\d+,\d{1,2}$/.test(text)) text = text.replace(',', '.')

  if (!/^\d+(\.\d+)?$/.test(text)) return null
  const [whole, fraction = ''] = text.split('.')
  if (fraction.length > 2 || whole.length > 10) return null

  const amount = `${whole.replace(/^0+(?=\d)/, '')}.${fraction.padEnd(2, '0')}`
  return negative && Number(amount) !== 0 ? `-${amount}` : amount
}
