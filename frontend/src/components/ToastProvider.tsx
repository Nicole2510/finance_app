import { useCallback, useState, type ReactNode } from 'react'
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import { ToastContext, type ToastOptions } from '../lib/toast'
import './Toast.css'

type ShownToast = ToastOptions & { id: number }

const ICONS = { success: CircleCheck, info: Info, error: CircleAlert }

let nextId = 1

// Holds the pop-up messages and shows them in a corner of the screen. Each one
// closes when the bar along its bottom runs out (a CSS animation), which pauses
// while it's hovered or focused, so there's time to read it.
function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ShownToast[]>([])

  const toast = useCallback((options: ToastOptions) => {
    setToasts((current) => [...current, { ...options, id: nextId++ }].slice(-3)) // at most 3 at once
  }, [])

  const dismiss = (id: number) => setToasts((current) => current.filter((t) => t.id !== id))

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toasts" aria-label="Notifications">
        {toasts.map((t) => {
          const tone = t.tone ?? 'success'
          const Icon = ICONS[tone]
          return (
            <div
              key={t.id}
              className={`toast toast--${tone}`}
              // Errors interrupt; everything else waits until the screen reader is free
              role={tone === 'error' ? 'alert' : 'status'}
            >
              <span className="toast__icon" aria-hidden>
                <Icon size={18} />
              </span>
              <div className="toast__text">
                <p className="toast__title">{t.title}</p>
                {t.message && <p className="toast__message">{t.message}</p>}
              </div>
              <button
                type="button"
                className="toast__close"
                aria-label="Dismiss"
                onClick={() => dismiss(t.id)}
              >
                <X size={16} />
              </button>
              <span className="toast__timer" onAnimationEnd={() => dismiss(t.id)} />
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export default ToastProvider
