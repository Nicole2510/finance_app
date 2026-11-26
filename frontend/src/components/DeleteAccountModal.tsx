import { useState } from 'react'
import { useClerk } from '@clerk/react'
import { Button } from '@/components/ui/button'
import { useApiFetch } from '../lib/api'
import Modal from './Modal'
import { FormError } from './form'

// The little "+" marks scattered around the bin: [left, top, size, faint]
const SPARKLES: [number, number, number, boolean][] = [
  [2, 22, 11, false],
  [16, 8, 10, false],
  [34, 0, 10, false],
  [62, 6, 11, false],
  [78, 26, 10, true],
  [72, 40, 9, false],
  [10, 38, 9, true],
  [16, 62, 10, false],
  [74, 64, 9, true],
]

// A solid bin with a lid and white slits, in the app's violet
function Bin({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 72" className={className} fill="currentColor">
      <rect x="24" y="2" width="16" height="8" rx="3" />
      <rect x="6" y="9" width="52" height="10" rx="3" />
      <path d="M10 22h44l-3.4 44.5A6 6 0 0 1 44.6 72H19.4a6 6 0 0 1-6-5.5Z" />
      <rect x="21" y="30" width="5" height="32" rx="2.5" fill="white" />
      <rect x="29.5" y="30" width="5" height="32" rx="2.5" fill="white" />
      <rect x="38" y="30" width="5" height="32" rx="2.5" fill="white" />
    </svg>
  )
}

// Asks once, then deletes the account for good and signs out
function DeleteAccountModal({ onClose }: { onClose: () => void }) {
  const apiFetch = useApiFetch()
  const { signOut } = useClerk()
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function remove() {
    setDeleting(true)
    try {
      // The server only deletes when the request says "DELETE"
      await apiFetch('/api/me', { method: 'DELETE', body: JSON.stringify({ confirm: 'DELETE' }) })
    } catch (err) {
      setError((err as Error).message)
      setDeleting(false)
      return
    }
    // The sign-in no longer exists, so leave even if signing out complains
    await signOut({ redirectUrl: '/' }).catch(() => window.location.assign('/'))
  }

  return (
    <Modal variant="compact" onClose={onClose}>
      <div className="text-center">
        <div className="relative mx-auto mb-4 size-[88px]" aria-hidden>
          {SPARKLES.map(([left, top, size, faint], i) => (
            <span
              key={i}
              className={`absolute leading-none font-light ${faint ? 'text-border' : 'text-muted-foreground'}`}
              style={{ left, top, fontSize: size }}
            >
              +
            </span>
          ))}
          <Bin className="absolute top-1/2 left-1/2 h-[54px] -translate-x-1/2 -translate-y-1/2 text-primary" />
        </div>

        <h2 className="mx-auto mb-5 max-w-[260px] font-heading text-xl leading-snug font-semibold">
          Are you sure you want to delete your account?
        </h2>

        {error && <FormError role="alert">{error}</FormError>}

        <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1 max-sm:[&>:last-child]:-order-1">
          <Button
            type="button"
            variant="outline"
            size="default"
            className="rounded-[14px] border-primary/60 text-primary hover:bg-accent hover:text-primary"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="default"
            className="rounded-[14px]"
            disabled={deleting}
            onClick={remove}
          >
            Yes, delete
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default DeleteAccountModal
