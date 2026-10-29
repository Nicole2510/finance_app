import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import Modal from './Modal'

type Props = {
  name: string
  kindLabel: string // "category" or "income source"
  onClose: () => void
  // Returns an error message (e.g. "has transactions"), or null if deleted
  onDelete: () => Promise<string | null>
  onArchive: () => Promise<void>
}

// "Are you sure?" popup. If the item is in use, offers archiving instead.
function DeleteModal({ name, kindLabel, onClose, onDelete, onArchive }: Props) {
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
    await onArchive()
    onClose()
  }

  return (
    <Modal onClose={onClose}>
      <div className="delete-modal">
        <span className="delete-modal__icon" aria-hidden>
          <Trash2 size={26} />
        </span>
        <h2 className="delete-modal__title">Are you sure you want to delete “{name}”?</h2>

        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : (
          <p className="delete-modal__note">
            This will permanently delete the {kindLabel}. It can't be undone.
          </p>
        )}

        <div className="modal-actions">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Cancel
          </button>
          {error ? (
            <button type="button" className="btn btn--primary" disabled={busy} onClick={archive}>
              Archive instead
            </button>
          ) : (
            <button type="button" className="btn btn--danger" disabled={busy} onClick={remove}>
              Delete
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}

export default DeleteModal
