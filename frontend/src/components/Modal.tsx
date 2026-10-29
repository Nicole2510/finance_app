import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import './Modal.css'

type Props = {
  title?: string
  onClose: () => void
  // Both are centred: "dialog" for forms, "wide" for longer lists
  variant?: 'dialog' | 'wide'
  children: ReactNode
}

// Popup built on the browser's <dialog>, which gives us Escape-to-close,
// focus trapping and screen-reader support for free
function Modal({ title, onClose, variant = 'dialog', children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  return (
    <dialog
      ref={ref}
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
        <button type="button" className="modal__close" aria-label="Close" onClick={onClose}>
          <X size={20} />
        </button>
        {title && <h2 className="modal__title">{title}</h2>}
        {children}
      </div>
    </dialog>
  )
}

export default Modal
