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
    <li className={`item-row${archived ? ' item-row--archived' : ''}`}>
      <span className="item-row__emoji" aria-hidden>
        {item.emoji ?? '·'}
      </span>
      <span className="item-row__name">{item.name}</span>

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
