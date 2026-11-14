import { useState } from 'react'
import { FileUp } from 'lucide-react'
import Modal from '../Modal'
import { MAX_FILE_MB, readCsv } from '../../lib/csv'
import { detectColumns, detectHeaderRow, readRow, type Mapping } from '../../lib/import/detect'
import { detectDateFormat } from '../../lib/import/parse'
import ColumnMatcher from './ColumnMatcher'
import ReadPreview from './ReadPreview'
import './ImportModal.css'

type Props = {
  onClose: () => void
}

const PREVIEW_ROWS = 5

// Step-by-step import. Step 1: choose a CSV and confirm which row has the
// headings. Step 2: confirm which column is which. (Matching names and the
// final preview come next.)
function ImportModal({ onClose }: Props) {
  const [step, setStep] = useState<'file' | 'columns'>('file')
  const [mapping, setMapping] = useState<Mapping | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [rows, setRows] = useState<string[][] | null>(null)
  const [headerRow, setHeaderRow] = useState(0) // index into rows
  const [error, setError] = useState<string | null>(null)

  async function chooseFile(file: File | undefined) {
    if (!file) return
    setError(null)
    try {
      const read = await readCsv(file)
      setRows(read)
      setFileName(file.name)
      setHeaderRow(detectHeaderRow(read)) // usually right; the person can change it
    } catch (err) {
      setRows(null)
      setFileName(null)
      setError((err as Error).message)
    }
  }

  const headers = rows?.[headerRow] ?? []
  const dataRows = rows ? rows.slice(headerRow + 1) : []
  // Some exports put a title or account number above the real headings
  const headerChoices = rows ? rows.slice(0, Math.min(rows.length, 15)) : []

  // Moving on suggests a match for every column, which the person then checks
  function goToColumns() {
    setMapping(detectColumns(headers, dataRows))
    setStep('columns')
  }

  const ambiguousDates =
    mapping?.date != null && detectDateFormat(dataRows.map((r) => r[mapping.date!] ?? '')).ambiguous
  const read = mapping ? dataRows.map((row) => readRow(row, mapping)) : []

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
          headers={headers}
          mapping={mapping}
          ambiguousDates={ambiguousDates}
          onChange={setMapping}
        />
        <ReadPreview results={read} />
        <div className="modal-actions">
          <button type="button" className="btn btn--secondary" onClick={() => setStep('file')}>
            Back
          </button>
          <button type="button" className="btn btn--primary" disabled>
            Next: match names
          </button>
        </div>
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
        Choose a CSV file. Your file is read here in your browser; only the transactions you import
        are sent to Nayad. Excel and most banks can export CSV (in Excel: File → Save As → CSV).
      </p>

      <label className="import__drop">
        <FileUp size={22} aria-hidden />
        <span>{fileName ?? 'Choose a CSV file'}</span>
        <small>Up to {MAX_FILE_MB} MB</small>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => chooseFile(e.target.files?.[0])}
        />
      </label>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {rows && (
        <>
          <label className="form-field">
            <span className="form-field__label">Which row has the column headings?</span>
            <select
              className="form-input form-select"
              value={headerRow}
              onChange={(e) => setHeaderRow(Number(e.target.value))}
            >
              {headerChoices.map((row, index) => (
                <option key={index} value={index}>
                  Row {index + 1}: {row.filter(Boolean).slice(0, 4).join(', ') || '(empty)'}
                </option>
              ))}
            </select>
          </label>

          <p className="import__count">
            {dataRows.length} {dataRows.length === 1 ? 'row' : 'rows'} of transactions found. The
            first {Math.min(PREVIEW_ROWS, dataRows.length)} as read:
          </p>

          <div className="import__table-wrap">
            <table className="import__table">
              <thead>
                <tr>
                  {headers.map((heading, i) => (
                    <th key={i} scope="col">
                      {heading || `Column ${i + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataRows.slice(0, PREVIEW_ROWS).map((row, r) => (
                  <tr key={r}>
                    {headers.map((_, c) => (
                      <td key={c}>{row[c] ?? ''}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="modal-actions">
        <button type="button" className="btn btn--secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn--primary"
          disabled={!rows || dataRows.length === 0}
          onClick={goToColumns}
        >
          Next: match columns
        </button>
      </div>
    </Modal>
  )
}

export default ImportModal
