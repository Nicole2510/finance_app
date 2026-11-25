import { cn } from '@/lib/utils'
import ActionsMenu, { type MenuAction } from './ActionsMenu'

type Item = { id: string; name: string; emoji: string | null; archivedAt: string | null }

type Props = {
  item: Item
  onEdit: () => void
  onToggleArchive: () => void
  onDelete: () => void
  subtitle?: string // a short line under the name, e.g. an income source's pay
  extraActions?: MenuAction[] // shown first in the ⋯ menu
}

// One category or income source in a group popup, with a ⋯ actions menu
function ItemRow({ item, onEdit, onToggleArchive, onDelete, subtitle, extraActions = [] }: Props) {
  const archived = item.archivedAt !== null

  return (
    <li
      className={cn(
        'flex items-center gap-3.5 border-b border-border px-1 py-2.5 last:border-b-0',
        archived && 'opacity-55',
      )}
    >
      <span
        className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-xl text-muted-foreground"
        aria-hidden
      >
        {item.emoji ?? '·'}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate">{item.name}</span>
        {subtitle && (
          <span className="block truncate text-sm text-muted-foreground">{subtitle}</span>
        )}
      </span>

      <ActionsMenu
        label={`Actions for ${item.name}`}
        actions={[
          ...extraActions,
          { label: 'Edit', onSelect: onEdit },
          { label: archived ? 'Restore' : 'Archive', onSelect: onToggleArchive },
          { label: 'Delete', danger: true, onSelect: onDelete },
        ]}
      />
    </li>
  )
}

export default ItemRow
