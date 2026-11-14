import type { EntryType } from './types'

// What the Transactions page is filtered by
export type Filters = {
  search: string
  type: EntryType | 'ALL'
  accountId: string // 'ALL' or an account id
}

export const NO_FILTERS: Filters = { search: '', type: 'ALL', accountId: 'ALL' }
