import { useState } from 'react'
import Modal from './Modal'
import EmojiPicker from './EmojiPicker'
import type { CategoryGroup } from '../lib/types'
import { Button } from '@/components/ui/button'
import ListPicker from './ListPicker'
import { Field, FieldLabel, FormActions, FormError, Input } from './form'

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
  { id: 'SAVINGS', label: 'Savings' },
  { id: 'DEBT', label: 'Debt' },
  { id: 'INVESTMENTS', label: 'Investments' },
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
        <Field>
          <FieldLabel>Name</FieldLabel>
          <Input
            value={name}
            maxLength={40}
            autoFocus
            placeholder={kind === 'source' ? 'e.g. Acme' : 'e.g. Groceries'}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>

        <Field as="div">
          <FieldLabel>Icon</FieldLabel>
          <EmojiPicker value={emoji} onChange={setEmoji} suggestions={SUGGESTIONS[kind]} />
        </Field>

        {kind === 'expense' && (
          <Field as="div">
            <FieldLabel id="group-label">Budget group</FieldLabel>
            <ListPicker<CategoryGroup>
              title="Budget group"
              labelId="group-label"
              value={group}
              options={EXPENSE_GROUPS.map((g) => ({ value: g.id, label: g.label }))}
              onChange={setGroup}
            />
          </Field>
        )}

        {error && <FormError role="alert">{error}</FormError>}

        <FormActions>
          <Button type="button" variant="outline" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="lg" disabled={!name.trim() || saving}>
            {isEditing ? 'Save changes' : `Create ${kind === 'source' ? 'source' : 'category'}`}
          </Button>
        </FormActions>
      </form>
    </Modal>
  )
}

export default ItemFormModal
