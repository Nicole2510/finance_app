// Tailwind classes shared by the importer's steps

// A short grey paragraph under a step's heading
export const intro = 'mb-[18px] text-sm text-muted-foreground'

// "Step 2 of 4 · Match columns", under the popup title
export const stepLabel = '-mt-2.5 mb-3.5 text-[13px] text-muted-foreground'

// A warning in red text (e.g. "choose a date format")
export const warnText = 'text-[13px] text-destructive'

// Wide files scroll sideways inside this box instead of stretching the popup
export const tableWrap = 'mb-5 max-w-full overflow-x-auto rounded-[10px] border border-border'

// A compact table: small text, one line per cell, a line between rows
export const table =
  'border-collapse text-[13px] whitespace-nowrap [&_td]:px-3 [&_td]:py-2 [&_td]:text-left [&_th]:bg-card [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:text-foreground/80 [&_tbody_td]:border-t [&_tbody_td]:border-border'

// Two or three form fields side by side, wrapping on narrow screens
export const fieldGrid = 'grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-x-3.5'

// Money coming in
export const incomeText = 'text-(--green)'
