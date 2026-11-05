import { useCallback, useRef, useState } from 'react'
import { MoreHorizontal, type LucideIcon } from 'lucide-react'
import { useDismiss } from '../lib/useDismiss'
import './ActionsMenu.css'

export type MenuAction = {
  label: string
  hint?: string
  icon?: LucideIcon
  danger?: boolean
  onSelect: () => void
}

type Props = {
  label: string // what the ⋯ button says to screen readers
  actions: MenuAction[]
}

// A ⋯ button that opens a small list of actions
function ActionsMenu({ label, actions }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(ref, open, close)

  return (
    <div className="actions-menu" ref={ref}>
      <button
        type="button"
        className="actions-menu__more"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <MoreHorizontal size={20} />
      </button>

      {open && (
        <div className="actions-menu__dropdown" role="menu">
          {actions.map(({ label, hint, icon: Icon, danger, onSelect }) => (
            <button
              key={label}
              type="button"
              role="menuitem"
              className={danger ? 'is-danger' : undefined}
              onClick={() => {
                setOpen(false)
                onSelect()
              }}
            >
              {Icon && <Icon size={18} aria-hidden />}
              <span>
                {label}
                {hint && <small>{hint}</small>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default ActionsMenu
