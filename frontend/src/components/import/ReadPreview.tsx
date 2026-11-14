import type { ReadRow } from '../../lib/import/detect'
import { formatDate } from '../../lib/dates'
import { formatMoney } from '../../lib/money'

const SHOWN = 6

// How the first rows will be read with the current matches
function ReadPreview({ results }: { results: ReadRow[] }) {
  const readable = results.filter((r) => r.ok).length
  const skipped = results.length - readable

  return (
    <div className="read-preview">
      <p className="import__count">
        <strong>{readable}</strong> {readable === 1 ? 'transaction' : 'transactions'} found
        {skipped > 0 && `, ${skipped} ${skipped === 1 ? 'row' : 'rows'} skipped`}. The first{' '}
        {Math.min(SHOWN, results.length)} as they'll be read:
      </p>
      <div className="import__table-wrap">
        <table className="import__table">
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Type</th>
              <th scope="col">Amount</th>
              <th scope="col">Description</th>
              <th scope="col">Category</th>
              <th scope="col">Account</th>
            </tr>
          </thead>
          <tbody>
            {results.slice(0, SHOWN).map((r, i) =>
              r.ok ? (
                <tr key={i}>
                  <td>{formatDate(r.date)}</td>
                  <td>{r.type === 'INCOME' ? 'Income' : 'Expense'}</td>
                  <td className={r.type === 'INCOME' ? 'is-income' : undefined}>
                    {r.type === 'INCOME' ? '+' : '−'}
                    {formatMoney(r.amount)}
                  </td>
                  <td>{r.description}</td>
                  <td>{r.categoryName}</td>
                  <td>{r.accountName}</td>
                </tr>
              ) : (
                <tr key={i} className="is-skipped">
                  <td colSpan={6}>Skipped: {r.reason}</td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ReadPreview
