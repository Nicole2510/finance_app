import { Link } from 'react-router' // Users can navigate between pages without full page reloads
import { Archive, ArchiveRestore, ArrowLeft, Pencil, Trash2 } from 'lucide-react' // Icons for the "back" link and the menu actions
import type { Account } from '../../lib/types' 
import { accountTypes } from '../../lib/accountTypes'
import { balanceText } from '../../lib/accountBalance'
import { daysAgo, formatDate } from '../../lib/dates'
import ActionsMenu from '../ActionsMenu'
import './AccountDetails.css'

type Props = {
  account: Account
  onEdit: () => void
  onToggleArchive: () => void
  onDelete: () => void
}

// Right panel: the selected account's balances and activity
function AccountDetails({ account, onEdit, onToggleArchive, onDelete }: Props) {
  const archived = account.archivedAt !== null
  const { label, icon: Icon } = accountTypes[account.type]

  return (
    <article className="account-details">
      {/* Only shown on phones, where the list is hidden */}
      <Link to="/accounts" className="account-details__back">
        <ArrowLeft size={18} aria-hidden /> All accounts
      </Link>

      <header className="account-details__header">
        <span className={`account-details__icon account-details__icon--${account.type.toLowerCase()}`}>
          <Icon size={22} aria-hidden />
        </span>
        <div className="account-details__title">
          <h2 className="account-details__name">{account.name}</h2>
          <p className="account-details__type">
            {label} · updated {daysAgo(account.updatedAt)}
            {archived && <span className="account-details__badge">Archived</span>}
          </p>
        </div>
        <div className="account-details__balance">
          <p className="account-details__balance-label">Balance</p>
          <p className="account-details__balance-amount">
            {balanceText(account.type, account.currentBalance)}
          </p>
        </div>
        <ActionsMenu
          label={`Actions for ${account.name}`}
          actions={[
            {
              label: 'Edit account',
              hint: 'Change name, type or opening details',
              icon: Pencil,
              onSelect: onEdit,
            },
            {
              label: archived ? 'Restore account' : 'Archive account',
              hint: archived ? 'Show it in your accounts again' : 'Hide it while preserving history',
              icon: archived ? ArchiveRestore : Archive,
              onSelect: onToggleArchive,
            },
            {
              label: 'Delete account',
              hint: 'Only possible with no transactions',
              icon: Trash2,
              danger: true,
              onSelect: onDelete,
            },
          ]}
        />
      </header>

      <dl className="account-details__facts">
        <div>
          <dt>Opening balance</dt>
          <dd>{balanceText(account.type, account.openingBalance)}</dd>
        </div>
        <div>
          <dt>Balance as of</dt>
          <dd>{formatDate(account.openingDate)}</dd>
        </div>
      </dl>

      <section className="account-details__activity">
        <h3>Recent transactions</h3>
        <p>Available when transactions are added.</p>
      </section>
    </article>
  )
}

export default AccountDetails
