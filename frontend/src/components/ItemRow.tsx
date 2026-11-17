import { cn } from '@/lib/utils'
import ActionsMenu from './ActionsMenu'

type Item = { id: string; name: string; emoji: string | null; archivedAt: string | null }

type Props = {
  item: Item
  onEdit: () => void
  onToggleArchive: () => void
  onDelete: () => void
}

// One category or income source in a group popup, with a ⋯ actions menu
function ItemRow({ item, onEdit, onToggleArchive, onDelete }: Props) {
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
      <span className="min-w-0 flex-1 truncate">{item.name}</span>

      <ActionsMenu
        label={`Actions for ${item.name}`}
        actions={[
          { label: 'Edit', onSelect: onEdit },
          { label: archived ? 'Restore' : 'Archive', onSelect: onToggleArchive },
          { label: 'Delete', danger: true, onSelect: onDelete },
        ]}
      />
    </li>
  )
}

export default ItemRow
