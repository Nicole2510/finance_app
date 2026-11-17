import readXlsxFile from 'read-excel-file/browser'
import { MAX_FILE_MB, readCsv } from './csv'

export type ReadSheet = { name: string; rows: string[][] }

// One cell from an Excel workbook as the text the importer understands.
// Excel keeps real dates and numbers, so these come out in one exact form:
// dates as "2026-10-18" (no day/month guessing) and numbers as "-62.14".
export function cellToText(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) {
    // The library gives dates at midnight UTC, so read the UTC parts; local
    // ones could land on the day before in time zones west of UTC
    const y = value.getUTCFullYear()
    const m = String(value.getUTCMonth() + 1).padStart(2, '0')
    const d = String(value.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : ''
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
  return String(value).trim()
}

const isExcel = (file: File) =>
  /\.xlsx$/i.test(file.name) ||
  file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

// Reads a CSV or .xlsx file in the browser (it's never uploaded). A CSV is one
// sheet; a workbook gives every sheet so the person can pick the right one.
export async function readSpreadsheet(file: File): Promise<ReadSheet[]> {
  if (!isExcel(file)) return [{ name: file.name, rows: await readCsv(file) }]

  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    throw new Error(`That file is over ${MAX_FILE_MB} MB. Try exporting fewer months at a time.`)
  }
  let sheets
  try {
    sheets = await readXlsxFile(file)
  } catch {
    throw new Error(
      "Couldn't read that workbook. If it's password-protected or an old .xls file, save it as .xlsx or CSV first.",
    )
  }
  return sheets
    .map(({ sheet, data }) => ({
      name: sheet,
      // Drop rows with nothing in them, like the CSV reader does
      rows: data.map((row) => row.map(cellToText)).filter((row) => row.some(Boolean)),
    }))
    .filter((s) => s.rows.length > 0)
}
