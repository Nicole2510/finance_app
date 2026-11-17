import { useMemo, useState } from 'react'
import { FileUp } from 'lucide-react'
import { useApiFetch } from '../../lib/api'
import Modal from '../Modal'
import { MAX_FILE_MB } from '../../lib/csv'
import { readSpreadsheet, type ReadSheet } from '../../lib/spreadsheet'
import {
  bestSheet,
  detectWithoutHeadings,
  findTables,
  normalizeHeading,
  readRows,
  type Mapping,
} from '../../lib/import/detect'
import { detectDateFormat } from '../../lib/import/parse'
import {
  accountNames,
  loadRemembered,
  namesToMatch,
  normalizeName,
  saveRemembered,
  suggestAccount,
  suggestCategory,
  type CategoryChoice,
} from '../../lib/import/names'
import {
  applyServerPreview,
  buildReviewRows,
  summarize,
  toImportRows,
  type ReviewRow,
} from '../../lib/import/review'
import { formatMoney } from '../../lib/money'
import type { Account, Category } from '../../lib/types'
import ColumnMatcher, { type ColumnChoice } from './ColumnMatcher'
import ReadPreview from './ReadPreview'
import NameMatcher from './NameMatcher'
import ReviewTable from './ReviewTable'
import './ImportModal.css'
import { Button } from '@/components/ui/button'
import ListPicker from '../ListPicker'
import { Field, FieldLabel, FormActions, FormError } from '../form'

type Props = {
  accounts: Account[]
  categories: Category[]
  onClose: () => void
  // After a successful import: how many, and the newest date imported
  onImported: (count: number, newestDate: string) => void
  // New categories were created, so the page should load categories again
  onCategoriesChanged: () => void
}

const PREVIEW_ROWS = 5

const blankMapping = (headerRow: number): Mapping => ({
  headerRow,
  date: null,
  dateFormat: null,
  amount: null,
  category: null,
  description: null,
  account: null,
})

// "D A T E" → "Date": headings as people would write them
const tidyHeading = (text: string) => {
  const plain = normalizeHeading(text)
  return plain ? plain[0].toUpperCase() + plain.slice(1) : ''
}

// Step-by-step import. Step 1: choose a file; the transactions table is found
// automatically (even beside budgets and summaries). Step 2: confirm which
// column is which. (Matching names and the final review come next.)
function ImportModal({ accounts, categories, onClose, onImported, onCategoriesChanged }: Props) {
  const apiFetch = useApiFetch()
  const [step, setStep] = useState<'file' | 'columns' | 'names' | 'review'>('file')
  const [fileName, setFileName] = useState<string | null>(null)
  const [sheets, setSheets] = useState<ReadSheet[] | null>(null)
  const [sheetIndex, setSheetIndex] = useState(0)
  const [tableIndex, setTableIndex] = useState(0)
  const [manualHeaderRow, setManualHeaderRow] = useState(0) // only when no table is found
  const [mapping, setMapping] = useState<Mapping | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [categoryChoices, setCategoryChoices] = useState<Record<string, CategoryChoice | null>>({})
  const [accountChoices, setAccountChoices] = useState<Record<string, string | null>>({})
  const [created, setCreated] = useState<Record<string, string>>({}) // name key → new category id
  const [allCategories, setAllCategories] = useState(categories) // includes ones made here
  const [reviewRows, setReviewRows] = useState<ReviewRow[]>([])
  const [busy, setBusy] = useState(false)

  async function chooseFile(file: File | undefined) {
    if (!file) return
    setError(null)
    try {
      const read = await readSpreadsheet(file)
      if (read.length === 0) throw new Error("That file doesn't have any rows.")
      setSheets(read)
      setSheetIndex(bestSheet(read)) // usually right; the person can change it
      setTableIndex(0)
      setFileName(file.name)
    } catch (err) {
      setSheets(null)
      setFileName(null)
      setError((err as Error).message)
    }
  }

  function chooseSheet(index: number) {
    setSheetIndex(index)
    setTableIndex(0)
    setManualHeaderRow(0)
  }

  const rows = useMemo(() => sheets?.[sheetIndex]?.rows ?? null, [sheets, sheetIndex])
  const tables = useMemo(() => (rows ? findTables(rows) : []), [rows])
  const withoutHeadings = useMemo(
    () => (rows && tables.length === 0 ? detectWithoutHeadings(rows) : null),
    [rows, tables],
  )
  const table = tables[tableIndex] ?? null

  // What step 2 starts from: the table found, or values-only detection, or a
  // blank mapping under the heading row the person picks
  const suggested = table?.mapping ?? withoutHeadings ?? blankMapping(manualHeaderRow)
  const headerRow = (step === 'columns' && mapping ? mapping : suggested).headerRow
  const headings = rows && headerRow >= 0 ? rows[headerRow] : []
  const width = rows ? Math.max(0, ...rows.slice(0, 50).map((r) => r.length)) : 0

  // Columns to show: the table's own, else the first dozen that have anything in them
  const shownColumns =
    table?.columns ??
    Array.from({ length: Math.min(width, 12) }, (_, c) => c).filter(
      (c) => headings[c]?.trim() || rows?.some((r) => r[c]?.trim()),
    )
  // Columns to choose from in step 2: every named one (or all, with no headings)
  const columnChoices: ColumnChoice[] = Array.from({ length: width }, (_, c) => c)
    .filter((c) => headerRow < 0 || headings[c]?.trim() || table?.columns.includes(c))
    .map((c) => ({ index: c, label: tidyHeading(headings[c] ?? '') || `Column ${c + 1}` }))

  const dataRows = rows ? rows.slice(headerRow + 1) : []
  const read = useMemo(() => (mapping && rows ? readRows(rows, mapping) : []), [rows, mapping])
  const ambiguousDates =
    mapping?.date != null && detectDateFormat(dataRows.map((r) => r[mapping.date!] ?? '')).ambiguous
  const transactions = useMemo(() => read.filter((r) => r.ok), [read])
  const names = useMemo(() => namesToMatch(transactions), [transactions])
  const accountsInFile = useMemo(() => accountNames(transactions), [transactions])

  // Moving on to names fills in every match it can: remembered choices,
  // transfers to skip, and same-name categories and accounts
  function goToNames() {
    const remembered = loadRemembered()
    setCategoryChoices(
      Object.fromEntries(
        names.map((n) => [n.key, suggestCategory(n, categories, remembered.categories)]),
      ),
    )
    setAccountChoices(
      Object.fromEntries(
        accountsInFile.map(({ name }) => [
          name,
          suggestAccount(name, accounts, remembered.accounts),
        ]),
      ),
    )
    setStep('names')
  }

  const namesDone =
    names.every((n) => {
      const choice = categoryChoices[n.key]
      return choice && (choice.kind !== 'new' || choice.name.trim())
    }) && accountsInFile.every(({ name }) => accountChoices[name])

  // Creates the new categories chosen in step 3 (once each), then asks the
  // server to check every row with the same rules as adding one by hand
  async function goToReview() {
    setBusy(true)
    setError(null)
    try {
      const made = { ...created }
      const madeCategories = [...allCategories]
      for (const name of names) {
        const choice = categoryChoices[name.key]
        if (choice?.kind !== 'new' || made[name.key]) continue
        const category = await apiFetch<Category>('/api/categories', {
          method: 'POST',
          body: JSON.stringify({
            name: choice.name.trim(),
            group: choice.group,
            emoji: choice.emoji,
          }),
        })
        made[name.key] = category.id
        madeCategories.push(category)
        onCategoriesChanged()
      }
      setCreated(made)
      setAllCategories(madeCategories)

      const rows = buildReviewRows(transactions, categoryChoices, accountChoices, made)
      const sent = rows.filter((r) => r.include)
      const preview =
        sent.length > 0
          ? await apiFetch<{ rows: Parameters<typeof applyServerPreview>[2] }>(
              '/api/transactions/import',
              {
                method: 'POST',
                body: JSON.stringify({ mode: 'preview', rows: toImportRows(sent) }),
              },
            )
          : { rows: [] }
      setReviewRows(
        applyServerPreview(
          rows,
          sent.map((r) => r.id),
          preview.rows,
        ),
      )
      setStep('review')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  // Saves every ticked row together (or none), then remembers the step 3
  // choices so the next file from the same place matches itself
  async function importNow() {
    const chosen = reviewRows.filter((r) => r.include && r.categoryId)
    if (chosen.length === 0) return
    setBusy(true)
    setError(null)
    try {
      await apiFetch('/api/transactions/import', {
        method: 'POST',
        body: JSON.stringify({ mode: 'import', rows: toImportRows(chosen) }),
      })
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
      return
    }
    saveRemembered({
      categories: Object.fromEntries(
        names.flatMap((n) => {
          const choice = categoryChoices[n.key]
          if (!choice) return []
          if (choice.kind === 'new') {
            return created[n.key] ? [[n.key, { kind: 'category', categoryId: created[n.key] }]] : []
          }
          return [[n.key, choice]]
        }),
      ),
      accounts: Object.fromEntries(
        accountsInFile.flatMap(({ name }) =>
          accountChoices[name] && name ? [[normalizeName(name), accountChoices[name]!]] : [],
        ),
      ),
    })
    const newest = chosen
      .map((r) => r.date)
      .sort()
      .at(-1)!
    onImported(chosen.length, newest)
  }

  if (step === 'review') {
    const summary = summarize(reviewRows)
    const unreadable = read.filter((r) => !r.ok)
    return (
      <Modal
        title="Import transactions"
        badge={<p className="import__step">Step 4 of 4 · Review and import</p>}
        variant="large"
        onClose={onClose}
      >
        <p className="review-summary">
          Importing <strong>{summary.importing}</strong>{' '}
          {summary.importing === 1 ? 'transaction' : 'transactions'}:{' '}
          {formatMoney(summary.spending)} spending and {formatMoney(summary.income)} money in.{' '}
          {summary.leftOut} left out
          {summary.duplicates > 0 && ` (${summary.duplicates} possible duplicates)`}
          {summary.problems > 0 && `, ${summary.problems} with a problem`}. Untick anything you
          don't want, or change a category.
        </p>
        {unreadable.length > 0 && (
          <p className="column-matcher__hint">
            {unreadable.length} {unreadable.length === 1 ? 'row' : 'rows'} from the file won't be
            imported ({unreadable.map((r) => `row ${r.row + 1}: ${!r.ok && r.reason}`).join('; ')}).
            Fix any typos in your file, or add those rows by hand after importing.
          </p>
        )}
        <ReviewTable
          rows={reviewRows}
          categories={allCategories}
          accounts={accounts}
          onChange={(row) => setReviewRows((rows) => rows.map((r) => (r.id === row.id ? row : r)))}
        />
        {error && <FormError role="alert">{error}</FormError>}
        <FormActions className="mt-6">
          <Button type="button" variant="outline" size="lg" onClick={() => setStep('names')}>
            Back
          </Button>
          <Button
            type="button"
            size="lg"
            disabled={summary.importing === 0 || busy}
            onClick={importNow}
          >
            {busy ? 'Importing…' : `Import ${summary.importing}`}
          </Button>
        </FormActions>
      </Modal>
    )
  }

  if (step === 'names') {
    return (
      <Modal
        title="Import transactions"
        badge={<p className="import__step">Step 3 of 4 · Match names</p>}
        variant="large"
        onClose={onClose}
      >
        <p className="import__intro">
          Same-name categories and accounts were matched for you. Choose the rest once; your choices
          are remembered for next time. Transfers between your own money start as skipped.
        </p>
        <NameMatcher
          names={names}
          accountsInFile={accountsInFile}
          categories={categories}
          accounts={accounts}
          categoryChoices={categoryChoices}
          accountChoices={accountChoices}
          onCategoryChange={(key, choice) => setCategoryChoices((c) => ({ ...c, [key]: choice }))}
          onAccountChange={(name, id) => setAccountChoices((c) => ({ ...c, [name]: id }))}
        />
        {error && <FormError role="alert">{error}</FormError>}
        <FormActions className="mt-6">
          <Button type="button" variant="outline" size="lg" onClick={() => setStep('columns')}>
            Back
          </Button>
          <Button type="button" size="lg" disabled={!namesDone || busy} onClick={goToReview}>
            {busy ? 'Checking…' : namesDone ? 'Next: review' : 'Choose the rest to continue'}
          </Button>
        </FormActions>
      </Modal>
    )
  }

  function goToColumns() {
    setMapping(suggested)
    setStep('columns')
  }

  if (step === 'columns' && mapping) {
    return (
      <Modal
        title="Import transactions"
        badge={<p className="import__step">Step 2 of 4 · Match columns</p>}
        variant="large"
        onClose={onClose}
      >
        <p className="import__intro">
          These were matched automatically. Check them against the preview below and fix anything
          that's wrong.
        </p>
        <ColumnMatcher
          columns={columnChoices}
          mapping={mapping}
          ambiguousDates={ambiguousDates}
          onChange={setMapping}
        />
        <ReadPreview results={read} />
        <FormActions className="mt-6">
          <Button type="button" variant="outline" size="lg" onClick={() => setStep('file')}>
            Back
          </Button>
          <Button
            type="button"
            size="lg"
            disabled={transactions.length === 0 || !mapping.dateFormat}
            onClick={goToNames}
          >
            Next: match names
          </Button>
        </FormActions>
      </Modal>
    )
  }

  return (
    <Modal
      title="Import transactions"
      badge={<p className="import__step">Step 1 of 4 · Choose a file</p>}
      variant="large"
      onClose={onClose}
    >
      <p className="import__intro">
        Choose an Excel workbook (.xlsx) or a CSV file. It's read here in your browser; only the
        transactions you import are sent to Nayad. Most banks can export CSV.
      </p>

      <label className="import__drop">
        <FileUp size={22} aria-hidden />
        <span>{fileName ?? 'Choose an .xlsx or CSV file'}</span>
        <small>Up to {MAX_FILE_MB} MB</small>
        <input
          type="file"
          accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => chooseFile(e.target.files?.[0])}
        />
      </label>

      {error && <FormError role="alert">{error}</FormError>}

      {rows && (
        <>
          {sheets && sheets.length > 1 && (
            <Field>
              <FieldLabel>Which sheet has the transactions?</FieldLabel>
              <ListPicker
                title="Sheet"
                value={String(sheetIndex)}
                options={sheets.map((sheet, i) => ({ value: String(i), label: sheet.name }))}
                onChange={(i) => chooseSheet(Number(i))}
              />
            </Field>
          )}

          {tables.length > 1 && (
            <Field>
              <FieldLabel>Which table has the transactions?</FieldLabel>
              <ListPicker
                title="Table"
                value={String(tableIndex)}
                options={tables.map((t, i) => ({
                  value: String(i),
                  label: `${t.columns.map((c) => tidyHeading(rows[t.mapping.headerRow][c])).join(', ')} (${t.transactions} transactions)`,
                }))}
                onChange={(i) => setTableIndex(Number(i))}
              />
            </Field>
          )}

          {table || withoutHeadings ? (
            <p className="import__found">
              {table
                ? `Found the transactions table: ${table.transactions} transactions.`
                : 'This file has no column headings, so they were worked out from the values.'}{' '}
              Other tables and summaries on the sheet are left out.
            </p>
          ) : (
            <Field>
              <FieldLabel>
                No transactions table was found automatically. Which row has the column headings?
              </FieldLabel>
              <ListPicker
                title="Heading row"
                value={String(manualHeaderRow)}
                options={rows.slice(0, 15).map((row, index) => ({
                  value: String(index),
                  label: `Row ${index + 1}: ${row.filter(Boolean).slice(0, 4).join(', ') || '(empty)'}`,
                }))}
                onChange={(i) => setManualHeaderRow(Number(i))}
              />
            </Field>
          )}

          <div className="import__table-wrap">
            <table className="import__table">
              <thead>
                <tr>
                  {shownColumns.map((c) => (
                    <th key={c} scope="col">
                      {tidyHeading(headings[c] ?? '') || `Column ${c + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataRows
                  .filter((row) => shownColumns.some((c) => row[c]?.trim()))
                  .slice(0, PREVIEW_ROWS)
                  .map((row, r) => (
                    <tr key={r}>
                      {shownColumns.map((c) => (
                        <td key={c}>{row[c] ?? ''}</td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <FormActions className="mt-6">
        <Button type="button" variant="outline" size="lg" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="button"
          size="lg"
          disabled={!rows || dataRows.length === 0}
          onClick={goToColumns}
        >
          Next: match columns
        </Button>
      </FormActions>
    </Modal>
  )
}

export default ImportModal
