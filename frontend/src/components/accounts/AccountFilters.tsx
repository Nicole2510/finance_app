import { Search } from 'lucide-react'
import { accountTypes } from '../../lib/accountTypes'
import type { AccountType } from '../../lib/types'
import FilterSelect from '../FilterSelect'

export type TypeFilter = AccountType | 'ALL'

type Props = {
  search: string
  type: TypeFilter
  onSearchChange: (search: string) => void
  onTypeChange: (type: TypeFilter) => void
}

// Search box and account-type filter; the page owns the values
function AccountFilters({ search, type, onSearchChange, onTypeChange }: Props) {
  return (
    <div className="mb-2 flex gap-2 border-b border-border pb-3">
      <label className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[14px] bg-muted px-3.5 text-muted-foreground focus-within:ring-3 focus-within:ring-primary/20">
        <Search size={18} aria-hidden />
        <input
          className="min-w-0 flex-1 border-none bg-transparent py-3 text-foreground outline-none placeholder:text-muted-foreground"
          type="search"
          value={search}
          placeholder="Search"
          aria-label="Search accounts"
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </label>

      <FilterSelect
        label="Filter by account type"
        value={type}
        options={[
          { value: 'ALL', label: 'All types' },
          ...Object.entries(accountTypes).map(([id, { plural }]) => ({
            value: id as AccountType,
            label: plural,
          })),
        ]}
        onChange={onTypeChange}
      />
    </div>
  )
}

export default AccountFilters
