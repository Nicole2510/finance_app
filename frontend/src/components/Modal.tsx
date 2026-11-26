import { useEffect, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PortalContainer } from '../lib/portalContainer'

type Variant = 'compact' | 'dialog' | 'wide' | 'large'

type Props = {
  title?: string
  badge?: ReactNode // small label under the title, e.g. "Expense"
  onClose: () => void
  // All are centred: "compact" for short questions, "dialog" for forms, "wide" for
  // longer lists, "large" for tables
  variant?: Variant
  children: ReactNode
}

const WIDTHS: Record<Variant, string> = {
  compact: 'w-[min(380px,calc(100vw-32px))]',
  dialog: 'w-[min(460px,calc(100vw-32px))]',
  wide: 'w-[min(560px,calc(100vw-32px))]',
  large: 'w-[min(880px,calc(100vw-32px))]',
}

// Popup built on the browser's <dialog>, which gives us Escape-to-close,
// focus trapping and screen-reader support for free
function Modal({ title, badge, onClose, variant = 'dialog', children }: Props) {
  // Kept in state (not a ref) so dropdowns inside can be drawn in this dialog
  const [dialog, setDialog] = useState<HTMLDialogElement | null>(null)

  useEffect(() => {
    if (dialog && !dialog.open) dialog.showModal()
  }, [dialog])

  return (
    <dialog
      ref={setDialog}
      data-variant={variant}
      aria-label={title}
      className={cn(
        'm-auto max-h-none max-w-none overflow-visible border-none bg-transparent p-0 text-foreground',
        // Dimmed, slightly blurred page behind; the popup pops in
        'backdrop:bg-[rgba(30,27,46,0.35)] backdrop:backdrop-blur-[2px]',
        'open:animate-in open:fade-in-0 open:zoom-in-95 open:slide-in-from-bottom-2 open:duration-200',
        WIDTHS[variant],
      )}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      // Clicking the dimmed backdrop closes it
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {/* Header on top, content under it. Only the content scrolls, so the
          scrollbar starts below the header instead of running beside it. */}
      <div className="relative flex max-h-[calc(100dvh-32px)] flex-col overflow-hidden rounded-[20px] bg-sidebar shadow-xl shadow-primary/10 max-sm:rounded-[14px]">
        <div className="shrink-0 px-7 pt-7 max-sm:px-[18px] max-sm:pt-6">
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute top-5 right-5 grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary max-sm:top-4 max-sm:right-3.5"
          >
            <X size={20} />
          </button>
          {title && <h2 className="mb-5 pr-10 font-heading text-[26px] font-semibold">{title}</h2>}
          {badge}
        </div>

        {/* min-h-0 lets it shrink below its content's height, so it can scroll.
            A little top padding keeps input focus rings from being clipped. */}
        <div
          className={cn(
            'min-h-0 overflow-y-auto px-7 pt-1 pb-7 max-sm:px-[18px] max-sm:pb-6',
            // The importer's big popup: room below the last box
            variant === 'large' && 'pb-10',
          )}
        >
          <PortalContainer value={dialog}>{children}</PortalContainer>
        </div>
      </div>
    </dialog>
  )
}

export default Modal
