import { useState, type KeyboardEvent, type ReactElement } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Popover, PopoverTrigger } from '@/components/ui/popover'
import PickerCard from './PickerCard'

export type ListOption<T extends string> = {
  value: T
  label: string
  group?: string // options with the same group are listed under one heading
}

type Props<T extends string> = {
  title: string // names the list for screen readers
  value: T
  options: ListOption<T>[]
  onChange: (value: T) => void
  placeholder?: string // shown when nothing matches the value
  labelId?: string // id of the visible label, for screen readers
  ariaLabel?: string // when there's no visible label
  size?: 'field' | 'small' // form-sized box, or a smaller one for tables
  className?: string // extra classes for the box
  trigger?: ReactElement // replaces the box entirely (e.g. an icon button)
}

// A box that opens a floating card with a list of choices (✓ on the current one).
// Up/Down move between choices; Enter picks; Escape or clicking outside closes.
function ListPicker<T extends string>({
  title,
  value,
  options,
  onChange,
  placeholder = 'Choose',
  labelId,
  ariaLabel,
  size = 'field',
  className,
  trigger,
}: Props<T>) {
  const [open, setOpen] = useState(false)
  const chosen = options.find((o) => o.value === value)

  // Up/Down step through the choices, wrapping at the ends
  function moveFocus(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const items = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="option"]')]
    const at = items.indexOf(document.activeElement as HTMLButtonElement)
    const next = e.key === 'ArrowDown' ? at + 1 : at - 1
    items[(next + items.length) % items.length]?.focus()
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            aria-labelledby={labelId}
            aria-label={labelId ? undefined : ariaLabel}
            className={cn(
              'flex w-full items-center justify-between gap-2 border border-border bg-card text-left outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15 data-[state=open]:border-primary',
              size === 'field'
                ? 'h-12 rounded-[14px] pr-3.5 pl-4 text-base'
                : 'h-9 rounded-[10px] pr-2.5 pl-3 text-sm',
              className,
            )}
          >
            <span className={cn('truncate', !chosen && 'text-muted-foreground')}>
              {chosen?.label ?? placeholder}
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          </button>
        )}
      </PopoverTrigger>

      <PickerCard
        className="min-w-64"
        // Start on the current choice, not the ✕
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          const card = e.currentTarget as HTMLElement
          const current =
            card.querySelector<HTMLElement>('[aria-selected="true"]') ??
            card.querySelector<HTMLElement>('[role="option"]')
          current?.focus()
        }}
      >
        <div role="listbox" aria-label={title} onKeyDown={moveFocus}>
          {options.map((o, i) => {
            // A group heading appears where the group changes, keeping the given order
            const heading =
              o.group !== undefined && o.group !== options[i - 1]?.group ? o.group : null
            const selected = o.value === value
            return (
              <div key={o.value}>
                {heading && (
                  <p className="px-4 pt-3 pb-1 text-xs font-medium tracking-[0.08em] text-muted-foreground uppercase">
                    {heading}
                  </p>
                )}
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(o.value)
                    setOpen(false)
                  }}
                  className="flex w-full items-center justify-between gap-4 rounded-xl px-4 py-3 text-left text-base outline-none hover:bg-muted/70 focus-visible:bg-muted/70"
                >
                  <span className="truncate">{o.label}</span>
                  {selected && <Check className="size-5 shrink-0" strokeWidth={2} aria-hidden />}
                </button>
              </div>
            )
          })}
        </div>
      </PickerCard>
    </Popover>
  )
}

export default ListPicker
