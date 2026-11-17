import type { Account, Category, CategoryGroup } from '../../lib/types'
import { categoriesFor } from '../../lib/categories'
import { categoryGroups, GROUP_ORDER } from '../../lib/categoryGroups'
import EmojiPicker from '../EmojiPicker'
import { cleanName, emojiOf, type CategoryChoice, type NameToMatch } from '../../lib/import/names'
import ListPicker from '../ListPicker'

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
    <div className="name-matcher">
      <h3 className="name-matcher__heading">Accounts</h3>
      <ul className="name-matcher__list">
        {accountsInFile.map(({ name, count }) => (
          <li key={name} className="name-matcher__row">
            <span className="name-matcher__name">
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

      <h3 className="name-matcher__heading">
        Categories
        <span className={waiting ? 'name-matcher__waiting' : 'name-matcher__done'}>
          {waiting ? `${waiting} of ${names.length} need a choice` : 'All matched'}
        </span>
      </h3>
      <ul className="name-matcher__list">
        {ordered.map((name) => {
          const choice = categoryChoices[name.key] ?? null
          const options = categoriesFor(name.type, categories)
          return (
            <li key={name.key} className={`name-matcher__row${choice ? '' : ' is-waiting'}`}>
              <span className="name-matcher__name">
                {name.label}
                <small>
                  {name.type === 'INCOME' ? 'Money in' : 'Spending'} · {plural(name.count)}
                  {choice?.kind === 'skip' && ` · ${choice.reason}`}
                </small>
              </span>
              <div className="name-matcher__choice">
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
                  <div className="name-matcher__new">
                    <EmojiPicker
                      value={choice.emoji}
                      suggestions={name.type === 'INCOME' ? INCOME_EMOJI : SPENDING_EMOJI}
                      onChange={(emoji) => onCategoryChange(name.key, { ...choice, emoji })}
                    />
                    <input
                      className="form-input"
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
