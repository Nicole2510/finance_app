import type { Account, Category } from '../../lib/types'
import { categoriesFor } from '../../lib/categories'
import { categoryGroups, GROUP_ORDER } from '../../lib/categoryGroups'
import { formatDate } from '../../lib/dates'
import { formatMoney } from '../../lib/money'
import type { ReviewRow } from '../../lib/import/review'
import ListPicker from '../ListPicker'

type Props = {
  rows: ReviewRow[]
  categories: Category[]
  accounts: Account[]
  onChange: (row: ReviewRow) => void
}

const STATUS_LABELS: Record<ReviewRow['status'], string> = {
  ready: 'Ready',
  skipped: 'Skipped',
  duplicate: 'Duplicate',
  problem: 'Problem',
}

// Step 4: every transaction, to include or leave out and re-categorise one by one
function ReviewTable({ rows, categories, accounts, onChange }: Props) {
  const accountOf = (id: string) => accounts.find((a) => a.id === id)

  // Picking a category for a skipped or problem row brings it back in
  function changeCategory(row: ReviewRow, categoryId: string) {
    onChange(
      categoryId
        ? { ...row, categoryId, include: true, status: 'ready', message: undefined }
        : { ...row, categoryId: null, include: false },
    )
  }

  return (
    <div className="import__table-wrap review-table">
      <table className="import__table">
        <thead>
          <tr>
            <th scope="col">
              <span className="visually-hidden">Import</span>
            </th>
            <th scope="col">Date</th>
            <th scope="col">From the file</th>
            <th scope="col">Category</th>
            <th scope="col">Account</th>
            <th scope="col" className="review-table__amount">
              Amount
            </th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className={row.include ? undefined : 'is-left-out'}>
              <td>
                <input
                  type="checkbox"
                  aria-label={`Import ${row.label} on ${formatDate(row.date)}`}
                  checked={row.include}
                  disabled={!row.categoryId}
                  onChange={(e) => onChange({ ...row, include: e.target.checked })}
                />
              </td>
              <td>{formatDate(row.date)}</td>
              <td className="review-table__label">
                {row.label}
                {row.notes && row.notes !== row.label && <small>{row.notes}</small>}
              </td>
              <td>
                <ListPicker
                  title={row.label}
                  ariaLabel={`Category for ${row.label}`}
                  size="small"
                  className="review-table__select"
                  value={row.categoryId ?? ''}
                  options={[
                    { value: '', label: 'Not imported' },
                    ...GROUP_ORDER.flatMap((group) =>
                      categoriesFor(row.type, categories)
                        .filter((c) => c.group === group)
                        .map((c) => ({
                          value: c.id,
                          label: c.name,
                          group: categoryGroups[group].label,
                        })),
                    ),
                  ]}
                  onChange={(id) => changeCategory(row, id)}
                />
              </td>
              <td>
                {accountOf(row.accountId)?.name}
                {/* Same rule as adding by hand: before the opening date is history */}
                {row.date < (accountOf(row.accountId)?.openingDate ?? '') && (
                  <small className="review-table__message">
                    History only: before its opening date
                  </small>
                )}
              </td>
              <td className={`review-table__amount${row.type === 'INCOME' ? ' is-income' : ''}`}>
                {row.type === 'INCOME' ? '+' : '−'}
                {formatMoney(row.amount)}
              </td>
              <td>
                <span className={`review-status review-status--${row.status}`} title={row.message}>
                  {STATUS_LABELS[row.status]}
                </span>
                {row.message && <small className="review-table__message">{row.message}</small>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default ReviewTable
