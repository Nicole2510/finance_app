import { useEffect, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { PortalContainer } from '../lib/portalContainer'
import './Modal.css'

type Props = {
  title?: string
  badge?: ReactNode // small label under the title, e.g. "Expense"
  onClose: () => void
  // All are centred: "dialog" for forms, "wide" for longer lists, "large" for tables
  variant?: 'dialog' | 'wide' | 'large'
  children: ReactNode
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
      className={`modal modal--${variant}`}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      // Clicking the dimmed backdrop closes it
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal__body">
        {/* Stays put; only the content below it scrolls */}
        <div className="modal__header">
          <button type="button" className="modal__close" aria-label="Close" onClick={onClose}>
            <X size={20} />
          </button>
          {title && <h2 className="modal__title">{title}</h2>}
          {badge}
        </div>
        <div className="modal__content">
          <PortalContainer value={dialog}>{children}</PortalContainer>
        </div>
      </div>
    </dialog>
  )
}

export default Modal
