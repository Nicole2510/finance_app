import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { useApiFetch } from '../lib/api'
import type { Category, CategoryGroup, IncomeSource } from '../lib/types'
import Modal from '../components/Modal'
import ItemRow from '../components/ItemRow'
import ItemFormModal, { type ItemKind, type ItemValues } from '../components/ItemFormModal'
import DeleteModal from '../components/DeleteModal'
import PageHeader from '../components/PageHeader'
import './Page.css'
import './Categories.css'

type TileId = CategoryGroup | 'SOURCES'

const TILES: { id: TileId; label: string; emoji: string; hint: string; addLabel: string }[] = [
  { id: 'NEEDS', label: 'Needs', emoji: '🛒', hint: 'The essentials for everyday life.', addLabel: 'Add category to Needs' },
  { id: 'WANTS', label: 'Wants', emoji: '🛍️', hint: 'The fun stuff that makes life sweet.', addLabel: 'Add category to Wants' },
  { id: 'SAVINGS_DEBT', label: 'Savings & Debt', emoji: '🌿', hint: 'Future you says thanks.', addLabel: 'Add category to Savings & Debt' },
  { id: 'INCOME', label: 'Income', emoji: '🪙', hint: 'The kinds of money coming in.', addLabel: 'Add income category' },
  { id: 'SOURCES', label: 'Income Sources', emoji: '🏛️', hint: 'Who pays you, like an employer or client.', addLabel: 'Add income source' },
]

const ADD_CHOICES: { kind: ItemKind; emoji: string; title: string; hint: string }[] = [
  { kind: 'expense', emoji: '🛒', title: 'Expense category', hint: 'For your everyday spending' },
  { kind: 'income', emoji: '🪙', title: 'Income category', hint: 'For money coming in' },
  { kind: 'source', emoji: '🏛️', title: 'Income source', hint: 'Who pays you, like an employer or client' },
]

type Item = Category | IncomeSource

// Which popup is open on top (the group popup can stay open behind it)
type Popup =
  | { type: 'choose' }
  | { type: 'form'; kind: ItemKind; item?: Item; group?: CategoryGroup }
  | { type: 'delete'; kind: ItemKind; item: Item }

function kindOf(item: Item): ItemKind {
  if (!('group' in item)) return 'source'
  return item.group === 'INCOME' ? 'income' : 'expense'
}

// Categories overview: one tile per budget group, opening a centred popup
function Categories() {
  const apiFetch = useApiFetch()
  const [categories, setCategories] = useState<Category[] | null>(null)
  const [sources, setSources] = useState<IncomeSource[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [openTile, setOpenTile] = useState<TileId | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [popup, setPopup] = useState<Popup | null>(null)

  useEffect(() => {
    Promise.all([
      apiFetch<Category[]>('/api/categories?includeArchived=true'),
      apiFetch<IncomeSource[]>('/api/income-sources?includeArchived=true'),
    ])
      .then(([c, s]) => {
        setCategories(c)
        setSources(s)
      })
      .catch((err: Error) => setLoadError(err.message))
  }, [apiFetch])

  if (!categories || !sources) {
    return loadError ? <p className="form-error">{loadError}</p> : <p>Loading...</p>
  }

  function itemsFor(tile: TileId): Item[] {
    const items = tile === 'SOURCES' ? sources! : categories!.filter((c) => c.group === tile)
    return [...items].sort((a, b) => a.name.localeCompare(b.name))
  }

  const urlFor = (kind: ItemKind) => (kind === 'source' ? '/api/income-sources' : '/api/categories')

  // Replaces (or adds) an item in the right list after the server confirms
  function store(kind: ItemKind, saved: Item) {
    if (kind === 'source') {
      setSources((list) => [...list!.filter((s) => s.id !== saved.id), saved as IncomeSource])
    } else {
      setCategories((list) => [...list!.filter((c) => c.id !== saved.id), saved as Category])
    }
  }

  async function save(kind: ItemKind, values: ItemValues, item?: Item) {
    try {
      const saved = await apiFetch<Item>(item ? `${urlFor(kind)}/${item.id}` : urlFor(kind), {
        method: item ? 'PATCH' : 'POST',
        body: JSON.stringify(values),
      })
      store(kind, saved)
      return null
    } catch (err) {
      return (err as Error).message
    }
  }

  async function setArchived(kind: ItemKind, item: Item, archived: boolean) {
    const saved = await apiFetch<Item>(`${urlFor(kind)}/${item.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ archived }),
    })
    store(kind, saved)
  }

  async function remove(kind: ItemKind, item: Item) {
    try {
      await apiFetch(`${urlFor(kind)}/${item.id}`, { method: 'DELETE' })
      if (kind === 'source') setSources((list) => list!.filter((s) => s.id !== item.id))
      else setCategories((list) => list!.filter((c) => c.id !== item.id))
      return null
    } catch (err) {
      return (err as Error).message
    }
  }

  const tile = TILES.find((t) => t.id === openTile)
  const panelItems = openTile ? itemsFor(openTile) : []
  const activeItems = panelItems.filter((i) => i.archivedAt === null)
  const archivedItems = panelItems.filter((i) => i.archivedAt !== null)

  function addFromTile(id: TileId) {
    if (id === 'SOURCES') setPopup({ type: 'form', kind: 'source' })
    else if (id === 'INCOME') setPopup({ type: 'form', kind: 'income' })
    else setPopup({ type: 'form', kind: 'expense', group: id })
  }

  function row(item: Item) {
    const kind = kindOf(item)
    return (
      <ItemRow
        key={item.id}
        item={item}
        onEdit={() => setPopup({ type: 'form', kind, item })}
        onToggleArchive={() => setArchived(kind, item, item.archivedAt === null)}
        onDelete={() => setPopup({ type: 'delete', kind, item })}
      />
    )
  }

  return (
    <div className="page categories">
      <PageHeader title="Categories">
        <button type="button" className="btn btn--primary categories__add" onClick={() => setPopup({ type: 'choose' })}>
          <Plus size={18} /> Add
        </button>
      </PageHeader>

      <div className="tiles">
        {TILES.map((t) => {
          const count = itemsFor(t.id).filter((i) => i.archivedAt === null).length
          const noun = t.id === 'SOURCES' ? 'source' : 'category'
          const plural = t.id === 'SOURCES' ? 'sources' : 'categories'
          return (
            <button
              key={t.id}
              type="button"
              className={`tile tile--${t.id.toLowerCase()}`}
              onClick={() => {
                setShowArchived(false)
                setOpenTile(t.id)
              }}
            >
              <span className="tile__icon" aria-hidden>
                {t.emoji}
              </span>
              <span className="tile__label">{t.label}</span>
              <span className="tile__count">
                {count} {count === 1 ? noun : plural}
              </span>
            </button>
          )
        })}
      </div>

      {tile && (
        <Modal variant="wide" title={tile.label} onClose={() => setOpenTile(null)}>
          <span className={`panel__icon tile--${tile.id.toLowerCase()}`} aria-hidden>
            {tile.emoji}
          </span>
          <p className="panel__hint">{tile.hint}</p>

          <p className="panel__section-label">
            {tile.id === 'SOURCES' ? 'Sources' : 'Categories'} ({activeItems.length})
          </p>
          {activeItems.length > 0 ? (
            <ul className="panel__list">{activeItems.map(row)}</ul>
          ) : (
            <p className="panel__empty">Nothing here yet. Add your first one below.</p>
          )}

          <button type="button" className="panel__add" onClick={() => addFromTile(tile.id)}>
            <Plus size={18} /> {tile.addLabel}
          </button>

          {archivedItems.length > 0 && (
            <div className="panel__archived">
              <button
                type="button"
                className="panel__archived-toggle"
                aria-expanded={showArchived}
                onClick={() => setShowArchived((s) => !s)}
              >
                {showArchived ? 'Hide' : 'Show'} archived ({archivedItems.length})
              </button>
              {showArchived && <ul className="panel__list">{archivedItems.map(row)}</ul>}
            </div>
          )}
        </Modal>
      )}

      {popup?.type === 'choose' && (
        <Modal title="Add" onClose={() => setPopup(null)}>
          <p className="choose__intro">What would you like to add?</p>
          <div className="choose__list">
            {ADD_CHOICES.map((choice) => (
              <button
                key={choice.kind}
                type="button"
                className={`choose__option choose__option--${choice.kind}`}
                onClick={() => setPopup({ type: 'form', kind: choice.kind })}
              >
                <span className="choose__emoji" aria-hidden>
                  {choice.emoji}
                </span>
                <span>
                  <span className="choose__title">{choice.title}</span>
                  <span className="choose__hint">{choice.hint}</span>
                </span>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {popup?.type === 'form' && (
        <ItemFormModal
          kind={popup.kind}
          initial={
            popup.item
              ? {
                  name: popup.item.name,
                  emoji: popup.item.emoji,
                  group: 'group' in popup.item ? popup.item.group : undefined,
                }
              : popup.group
                ? { name: '', emoji: null, group: popup.group }
                : undefined
          }
          isEditing={popup.item !== undefined}
          onClose={() => setPopup(null)}
          onSubmit={(values) => save(popup.kind, values, popup.item)}
        />
      )}

      {popup?.type === 'delete' && (
        <DeleteModal
          name={popup.item.name}
          kindLabel={popup.kind === 'source' ? 'income source' : 'category'}
          onClose={() => setPopup(null)}
          onDelete={() => remove(popup.kind, popup.item)}
          onArchive={() => setArchived(popup.kind, popup.item, true)}
        />
      )}
    </div>
  )
}

export default Categories
