// The look of a text box, shared by <Input> and things that look like one
// (e.g. the date picker's field). Kept here, not in form.tsx, because a
// component file should only export components.
export const inputClasses =
  'rounded-[14px] border border-border bg-card px-4 py-3 text-base text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/15 disabled:opacity-50'

// A square icon button in a filter bar (filter by type, by dates…).
// It turns dark while its filter is on.
export function filterButtonClasses(active: boolean) {
  return [
    'grid min-h-[42px] w-[46px] shrink-0 cursor-pointer place-items-center rounded-[10px] border-none outline-none focus-visible:ring-3 focus-visible:ring-primary/20',
    active ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground',
  ].join(' ')
}
