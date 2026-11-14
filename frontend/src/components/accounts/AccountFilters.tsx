import { Search } from 'lucide-react'
import { accountTypes } from '../../lib/accountTypes'
import type { AccountType } from '../../lib/types'
import FilterSelect from '../FilterSelect'
import './AccountFilters.css'

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
    <div className="account-filters">
      <label className="account-filters__search">
        <Search size={18} aria-hidden />
        <input
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
