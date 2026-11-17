import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import Modal from './Modal'
import { Button } from '@/components/ui/button'
import { FormActions, FormError } from './form'

type Props = {
  name: string
  question?: string // replaces "Are you sure you want to delete “name”?"
  kindLabel: string // "category" or "income source"
  details?: string // short extra line, e.g. "$50.00 · Thu, Nov 12"
  onClose: () => void
  // Returns an error message (e.g. "has transactions"), or null if deleted
  onDelete: () => Promise<string | null>
  // Offered when deleting is refused, e.g. an account with transactions.
  // Left out for things that can't be archived, like a transaction.
  onArchive?: () => Promise<void>
}

// "Are you sure?" popup. If the item is in use, offers archiving instead.
function DeleteModal({ name, question, kindLabel, details, onClose, onDelete, onArchive }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function remove() {
    setBusy(true)
    const problem = await onDelete()
    setBusy(false)
    if (problem) setError(problem)
    else onClose()
  }

  async function archive() {
    setBusy(true)
    await onArchive?.()
    onClose()
  }

  return (
    <Modal onClose={onClose}>
      <div className="text-center">
        <span
          className="mx-auto mt-2 mb-4 grid size-[72px] place-items-center rounded-full bg-destructive/10 text-destructive"
          aria-hidden
        >
          <Trash2 size={26} />
        </span>
        <h2 className="mb-3 font-heading text-2xl font-semibold wrap-anywhere">
          {question ?? `Are you sure you want to delete “${name}”?`}
        </h2>

        {error ? (
          <FormError role="alert">{error}</FormError>
        ) : (
          <p className="mt-2 mb-6 text-sm text-muted-foreground">
            {details
              ? `${details}. This can't be undone.`
              : `This will permanently delete the ${kindLabel}. It can't be undone.`}
          </p>
        )}

        <FormActions>
          <Button type="button" variant="outline" size="lg" onClick={onClose}>
            Cancel
          </Button>
          {error && onArchive ? (
            <Button type="button" size="lg" disabled={busy} onClick={archive}>
              Archive instead
            </Button>
          ) : (
            <Button type="button" variant="destructive" size="lg" disabled={busy} onClick={remove}>
              Delete
            </Button>
          )}
        </FormActions>
      </div>
    </Modal>
  )
}

export default DeleteModal
