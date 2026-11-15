import { ChevronLeft, ChevronRight } from 'lucide-react'
import { currentMonth, monthLabel, shiftMonth } from '../../lib/dates'
import './MonthSwitcher.css'

type Props = {
  month: string // "YYYY-MM"
  onChange: (month: string) => void
}

// ← October 2026 →  (can't go past the current month)
function MonthSwitcher({ month, onChange }: Props) {
  return (
    <div className="month-switcher">
      <button
        type="button"
        className="month-switcher__arrow"
        aria-label="Previous month"
        onClick={() => onChange(shiftMonth(month, -1))}
      >
        <ChevronLeft size={18} />
      </button>
      <span className="month-switcher__label" aria-live="polite">
        {monthLabel(month)}
      </span>
      <button
        type="button"
        className="month-switcher__arrow"
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
