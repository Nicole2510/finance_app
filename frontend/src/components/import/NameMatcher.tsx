import type { Account, Category, CategoryGroup } from '../../lib/types'
import { categoriesFor } from '../../lib/categories'
import { categoryGroups, GROUP_ORDER } from '../../lib/categoryGroups'
import EmojiPicker from '../EmojiPicker'
import { cleanName, emojiOf, type CategoryChoice, type NameToMatch } from '../../lib/import/names'
import ListPicker from '../ListPicker'
import { Input } from '../form'
import { cn } from '@/lib/utils'

type Props = {
  names: NameToMatch[]
  accountsInFile: { name: string; count: number }[]
  categories: Category[]
  accounts: Account[]
  categoryChoices: Record<string, CategoryChoice | null>
  accountChoices: Record<string, string | null>
  onCategoryChange: (key: string, choice: CategoryChoice | null) => void
  onAccountChange: (name: string, accountId: string | null) => void
}

// A dropdown value stands for a choice: "cat:<id>", "skip" or "new"
function toValue(choice: CategoryChoice | null) {
  if (!choice) return ''
  return choice.kind === 'category' ? `cat:${choice.categoryId}` : choice.kind
}

// Quick picks in the emoji picker, like the Categories page offers
const SPENDING_EMOJI = ['🛒', '🍽️', '🏠', '🚗', '💡', '🛍️']
const INCOME_EMOJI = ['💼', '💰', '🪙', '🎁', '📈', '🧑‍💻']

const plural = (n: number) => `${n} ${n === 1 ? 'row' : 'rows'}`

const heading = 'mt-2 mb-2.5 flex items-baseline justify-between gap-3 text-base font-semibold'
const list = 'mb-5 list-none rounded-[10px] border border-border p-0'
// One name and its choice side by side (stacked on phones), lines between rows
const row =
  'grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] items-center gap-3 px-3.5 py-2.5 [&+&]:border-t [&+&]:border-border max-sm:grid-cols-1'
const nameCell =
  'flex min-w-0 flex-col font-medium wrap-anywhere [&_small]:text-[13px] [&_small]:font-normal [&_small]:text-muted-foreground'

// Step 3: match the file's accounts and categories to the person's own
function NameMatcher({
  names,
  accountsInFile,
  categories,
  accounts,
  categoryChoices,
  accountChoices,
  onCategoryChange,
  onAccountChange,
}: Props) {
  const active = accounts.filter((a) => a.archivedAt === null)
  // Names still needing a choice go first
  const ordered = [...names].sort(
    (a, b) => Number(Boolean(categoryChoices[a.key])) - Number(Boolean(categoryChoices[b.key])),
  )
  const waiting = names.filter((n) => !categoryChoices[n.key]).length

  function choose(name: NameToMatch, value: string) {
    if (value === '') onCategoryChange(name.key, null)
    else if (value === 'skip')
      onCategoryChange(name.key, { kind: 'skip', reason: 'You chose to skip these' })
    else if (value === 'new') {
      const group: CategoryGroup = name.type === 'INCOME' ? 'INCOME' : 'NEEDS'
      onCategoryChange(name.key, {
        kind: 'new',
        name: cleanName(name.label) || 'New category',
        group,
        emoji: emojiOf(name.label), // the file's own emoji, if it had one
      })
    } else onCategoryChange(name.key, { kind: 'category', categoryId: value.slice(4) })
  }

  return (
    <div>
      <h3 className={heading}>Accounts</h3>
      <ul className={list}>
        {accountsInFile.map(({ name, count }) => (
          <li key={name} className={row}>
            <span className={nameCell}>
              {name || 'All transactions in this file'}
              <small>{plural(count)}</small>
            </span>
            <ListPicker
              title="Account"
              ariaLabel={`Account for ${name || 'this file'}`}
              value={accountChoices[name] ?? ''}
              options={active.map((a) => ({ value: a.id, label: a.name }))}
              onChange={(id) => onAccountChange(name, id || null)}
              placeholder="Choose an account"
            />
          </li>
        ))}
      </ul>

      <h3 className={heading}>
        Categories
        <span
          className={cn('text-[13px] font-medium', waiting ? 'text-destructive' : 'text-(--green)')}
        >
          {waiting ? `${waiting} of ${names.length} need a choice` : 'All matched'}
        </span>
      </h3>
      <ul className={list}>
        {ordered.map((name) => {
          const choice = categoryChoices[name.key] ?? null
          const options = categoriesFor(name.type, categories)
          return (
            <li key={name.key} className={cn(row, !choice && 'bg-destructive/5')}>
              <span className={nameCell}>
                {name.label}
                <small>
                  {name.type === 'INCOME' ? 'Money in' : 'Spending'} · {plural(name.count)}
                  {choice?.kind === 'skip' && ` · ${choice.reason}`}
                </small>
              </span>
              <div className="flex flex-col gap-2">
                <ListPicker
                  title={name.label}
                  ariaLabel={`Category for ${name.label}`}
                  value={toValue(choice)}
                  options={[
                    { value: 'skip', label: "Skip: don't import these" },
                    ...GROUP_ORDER.flatMap((group) =>
                      options
                        .filter((c) => c.group === group)
                        .map((c) => ({
                          value: `cat:${c.id}`,
                          label: `${c.emoji ? `${c.emoji} ` : ''}${c.name}`,
                          group: categoryGroups[group].label,
                        })),
                    ),
                    { value: 'new', label: '+ New category…', group: 'Or' },
                  ]}
                  onChange={(value) => choose(name, value)}
                  placeholder="Choose a category"
                />

                {choice?.kind === 'new' && (
                  <div className="grid grid-cols-[1fr_auto] gap-2 [&>:first-child]:col-span-full">
                    <EmojiPicker
                      value={choice.emoji}
                      suggestions={name.type === 'INCOME' ? INCOME_EMOJI : SPENDING_EMOJI}
                      onChange={(emoji) => onCategoryChange(name.key, { ...choice, emoji })}
                    />
                    <Input
                      aria-label="New category name"
                      value={choice.name}
                      maxLength={40}
                      onChange={(e) =>
                        onCategoryChange(name.key, { ...choice, name: e.target.value })
                      }
                    />
                    {name.type === 'EXPENSE' && (
                      <ListPicker<CategoryGroup>
                        title="Budget group"
                        ariaLabel="Group for the new category"
                        className="min-w-40"
                        value={choice.group}
                        options={GROUP_ORDER.filter((g) => g !== 'INCOME').map((g) => ({
                          value: g,
                          label: categoryGroups[g].label,
                        }))}
                        onChange={(group) => onCategoryChange(name.key, { ...choice, group })}
                      />
                    )}
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default NameMatcher
