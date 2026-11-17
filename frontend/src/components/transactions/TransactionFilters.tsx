import { CalendarRange, Search } from 'lucide-react'
import type { Filters } from '../../lib/transactionFilters'
import type { Account } from '../../lib/types'
import FilterSelect from '../FilterSelect'
import ListPicker from '../ListPicker'
import { filterButtonClasses } from '../../lib/formStyles'

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
    <div className="flex shrink-0 flex-wrap gap-2.5 border-b border-border p-3">
      {/* Phones: search takes the first line, filters the next */}
      <label className="flex min-w-0 flex-[1_1_240px] items-center gap-2.5 rounded-[10px] bg-muted px-3.5 text-muted-foreground focus-within:ring-3 focus-within:ring-primary/20 max-[560px]:basis-full">
        <Search size={18} aria-hidden />
        <input
          className="min-w-0 flex-1 border-none bg-transparent py-[11px] text-foreground outline-none placeholder:text-muted-foreground"
          type="search"
          value={filters.search}
          placeholder="Search transactions…"
          aria-label="Search transactions"
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
        />
      </label>

      <button
        type="button"
        // Opens the date range popup; dark while a range is on
        className={filterButtonClasses(dateRangeOn)}
        aria-label="Filter by dates"
        aria-pressed={dateRangeOn}
        onClick={onDates}
      >
        <CalendarRange size={18} aria-hidden />
      </button>

      {/* The filters sit together on the right, after the search */}
      <FilterSelect
        className="ml-auto max-[560px]:ml-0"
        label="Filter by type"
        value={filters.type}
        options={TYPES}
        onChange={(type) => onChange({ ...filters, type })}
      />

      <ListPicker
        title="Account"
        ariaLabel="Filter by account"
        size="small"
        className="h-[42px] w-auto max-w-[220px] rounded-[10px] border-none bg-muted pr-3 pl-3.5 text-[15px] focus-visible:ring-3 focus-visible:ring-primary/20"
        value={filters.accountId}
        options={[
          { value: 'ALL', label: 'All accounts' },
          ...accounts.map((a) => ({ value: a.id, label: a.name })),
        ]}
        onChange={(accountId) => onChange({ ...filters, accountId })}
      />

      {filtering && (
        // Resets every filter at once; only shown while one is on
        <button
          type="button"
          onClick={onClear}
          className="min-h-[42px] cursor-pointer rounded-[10px] border border-border bg-card px-3.5 text-sm whitespace-nowrap text-foreground/80 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Clear all
        </button>
      )}
    </div>
  )
}

export default TransactionFilters
