// The look of a text box, shared by <Input> and things that look like one
// (e.g. the date picker's field). Kept here, not in form.tsx, because a
// component file should only export components.
export const inputClasses =
  'rounded-[14px] border border-border bg-card px-4 py-3 text-base text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/15 disabled:opacity-50'
