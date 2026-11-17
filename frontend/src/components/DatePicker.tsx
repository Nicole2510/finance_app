import { useLayoutEffect, useRef, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate } from '../lib/dates'
import { inputClasses } from '../lib/formStyles'
import { useDismiss } from '../lib/useDismiss'
import './DatePicker.css'

type Props = {
  value: string // "YYYY-MM-DD"
  onChange: (value: string) => void
  min?: string // earliest selectable day, "YYYY-MM-DD"
  max?: string // latest selectable day, "YYYY-MM-DD"
}

const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

const MONTHS = Array.from({ length: 12 }, (_, month) =>
  new Date(2000, month, 1).toLocaleDateString('en-CA', { month: 'long' }),
)

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

// The nearest parent that scrolls (e.g. a popup's content), if any
function scrollParent(el: HTMLElement | null) {
  for (let node = el?.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node)
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight)
      return node
  }
  return null
}

// A date field that drops down a calendar. Clicking a day picks it and closes the
// calendar; Escape or clicking outside close it and leave the date as it was.
function DatePicker({ value, onChange, min, max }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const fieldRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => parse(value)) // which month is showing
  useDismiss(ref, open, () => setOpen(false))

  // The calendar floats (position: fixed) so it never stretches the form.
  // It always drops down below the field, with a little pointer aimed at it.
  // If there's no room below, the form scrolls up first to make room; on a
  // very short screen it sits as low as it can and hides the pointer, so the
  // pointer never aims at a different field. It's placed by setting its style
  // directly: this is measuring the page, not app data, so it doesn't need
  // React state. Runs again on scroll and resize.
  useLayoutEffect(() => {
    if (!open) return
    const gap = 12
    const edge = 8 // keep this far from the window's edges

    function place() {
      const field = fieldRef.current?.getBoundingClientRect()
      const panel = panelRef.current
      if (!field || !panel) return

      const below = field.bottom + gap
      const top = Math.max(edge, Math.min(below, window.innerHeight - edge - panel.offsetHeight))
      const left = Math.max(
        edge,
        Math.min(field.left, window.innerWidth - panel.offsetWidth - edge),
      )

      panel.style.top = `${top}px`
      panel.style.left = `${left}px`
      panel.style.setProperty('--pointer-x', `${field.left + 28 - left}px`)
      panel.classList.toggle('no-pointer', top !== below)
    }

    // On opening only (not while you scroll), make room below if needed
    const field = fieldRef.current
    const panel = panelRef.current
    if (field && panel) {
      const short =
        field.getBoundingClientRect().bottom +
        gap +
        panel.offsetHeight -
        (window.innerHeight - edge)
      const scroller = scrollParent(field)
      if (short > 0 && scroller) scroller.scrollTop += short
    }

    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true) // true: also when the modal scrolls
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  const today = new Date()
  const minDate = min ? parse(min) : null
  const maxDate = max ? parse(max) : null
  // Years to offer: from the earliest allowed (or 20 years back) to the latest
  const firstYear = Math.min(minDate?.year ?? today.getFullYear() - 20, view.year)
  const lastYear = Math.max(maxDate?.year ?? today.getFullYear() + 1, view.year)
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, i) => lastYear - i)

  const monthAllowed = (year: number, month: number) =>
    !(minDate && (year < minDate.year || (year === minDate.year && month < minDate.month))) &&
    !(maxDate && (year > maxDate.year || (year === maxDate.year && month > maxDate.month)))

  // Changing the year can land on a month that isn't allowed (e.g. a future one),
  // so move to the nearest allowed month
  function showYear(year: number) {
    let month = view.month
    if (maxDate && year === maxDate.year) month = Math.min(month, maxDate.month)
    if (minDate && year === minDate.year) month = Math.max(month, minDate.month)
    setView({ year, month, day: 1 })
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
        ref={fieldRef}
        className={cn(inputClasses, 'date-picker__field')}
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
        <div ref={panelRef} className="date-picker__panel" role="group" aria-label="Choose a date">
          <div className="date-picker__header">
            <select
              className="date-picker__select"
              aria-label="Month"
              value={view.month}
              onChange={(e) => setView({ ...view, month: Number(e.target.value) })}
            >
              {MONTHS.map((name, month) => (
                <option key={name} value={month} disabled={!monthAllowed(view.year, month)}>
                  {name}
                </option>
              ))}
            </select>
            <select
              className="date-picker__select"
              aria-label="Year"
              value={view.year}
              onChange={(e) => showYear(Number(e.target.value))}
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
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
                disabled={(!!max && key > max) || (!!min && key < min)}
                onClick={() => pick(key)}
              >
                {String(day).padStart(2, '0')}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default DatePicker
