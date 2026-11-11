import { useState } from 'react'
import type { Account, AccountType } from '../../lib/types'
import { accountTypes } from '../../lib/accountTypes'
import AccountFilters, { type TypeFilter } from './AccountFilters'
import AccountGroup from './AccountGroup'
import AccountRow from './AccountRow'
import './AccountList.css'

type Props = {
  active: Account[]
  archived: Account[]
  filtering: boolean // true when a search or type filter is on
  selectedId: string | undefined
  search: string
  type: TypeFilter
  onSearchChange: (search: string) => void
  onTypeChange: (type: TypeFilter) => void
  onClear: () => void
}

// Left panel: search and filter above the matching accounts
function AccountList({
  active,
  archived,
  filtering,
  selectedId,
  search,
  type,
  onSearchChange,
  onTypeChange,
  onClear,
}: Props) {
  const [showArchived, setShowArchived] = useState(false)

  return (
    <section className="account-list" aria-label="Your accounts">
      <AccountFilters
        search={search}
        type={type}
        onSearchChange={onSearchChange}
        onTypeChange={onTypeChange}
      />

      {active.length === 0 ? (
        <div className="account-list__empty">
          <p>{filtering ? 'No accounts match your search.' : 'No active accounts.'}</p>
          {filtering && (
            <button type="button" className="btn btn--secondary" onClick={onClear}>
              Clear
            </button>
          )}
        </div>
      ) : (
        (Object.keys(accountTypes) as AccountType[]).map((groupType) => {
          const inGroup = active.filter((a) => a.type === groupType)
          return inGroup.length > 0 && (
            <AccountGroup key={groupType} type={groupType} accounts={inGroup} selectedId={selectedId} />
          )
        })
      )}

      {archived.length > 0 && (
        <>
          <button
            type="button"
            className="account-list__toggle"
            aria-expanded={showArchived}
            onClick={() => setShowArchived(!showArchived)}
          >
            {showArchived ? 'Hide' : 'Show'} archived ({archived.length})
          </button>
          {showArchived &&
            archived.map((account) => (
              <AccountRow key={account.id} account={account} selected={account.id === selectedId} />
            ))}
        </>
      )}
    </section>
  )
}

export default AccountList
