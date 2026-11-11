// Formats a "YYYY-MM-DD" date for display: "Oct 1, 2026".
// Built from its parts so time zones can't shift it to the day before.
export function formatDate(key: string) {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-CA', { dateStyle: 'medium' })
}

// How long ago a timestamp was, in calendar days: "today", "2 days ago"
export function daysAgo(timestamp: string) {
  const startOfDay = (date: Date) => new Date(date).setHours(0, 0, 0, 0)
  const then = new Date(timestamp)
  // Rounded because a day with a clock change isn't exactly 24 hours
  const days = Math.round((startOfDay(new Date()) - startOfDay(then)) / 86_400_000)

  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  return `on ${then.toLocaleDateString('en-CA', { dateStyle: 'medium' })}`
}
