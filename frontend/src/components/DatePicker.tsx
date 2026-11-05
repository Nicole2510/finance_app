import { useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, CalendarDays } from 'lucide-react'
import { formatDate } from '../lib/dates'
import { useDismiss } from '../lib/useDismiss'
import './DatePicker.css'

type Props = {
  value: string // "YYYY-MM-DD"
  onChange: (value: string) => void
  max?: string // latest selectable day, "YYYY-MM-DD"
}

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

// Dates are handled as "YYYY-MM-DD" strings and plain numbers, never through
// time zones, so a picked day can't shift by one
function toKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function parse(key: string) {
  const [y, m, d] = key.split('-').map(Number)
  return { year: y, month: m - 1, day: d }
}

// Every day shown for a month, Monday first, including greyed-out days from
// the months before and after so the grid is made of full weeks
function daysFor(year: number, month: number) {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7 // Mon = 0
  const total = Math.ceil((offset + new Date(year, month + 1, 0).getDate()) / 7) * 7
  return Array.from({ length: total }, (_, i) => {
    const date = new Date(year, month, i - offset + 1) // JS rolls over into nearby months
    return {
      key: toKey(date.getFullYear(), date.getMonth(), date.getDate()),
      day: date.getDate(),
      inMonth: date.getMonth() === month,
    }
  })
}

const monthTitle = (year: number, month: number) =>
  new Date(year, month, 1).toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })

// A date field that opens a Nayad-styled month calendar below it
function DatePicker({ value, onChange, max }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => parse(value)) // which month is showing
  useDismiss(ref, open, () => setOpen(false))

  const maxMonth = max ? parse(max) : null
  const atMaxMonth = maxMonth && view.year === maxMonth.year && view.month === maxMonth.month

  function shiftMonth(by: number) {
    const d = new Date(view.year, view.month + by, 1)
    setView({ year: d.getFullYear(), month: d.getMonth(), day: 1 })
  }

  function pick(key: string) {
    onChange(key)
    setOpen(false)
  }

  return (
    <div
      className="date-picker"
      ref={ref}
      // Escape closes just the calendar, not the modal it sits in
      onKeyDown={(e) => {
        if (open && e.key === 'Escape') {
          e.preventDefault()
          e.stopPropagation()
          setOpen(false)
        }
      }}
    >
      <button
        type="button"
        className="form-input date-picker__field"
        aria-expanded={open}
        onClick={() => {
          if (!open) setView(parse(value))
          setOpen(!open)
        }}
      >
        {formatDate(value)}
        <CalendarDays size={18} aria-hidden />
      </button>

      {open && (
        <div className="date-picker__panel" role="group" aria-label="Choose a date">
          <div className="date-picker__header">
            <span className="date-picker__title">{monthTitle(view.year, view.month)}</span>
            <button type="button" className="date-picker__nav" aria-label="Previous month" onClick={() => shiftMonth(-1)}>
              <ArrowLeft size={20} />
            </button>
            <button
              type="button"
              className="date-picker__nav"
              aria-label="Next month"
              disabled={!!atMaxMonth}
              onClick={() => shiftMonth(1)}
            >
              <ArrowRight size={20} />
            </button>
          </div>

          <div className="date-picker__grid">
            {WEEKDAYS.map((w) => (
              <span key={w} className="date-picker__weekday">
                {w}
              </span>
            ))}
            {daysFor(view.year, view.month).map(({ key, day, inMonth }) => (
              <button
                key={key}
                type="button"
                className={`date-picker__day${inMonth ? '' : ' is-outside'}${key === value ? ' is-selected' : ''}`}
                aria-label={formatDate(key)}
                aria-pressed={key === value}
                // String comparison works because "YYYY-MM-DD" sorts like a date
                disabled={!!max && key > max}
                onClick={() => pick(key)}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default DatePicker
