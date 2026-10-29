import { useState } from 'react'
import Modal from './Modal'
import EmojiPicker from './EmojiPicker'
import type { CategoryGroup } from '../lib/types'

export type ItemKind = 'expense' | 'income' | 'source'

export type ItemValues = { name: string; emoji: string | null; group?: CategoryGroup }

const LABELS: Record<ItemKind, string> = {
  expense: 'expense category',
  income: 'income category',
  source: 'income source',
}

const SUGGESTIONS: Record<ItemKind, string[]> = {
  expense: ['🛒', '❤️', '🍽️', '🏠', '🚗', '💡'],
  income: ['💼', '💰', '🪙', '🎁', '📈', '🧑‍💻'],
  source: ['🏢', '🏛️', '💼', '💄', '🧑‍💻', '🤝'],
}

const EXPENSE_GROUPS: { id: CategoryGroup; label: string }[] = [
  { id: 'NEEDS', label: 'Needs' },
  { id: 'WANTS', label: 'Wants' },
  { id: 'SAVINGS_DEBT', label: 'Savings & Debt' },
]

type Props = {
  kind: ItemKind
  initial?: ItemValues // starting values (an existing item, or a preset group)
  isEditing: boolean
  onClose: () => void
  // Returns an error message to show, or null if it saved
  onSubmit: (values: ItemValues) => Promise<string | null>
}

// Add / edit popup for categories and income sources
function ItemFormModal({ kind, initial, isEditing, onClose, onSubmit }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [emoji, setEmoji] = useState<string | null>(initial?.emoji ?? null)
  const [group, setGroup] = useState<CategoryGroup>(initial?.group ?? 'NEEDS')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const title = `${isEditing ? 'Edit' : 'Add'} ${LABELS[kind]}`

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const values: ItemValues = { name: name.trim(), emoji }
    if (kind === 'expense') values.group = group
    if (kind === 'income') values.group = 'INCOME'

    const problem = await onSubmit(values)
    setSaving(false)
    if (problem) setError(problem)
    else onClose()
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit}>
        <label className="form-field">
          <span className="form-field__label">Name</span>
          <input
            className="form-input"
            value={name}
            maxLength={40}
            autoFocus
            placeholder={kind === 'source' ? 'e.g. Acme' : 'e.g. Groceries'}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <div className="form-field">
          <span className="form-field__label">Icon</span>
          <EmojiPicker value={emoji} onChange={setEmoji} suggestions={SUGGESTIONS[kind]} />
        </div>

        {kind === 'expense' && (
          <label className="form-field">
            <span className="form-field__label">Budget group</span>
            <select
              className="form-input form-select"
              value={group}
              onChange={(e) => setGroup(e.target.value as CategoryGroup)}
            >
              {EXPENSE_GROUPS.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
          </label>
        )}

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <div className="modal-actions">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={!name.trim() || saving}>
            {isEditing ? 'Save changes' : `Create ${kind === 'source' ? 'source' : 'category'}`}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default ItemFormModal
