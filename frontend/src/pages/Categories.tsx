import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Plus, Wallet } from 'lucide-react'
import { useApiFetch } from '../lib/api'
import type { Category, CategoryGroup, IncomeSource, PaySchedule } from '../lib/types'
import { currentSchedule, describeSchedule } from '../lib/paySchedules'
import { today } from '../lib/dates'
import PayScheduleModal from '../components/income/PayScheduleModal'
import Modal from '../components/Modal'
import ItemRow from '../components/ItemRow'
import ItemFormModal, { type ItemKind, type ItemValues } from '../components/ItemFormModal'
import DeleteModal from '../components/DeleteModal'
import PageHeader from '../components/PageHeader'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { groupTint } from '../lib/groupTints'
import { FormError } from '../components/form'

type TileId = CategoryGroup | 'SOURCES'

// The white box the items in a group are listed in
const itemList = 'mb-4 list-none rounded-[14px] bg-card px-2 py-1'

// Tints for the "What would you like to add?" choices
const CHOICE_TINT: Record<ItemKind, string> = {
  expense: groupTint.needs,
  income: groupTint.income,
  source: groupTint.savings,
}

const TILES: { id: TileId; label: string; emoji: string; hint: string; addLabel: string }[] = [
  {
    id: 'NEEDS',
    label: 'Needs',
    emoji: '🛒',
    hint: 'The essentials for everyday life.',
    addLabel: 'Add category to Needs',
  },
  {
    id: 'WANTS',
    label: 'Wants',
    emoji: '🛍️',
    hint: 'The fun stuff that makes life sweet.',
    addLabel: 'Add category to Wants',
  },
  {
    id: 'SAVINGS',
    label: 'Savings',
    emoji: '🐷',
    hint: 'Money set aside for later. Future you says thanks.',
    addLabel: 'Add category to Savings',
  },
  {
    id: 'DEBT',
    label: 'Debt',
    emoji: '💳',
    hint: 'Paying down what you owe.',
    addLabel: 'Add category to Debt',
  },
  {
    id: 'INVESTMENTS',
    label: 'Investments',
    emoji: '📈',
    hint: 'Growing your money over time.',
    addLabel: 'Add category to Investments',
  },
  {
    id: 'INCOME',
    label: 'Income',
    emoji: '🪙',
    hint: 'The kinds of money coming in.',
    addLabel: 'Add income category',
  },
  {
    id: 'SOURCES',
    label: 'Income Sources',
    emoji: '🏛️',
    hint: 'Who pays you, like an employer or client.',
    addLabel: 'Add income source',
  },
]

const ADD_CHOICES: { kind: ItemKind; emoji: string; title: string; hint: string }[] = [
  { kind: 'expense', emoji: '🛒', title: 'Expense category', hint: 'For your everyday spending' },
  { kind: 'income', emoji: '🪙', title: 'Income category', hint: 'For money coming in' },
  {
    kind: 'source',
    emoji: '🏛️',
    title: 'Income source',
    hint: 'Who pays you, like an employer or client',
  },
]

type Item = Category | IncomeSource

// Which popup is open on top (the group popup can stay open behind it)
type Popup =
  | { type: 'choose' }
  | { type: 'form'; kind: ItemKind; item?: Item; group?: CategoryGroup }
  | { type: 'delete'; kind: ItemKind; item: Item }
  | { type: 'schedule'; source: IncomeSource }

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
  // ?open=sources (e.g. from the Budgets page) opens the income sources popup
  const [params] = useSearchParams()
  const [openTile, setOpenTile] = useState<TileId | null>(
    params.get('open') === 'sources' ? 'SOURCES' : null,
  )
  const [showArchived, setShowArchived] = useState(false)
  const [popup, setPopup] = useState<Popup | null>(null)
  // Each income source's current pay, e.g. "$800.00 every 2 weeks", shown under its name
  const [payOf, setPayOf] = useState<Record<string, string>>({})
  const [scheduleVersion, setScheduleVersion] = useState(0)

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

  useEffect(() => {
    if (!sources) return
    let stale = false
    Promise.all(
      sources.map((s) =>
        apiFetch<PaySchedule[]>(`/api/income-sources/${s.id}/schedules`).then((list) => {
          const paying = currentSchedule(list, today())
          const text = paying ? describeSchedule(paying) : list.length > 0 ? 'Pay has ended' : ''
          return [s.id, text] as const
        }),
      ),
    )
      .then((entries) => !stale && setPayOf(Object.fromEntries(entries)))
      .catch(() => {}) // only a summary; the page works without it
    return () => {
      stale = true
    }
  }, [apiFetch, sources, scheduleVersion])

  if (!categories || !sources) {
    return loadError ? <FormError>{loadError}</FormError> : <p>Loading...</p>
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
        {...(kind === 'source' && {
          subtitle: payOf[item.id] || undefined,
          extraActions: [
            {
              label: 'Pay schedule',
              hint: 'What it pays and when',
              icon: Wallet,
              onSelect: () => setPopup({ type: 'schedule', source: item as IncomeSource }),
            },
          ],
        })}
      />
    )
  }

  return (
    <div>
      <PageHeader title="Categories">
        <Button type="button" onClick={() => setPopup({ type: 'choose' })}>
          <Plus size={18} /> Add
        </Button>
      </PageHeader>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] gap-4 max-[480px]:grid-cols-2 max-[480px]:gap-3">
        {TILES.map((t) => {
          const count = itemsFor(t.id).filter((i) => i.archivedAt === null).length
          const noun = t.id === 'SOURCES' ? 'source' : 'category'
          const plural = t.id === 'SOURCES' ? 'sources' : 'categories'
          return (
            <button
              key={t.id}
              type="button"
              className={cn(
                'group flex cursor-pointer flex-col items-center gap-1 rounded-[14px] border-none px-4 py-8 text-foreground transition-[transform,box-shadow] duration-200 hover:-translate-y-[3px] hover:shadow-xl hover:shadow-primary/10 max-[480px]:px-2 max-[480px]:py-6',
                groupTint[t.id.toLowerCase()],
              )}
              onClick={() => {
                setShowArchived(false)
                setOpenTile(t.id)
              }}
            >
              {/* A playful tilt on hover */}
              <span
                className="mb-3 grid size-[84px] place-items-center rounded-full bg-white/55 text-[40px] transition-transform duration-200 group-hover:scale-[1.08] group-hover:-rotate-8 max-[480px]:size-16 max-[480px]:text-[30px]"
                aria-hidden
              >
                {t.emoji}
              </span>
              <span className="font-heading text-2xl max-[480px]:text-center max-[480px]:text-[19px]">
                {t.label}
              </span>
              <span className="text-muted-foreground">
                {count} {count === 1 ? noun : plural}
              </span>
            </button>
          )
        })}
      </div>

      {tile && (
        <Modal variant="wide" title={tile.label} onClose={() => setOpenTile(null)}>
          <span
            className={cn(
              '-mt-1 mb-3 grid size-[72px] place-items-center rounded-[20px] text-[34px]',
              groupTint[tile.id.toLowerCase()],
            )}
            aria-hidden
          >
            {tile.emoji}
          </span>
          <p className="-mt-3 mb-6 text-muted-foreground">{tile.hint}</p>

          <p className="mb-2 text-sm text-muted-foreground">
            {tile.id === 'SOURCES' ? 'Sources' : 'Categories'} ({activeItems.length})
          </p>
          {activeItems.length > 0 ? (
            <ul className={itemList}>{activeItems.map(row)}</ul>
          ) : (
            <p className="mb-4 rounded-[14px] bg-card p-5 text-center text-muted-foreground">
              Nothing here yet. Add your first one below.
            </p>
          )}

          <button
            type="button"
            onClick={() => addFromTile(tile.id)}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[14px] border-none bg-accent p-4 text-foreground hover:bg-primary/15"
          >
            <Plus size={18} /> {tile.addLabel}
          </button>

          {archivedItems.length > 0 && (
            <div className="mt-6">
              <button
                type="button"
                className="mb-2 cursor-pointer border-none bg-transparent py-1 text-sm text-muted-foreground underline underline-offset-3"
                aria-expanded={showArchived}
                onClick={() => setShowArchived((s) => !s)}
              >
                {showArchived ? 'Hide' : 'Show'} archived ({archivedItems.length})
              </button>
              {showArchived && <ul className={itemList}>{archivedItems.map(row)}</ul>}
            </div>
          )}
        </Modal>
      )}

      {popup?.type === 'choose' && (
        <Modal title="Add" onClose={() => setPopup(null)}>
          <p className="-mt-2 mb-5 text-muted-foreground">What would you like to add?</p>
          <div className="flex flex-col gap-3">
            {ADD_CHOICES.map((choice) => (
              <button
                key={choice.kind}
                type="button"
                className={cn(
                  'flex cursor-pointer items-center gap-4 rounded-[14px] border-none p-[18px] text-left text-foreground transition-transform hover:translate-x-1',
                  CHOICE_TINT[choice.kind],
                )}
                onClick={() => setPopup({ type: 'form', kind: choice.kind })}
              >
                <span
                  className="grid size-[52px] shrink-0 place-items-center rounded-full bg-white/60 text-[26px]"
                  aria-hidden
                >
                  {choice.emoji}
                </span>
                <span>
                  <span className="block font-medium">{choice.title}</span>
                  <span className="block text-sm text-muted-foreground">{choice.hint}</span>
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

      {popup?.type === 'schedule' && (
        <PayScheduleModal
          source={popup.source}
          onClose={() => setPopup(null)}
          onChanged={() => setScheduleVersion((v) => v + 1)}
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
