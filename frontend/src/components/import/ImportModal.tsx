import { useState } from 'react'
import { FileUp } from 'lucide-react'
import Modal from '../Modal'
import { MAX_FILE_MB, readCsv } from '../../lib/csv'
import './ImportModal.css'

type Props = {
  onClose: () => void
}

const PREVIEW_ROWS = 5

// Step-by-step import. Step 1: choose a CSV and say which row has the headings.
// (Matching columns, names and the final preview come in the next steps.)
function ImportModal({ onClose }: Props) {
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
      setHeaderRow(0)
    } catch (err) {
      setRows(null)
      setFileName(null)
      setError((err as Error).message)
    }
  }

  const headers = rows?.[headerRow] ?? []
  const dataRows = rows ? rows.slice(headerRow + 1) : []
  // Some exports put a title or account number above the real headings
  const headerChoices = rows ? rows.slice(0, Math.min(rows.length, 10)) : []

  return (
    <Modal title="Import transactions" variant="large" onClose={onClose}>
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
        <button type="button" className="btn btn--primary" disabled>
          Next: match columns
        </button>
      </div>
    </Modal>
  )
}

export default ImportModal
