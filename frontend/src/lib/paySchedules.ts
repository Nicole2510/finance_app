import { formatDate } from './dates'
import { formatMoney } from './money'
import type { PayFrequency, PaySchedule } from './types'

// The "How often?" choices in the form, and what each one stores
export type PayChoice = 'weekly' | 'biweekly' | 'twice' | 'monthly' | 'once' | 'custom'

export const PAY_CHOICES: { value: PayChoice; label: string }[] = [
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'twice', label: 'Twice a month' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'once', label: 'One-time payment' },
  { value: 'custom', label: 'Custom' },
]

// Which choice a saved schedule matches (anything else is Custom)
export function choiceOf(s: PaySchedule): PayChoice {
  if (s.frequency === 'TWICE_A_MONTH') return 'twice'
  if (s.frequency === 'WEEKS' && s.interval === 1) return 'weekly'
  if (s.frequency === 'WEEKS' && s.interval === 2) return 'biweekly'
  if (s.frequency === 'MONTHS' && s.interval === 1) {
    return s.endsOn === s.startsOn ? 'once' : 'monthly'
  }
  return 'custom'
}

// "1st", "2nd", "23rd"; 31 is the last day of the month
export function dayLabel(day: number) {
  if (day === 31) return 'last day'
  const tens = day % 100
  const suffix =
    tens >= 11 && tens <= 13
      ? 'th'
      : (({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[day % 10] ?? 'th')
  return `${day}${suffix}`
}

function every(n: number, unit: string) {
  return n === 1 ? `every ${unit}` : `every ${n} ${unit}s`
}

// "$800.00 every 2 weeks", "$850.00 twice a month (15th & last day)", "$500.00 one-time"
export function describeSchedule(s: PaySchedule) {
  const amount = formatMoney(s.amount)
  switch (choiceOf(s)) {
    case 'once':
      return `${amount} one-time`
    case 'twice':
      return `${amount} twice a month (${dayLabel(s.dayOne!)} & ${dayLabel(s.dayTwo!)})`
    case 'weekly':
      return `${amount} every week`
    case 'monthly':
      return `${amount} every month`
    default:
      return `${amount} ${every(s.interval!, s.frequency === 'WEEKS' ? 'week' : 'month')}`
  }
}

// "From Nov 7, 2026 · ongoing", "Jan 2 – Feb 12, 2026", "On Dec 18, 2026"
export function periodLabel(s: PaySchedule) {
  if (s.endsOn === s.startsOn) return `On ${formatDate(s.startsOn)}`
  if (s.endsOn) return `${formatDate(s.startsOn)} – ${formatDate(s.endsOn)}`
  return `From ${formatDate(s.startsOn)} · ongoing`
}

// The schedule paying now: the latest one started by `today` that hasn't
// ended. If none has started yet, the next one to start.
export function currentSchedule(schedules: PaySchedule[], today: string) {
  const started = schedules
    .filter((s) => s.startsOn <= today)
    .sort((a, b) => b.startsOn.localeCompare(a.startsOn))[0]
  if (started && (started.endsOn === null || started.endsOn >= today)) return started
  return schedules
    .filter((s) => s.startsOn > today)
    .sort((a, b) => a.startsOn.localeCompare(b.startsOn))[0]
}

// What the form sends to the server for a choice
export function scheduleFields(
  choice: PayChoice,
  custom: { every: number; unit: 'WEEKS' | 'MONTHS' },
): { frequency: PayFrequency; interval: number | null } {
  switch (choice) {
    case 'weekly':
      return { frequency: 'WEEKS', interval: 1 }
    case 'biweekly':
      return { frequency: 'WEEKS', interval: 2 }
    case 'twice':
      return { frequency: 'TWICE_A_MONTH', interval: null }
    case 'monthly':
    case 'once':
      return { frequency: 'MONTHS', interval: 1 }
    default:
      return { frequency: custom.unit, interval: custom.every }
  }
}
