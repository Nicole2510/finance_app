import type { Account, Category } from '../../lib/types'
import { categoriesFor } from '../../lib/categories'
import { categoryGroups, GROUP_ORDER } from '../../lib/categoryGroups'
import { formatDate } from '../../lib/dates'
import { formatMoney } from '../../lib/money'
import type { ReviewRow } from '../../lib/import/review'
import ListPicker from '../ListPicker'
import { incomeText, table, tableWrap } from './styles'
import { cn } from '@/lib/utils'

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
// A small grey line under a cell's main text
const note = 'block max-w-[220px] text-xs whitespace-normal text-muted-foreground'

// Status pill colours
const STATUS_TINT: Record<string, string> = {
  ready: 'bg-[#e5ebe2] text-(--green)',
  skipped: 'bg-border text-foreground/80',
  duplicate: 'bg-[#f3e9df] text-[#8a5a2b]',
  problem: 'bg-destructive/10 text-destructive',
}

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
    <div
      className={cn(
        tableWrap,
        // Tall lists scroll inside, with the headings pinned on top
        'max-h-[min(52vh,460px)] overflow-y-auto [&_th]:sticky [&_th]:top-0 [&_th]:z-1',
      )}
    >
      <table className={cn(table, '[&_td]:align-middle')}>
        <thead>
          <tr>
            <th scope="col">
              <span className="sr-only">Import</span>
            </th>
            <th scope="col">Date</th>
            <th scope="col">From the file</th>
            <th scope="col">Category</th>
            <th scope="col">Account</th>
            <th scope="col" className="text-right!">
              Amount
            </th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className={row.include ? undefined : '[&_td]:text-muted-foreground'}>
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
              <td className="min-w-[140px] whitespace-normal">
                {row.label}
                {row.notes && row.notes !== row.label && (
                  <small className={note}>{row.notes}</small>
                )}
              </td>
              <td>
                <ListPicker
                  title={row.label}
                  ariaLabel={`Category for ${row.label}`}
                  size="small"
                  className="min-w-[170px]"
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
                  <small className={note}>History only: before its opening date</small>
                )}
              </td>
              <td className={cn('text-right! tabular-nums', row.type === 'INCOME' && incomeText)}>
                {row.type === 'INCOME' ? '+' : '−'}
                {formatMoney(row.amount)}
              </td>
              <td>
                <span
                  className={cn(
                    'inline-block rounded-full px-[9px] py-0.5 text-xs font-medium',
                    STATUS_TINT[row.status],
                  )}
                  title={row.message}
                >
                  {STATUS_LABELS[row.status]}
                </span>
                {row.message && <small className={note}>{row.message}</small>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default ReviewTable
