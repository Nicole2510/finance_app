import { ChevronLeft, ChevronRight } from 'lucide-react'
import { currentMonth, monthLabel, shiftMonth } from '../../lib/dates'

type Props = {
  month: string // "YYYY-MM"
  onChange: (month: string) => void
}

const arrow =
  'grid size-[34px] cursor-pointer place-items-center rounded-[10px] text-foreground/80 enabled:hover:bg-muted disabled:cursor-default disabled:text-border'

// ← October 2026 →  (can't go past the current month)
function MonthSwitcher({ month, onChange }: Props) {
  return (
    <div className="inline-flex items-center gap-1 rounded-[14px] border border-border bg-card p-1">
      <button
        type="button"
        className={arrow}
        aria-label="Previous month"
        onClick={() => onChange(shiftMonth(month, -1))}
      >
        <ChevronLeft size={18} />
      </button>
      <span className="min-w-[140px] text-center font-medium" aria-live="polite">
        {monthLabel(month)}
      </span>
      <button
        type="button"
        className={arrow}
        aria-label="Next month"
        disabled={month >= currentMonth()}
        onClick={() => onChange(shiftMonth(month, 1))}
      >
        <ChevronRight size={18} />
      </button>
    </div>
  )
}

export default MonthSwitcher
