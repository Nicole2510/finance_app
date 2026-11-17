import { useState } from 'react'
import type { Account, AccountType } from '../../lib/types'
import { accountTypes } from '../../lib/accountTypes'
import AccountFilters, { type TypeFilter } from './AccountFilters'
import AccountGroup from './AccountGroup'
import AccountRow from './AccountRow'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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
  hideOnNarrow: boolean // an account is open, so narrow screens show it instead
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
  hideOnNarrow,
}: Props) {
  const [showArchived, setShowArchived] = useState(false)

  return (
    <section
      aria-label="Your accounts"
      className={cn(
        'flex flex-col gap-1 rounded-[20px] border border-border bg-card p-3',
        // Narrow screens show the list or the account, not both
        hideOnNarrow && 'max-[980px]:hidden',
      )}
    >
      <AccountFilters
        search={search}
        type={type}
        onSearchChange={onSearchChange}
        onTypeChange={onTypeChange}
      />

      {active.length === 0 ? (
        <div className="flex flex-col items-center gap-3.5 px-4 py-8 text-center text-muted-foreground">
          <p>{filtering ? 'No accounts match your search.' : 'No active accounts.'}</p>
          {filtering && (
            <Button type="button" variant="outline" onClick={onClear}>
              Clear
            </Button>
          )}
        </div>
      ) : (
        (Object.keys(accountTypes) as AccountType[]).map((groupType) => {
          const inGroup = active.filter((a) => a.type === groupType)
          return (
            inGroup.length > 0 && (
              <AccountGroup
                key={groupType}
                type={groupType}
                accounts={inGroup}
                selectedId={selectedId}
              />
            )
          )
        })
      )}

      {archived.length > 0 && (
        <>
          <button
            type="button"
            className="mt-2 mb-1 cursor-pointer self-start border-none bg-transparent px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
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
