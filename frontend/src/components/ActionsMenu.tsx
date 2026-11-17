import { useCallback, useRef, useState } from 'react'
import { MoreHorizontal, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDismiss } from '../lib/useDismiss'

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
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="grid size-9 cursor-pointer place-items-center rounded-full border-none bg-transparent p-0 text-muted-foreground hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <MoreHorizontal size={20} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute top-[calc(100%+4px)] right-0 z-5 flex w-max max-w-[min(280px,80vw)] min-w-[150px] flex-col rounded-[14px] border border-border bg-card p-1.5 shadow-xl shadow-primary/10"
        >
          {actions.map(({ label, hint, icon: Icon, danger, onSelect }) => (
            <button
              key={label}
              type="button"
              role="menuitem"
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-[10px] border-none bg-transparent px-3 py-2.5 text-left text-foreground hover:bg-muted',
                danger && 'text-destructive',
              )}
              onClick={() => {
                setOpen(false)
                onSelect()
              }}
            >
              {Icon && <Icon size={18} className="mt-0.5 shrink-0" aria-hidden />}
              <span>
                {label}
                {hint && (
                  <small className="mt-0.5 block text-[13px] text-muted-foreground">{hint}</small>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default ActionsMenu
