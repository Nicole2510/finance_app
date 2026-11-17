import { useCallback, useState, type ReactNode } from 'react'
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import { ToastContext, type ToastOptions } from '../lib/toast'
import { cn } from '@/lib/utils'

type ShownToast = ToastOptions & { id: number }

const ICONS = { success: CircleCheck, info: Info, error: CircleAlert }

// Each tone sets two colours the toast's parts use: --tone and --tone-soft
const TONES = {
  success: '[--tone:var(--green)] [--tone-soft:#e5ebe2]',
  info: '[--tone:var(--ink-soft)] [--tone-soft:var(--lavender)]',
  error: '[--tone:var(--red)] [--tone-soft:#f6e3e1]',
}

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
      {/* Top right on desktop, across the top on phones; above everything.
          Only the toasts themselves catch clicks. */}
      <div
        aria-label="Notifications"
        className="pointer-events-none fixed top-5 right-5 z-50 flex w-[min(380px,calc(100vw-24px))] flex-col gap-2.5 max-sm:top-3 max-sm:right-3 max-sm:left-3 max-sm:w-auto"
      >
        {toasts.map((t) => {
          const tone = t.tone ?? 'success'
          const Icon = ICONS[tone]
          return (
            <div
              key={t.id}
              className={cn(
                'group pointer-events-auto relative grid grid-cols-[auto_1fr_auto] gap-3 overflow-hidden rounded-[14px] border border-[color-mix(in_srgb,var(--tone)_35%,transparent)] bg-card px-3.5 pt-3.5 pb-[18px] shadow-xl shadow-primary/10',
                'animate-in fade-in-0 slide-in-from-top-2 duration-200 motion-reduce:animate-none',
                TONES[tone],
              )}
              // Errors interrupt; everything else waits until the screen reader is free
              role={tone === 'error' ? 'alert' : 'status'}
            >
              <span
                className="grid size-8 place-items-center rounded-[10px] bg-(--tone-soft) text-(--tone)"
                aria-hidden
              >
                <Icon size={18} />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-foreground">{t.title}</p>
                {t.message && <p className="mt-0.5 text-sm text-muted-foreground">{t.message}</p>}
              </div>
              <button
                type="button"
                className="grid size-7 cursor-pointer place-items-center rounded-full border-none bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                aria-label="Dismiss"
                onClick={() => dismiss(t.id)}
              >
                <X size={16} />
              </button>
              {/* The countdown; pauses while the toast is hovered or focused */}
              <span
                className="absolute bottom-0 left-0 h-[3px] w-full origin-left animate-toast-timer bg-(--tone) opacity-50 group-focus-within:[animation-play-state:paused] group-hover:[animation-play-state:paused]"
                onAnimationEnd={() => dismiss(t.id)}
              />
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export default ToastProvider
