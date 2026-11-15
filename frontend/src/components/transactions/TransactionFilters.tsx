import { CalendarRange, Search } from 'lucide-react'
import type { Filters } from '../../lib/transactionFilters'
import type { Account } from '../../lib/types'
import FilterSelect from '../FilterSelect'
import './TransactionFilters.css'

type Props = {
  filters: Filters
  accounts: Account[]
  onChange: (filters: Filters) => void
  onClear: () => void
  onDates: () => void
  dateRangeOn: boolean
  filtering: boolean // any filter on; shows the Clear all button
}

const TYPES: { value: Filters['type']; label: string }[] = [
  { value: 'ALL', label: 'All types' },
  { value: 'INCOME', label: 'Income' },
  { value: 'EXPENSE', label: 'Expense' },
]

// Search, type and account filters above the table; the page owns the values
function TransactionFilters({
  filters,
  accounts,
  onChange,
  onClear,
  onDates,
  dateRangeOn,
  filtering,
}: Props) {
  return (
    <div className="transaction-filters">
      <label className="transaction-filters__search">
        <Search size={18} aria-hidden />
        <input
          type="search"
          value={filters.search}
          placeholder="Search transactions…"
          aria-label="Search transactions"
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
        />
      </label>

      <button
        type="button"
        className={`transaction-filters__dates${dateRangeOn ? ' is-active' : ''}`}
        aria-label="Filter by dates"
        aria-pressed={dateRangeOn}
        onClick={onDates}
      >
        <CalendarRange size={18} aria-hidden />
      </button>

      <FilterSelect
        label="Filter by type"
        value={filters.type}
        options={TYPES}
        onChange={(type) => onChange({ ...filters, type })}
      />

      <select
        className="transaction-filters__account"
        value={filters.accountId}
        aria-label="Filter by account"
        onChange={(e) => onChange({ ...filters, accountId: e.target.value })}
      >
        <option value="ALL">All accounts</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>

      {filtering && (
        <button type="button" className="transaction-filters__clear" onClick={onClear}>
          Clear all
        </button>
      )}
    </div>
  )
}

export default TransactionFilters
