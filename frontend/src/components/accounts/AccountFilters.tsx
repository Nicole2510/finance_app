import { ListFilter, Search } from 'lucide-react'
import { accountTypes } from '../../lib/accountTypes'
import type { AccountType } from '../../lib/types'
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

      {/* An invisible <select> covers the icon, so clicking it opens the native list */}
      <label className={`account-filters__type${type === 'ALL' ? '' : ' is-active'}`}>
        <ListFilter size={18} aria-hidden />
        <select
          value={type}
          aria-label="Filter by account type"
          onChange={(e) => onTypeChange(e.target.value as TypeFilter)}
        >
          <option value="ALL">All types</option>
          {Object.entries(accountTypes).map(([id, { plural }]) => (
            <option key={id} value={id}>
              {plural}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

export default AccountFilters
