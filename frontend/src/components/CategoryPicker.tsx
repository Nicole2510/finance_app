import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Popover, PopoverTrigger } from '@/components/ui/popover'
import PickerCard from './PickerCard'
import { categoryGroups, GROUP_ORDER } from '../lib/categoryGroups'
import type { Category } from '../lib/types'

type Props = {
  categories: Category[]
  value: string
  onChange: (id: string) => void
  labelId?: string // the id of the visible label, for screen readers
}

// The category box: opens a floating card of category chips, grouped
function CategoryPicker({ categories, value, onChange, labelId }: Props) {
  const [open, setOpen] = useState(false)
  const chosen = categories.find((c) => c.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-labelledby={labelId}
          className="flex h-12 w-full items-center justify-between gap-2 rounded-[14px] border border-border bg-card pr-3.5 pl-4 text-left text-base outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15 data-[state=open]:border-primary"
        >
          <span className={cn('truncate', !chosen && 'text-muted-foreground')}>
            {chosen
              ? `${chosen.emoji ? `${chosen.emoji} ` : ''}${chosen.name}`
              : 'Choose a category'}
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </PopoverTrigger>

      <PickerCard className="min-w-80 rounded-3xl py-5">
        <div className="px-3">
          {GROUP_ORDER.map((group) => {
            const inGroup = categories.filter((c) => c.group === group)
            if (inGroup.length === 0) return null
            return (
              <section key={group} className="pt-4 first:pt-0">
                <h4 className="mb-2 text-xs font-medium tracking-[0.08em] text-muted-foreground uppercase">
                  {categoryGroups[group].label}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {inGroup.map((c) => {
                    const selected = c.id === value
                    return (
                      <button
                        key={c.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => {
                          onChange(c.id)
                          setOpen(false)
                        }}
                        className={cn(
                          'rounded-full border px-3.5 py-1.5 text-sm transition-colors',
                          selected
                            ? 'border-primary bg-accent font-medium text-primary'
                            : 'border-border bg-card hover:border-primary/40 hover:bg-muted',
                        )}
                      >
                        {c.emoji ? `${c.emoji} ` : ''}
                        {c.name}
                      </button>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      </PickerCard>
    </Popover>
  )
}

export default CategoryPicker
