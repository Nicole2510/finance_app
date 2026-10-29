import { useCallback, useRef, useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { useDismiss } from '../lib/useDismiss'

type Item = { id: string; name: string; emoji: string | null; archivedAt: string | null }

type Props = {
  item: Item
  onEdit: () => void
  onToggleArchive: () => void
  onDelete: () => void
}

// One category or income source in a group popup, with a ⋯ actions menu
function ItemRow({ item, onEdit, onToggleArchive, onDelete }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(ref, open, close)

  const archived = item.archivedAt !== null

  function choose(action: () => void) {
    setOpen(false)
    action()
  }

  return (
    <li className={`item-row${archived ? ' item-row--archived' : ''}`}>
      <span className="item-row__emoji" aria-hidden>
        {item.emoji ?? '·'}
      </span>
      <span className="item-row__name">{item.name}</span>

      <div className="item-row__menu" ref={ref}>
        <button
          type="button"
          className="item-row__more"
          aria-label={`Actions for ${item.name}`}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <MoreHorizontal size={20} />
        </button>

        {open && (
          <div className="item-row__dropdown" role="menu">
            <button type="button" role="menuitem" onClick={() => choose(onEdit)}>
              Edit
            </button>
            <button type="button" role="menuitem" onClick={() => choose(onToggleArchive)}>
              {archived ? 'Restore' : 'Archive'}
            </button>
            <button
              type="button"
              role="menuitem"
              className="is-danger"
              onClick={() => choose(onDelete)}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </li>
  )
}

export default ItemRow
