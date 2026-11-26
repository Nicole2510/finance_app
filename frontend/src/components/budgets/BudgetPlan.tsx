import { useState } from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PLAN_TABS, planOrder, progress } from '../../lib/budgets'
import { categoryGroups } from '../../lib/categoryGroups'
import { formatMoney } from '../../lib/money'
import type { BudgetLine } from '../../lib/types'
import ProgressBar from './ProgressBar'
import BudgetAmount from './BudgetAmount'

// Money cells line up on the right; phones hide the detail columns and show a
// compact summary under the category name instead
const num = 'px-5 py-4 text-right tabular-nums whitespace-nowrap max-[720px]:px-3'
const wideOnly = 'max-[720px]:hidden'

// Every category's plan for the month: tabs by group, a search, and a table
type Props = {
  lines: BudgetLine[]
  onSave: (categoryId: string, amount: string | null) => Promise<void>
}

function BudgetPlan({ lines, onSave }: Props) {
  const [tab, setTab] = useState(PLAN_TABS[0].id)
  const [search, setSearch] = useState('')

  const groups = PLAN_TABS.find((t) => t.id === tab)?.groups
  const query = search.trim().toLowerCase()
  const shown = lines
    .filter((l) => !groups || groups.includes(l.group))
    .filter((l) => l.name.toLowerCase().includes(query))
    .sort(planOrder)

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Category plan</h2>
        <label className="flex w-72 items-center gap-2.5 rounded-[14px] border border-border bg-card px-3.5 text-muted-foreground focus-within:border-primary focus-within:ring-3 focus-within:ring-primary/15 max-sm:w-full">
          <Search size={18} aria-hidden />
          <input
            type="search"
            value={search}
            placeholder="Search categories"
            aria-label="Search categories"
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-0 flex-1 border-none bg-transparent py-2.5 text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
      </div>

      <div className="mb-4 flex flex-wrap gap-1" role="tablist" aria-label="Category groups">
        {PLAN_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'cursor-pointer rounded-[12px] border-none bg-transparent px-4 py-2 text-[15px] text-foreground/80 hover:bg-muted',
              tab === t.id && 'bg-accent font-medium text-foreground shadow-sm hover:bg-accent',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-[20px] border border-border bg-card">
        <table className="w-full border-collapse">
          <thead className="bg-muted/50 text-sm text-muted-foreground">
            <tr>
              <th scope="col" className="px-5 py-3.5 text-left font-medium max-[720px]:px-3">
                Category
              </th>
              <th scope="col" className={cn(num, wideOnly, 'py-3.5 font-medium')}>
                Budgeted
              </th>
              <th scope="col" className={cn(num, wideOnly, 'py-3.5 font-medium')}>
                Spent
              </th>
              <th scope="col" className={cn(wideOnly, 'px-5 py-3.5 text-left font-medium')}>
                Used
              </th>
              <th scope="col" className={cn(num, 'py-3.5 font-medium')}>
                Remaining
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map((line) => {
              const p = progress(line.spent, line.budget)
              return (
                <tr key={line.id} className="border-t border-border">
                  <td className="px-5 py-4 max-[720px]:px-3">
                    <p className="font-medium">
                      {line.name} {line.emoji}
                      {line.archived && (
                        <span className="ml-2 rounded-full bg-border px-2 py-0.5 text-xs font-normal text-foreground/80">
                          Archived
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {categoryGroups[line.group].label}
                    </p>
                    {/* Phones: spent of budget and the bar, under the name */}
                    <div className="mt-2 hidden max-[720px]:block">
                      <p className="flex items-center text-[13px] text-muted-foreground tabular-nums">
                        {formatMoney(line.spent)} of
                        <BudgetAmount
                          name={line.name}
                          budget={line.budget}
                          disabled={line.archived}
                          onSave={(amount) => onSave(line.id, amount)}
                          className="ml-0.5 px-1.5 py-0.5"
                        />
                      </p>
                      {p && <ProgressBar percent={p.bar} over={p.over} className="mt-1.5" />}
                    </div>
                  </td>
                  {/* Click to set or change; the button's padding is pulled back so
                      the numbers still line up on the right */}
                  <td className={cn(num, wideOnly, 'py-2.5 pr-2.5')}>
                    <BudgetAmount
                      name={line.name}
                      budget={line.budget}
                      disabled={line.archived}
                      onSave={(amount) => onSave(line.id, amount)}
                    />
                  </td>
                  <td className={cn(num, wideOnly)}>{formatMoney(line.spent)}</td>
                  <td className={cn(wideOnly, 'px-5 py-4')}>
                    {p && (
                      <div className="flex items-center gap-3">
                        <ProgressBar
                          percent={p.bar}
                          over={p.over}
                          className="w-40 shrink-0 max-[1000px]:w-24"
                        />
                        <span
                          className={cn(
                            'w-12 text-sm tabular-nums',
                            p.over ? 'text-destructive' : 'text-muted-foreground',
                          )}
                        >
                          {p.used}%
                        </span>
                      </div>
                    )}
                  </td>
                  <td className={cn(num, p?.over ? 'text-destructive' : 'text-muted-foreground')}>
                    {p ? formatMoney(p.remaining) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {shown.length === 0 && (
          <p className="border-t border-border px-6 py-10 text-center text-muted-foreground">
            No categories match.
          </p>
        )}
      </div>
    </section>
  )
}

export default BudgetPlan
