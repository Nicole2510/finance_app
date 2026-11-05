// Formats a "YYYY-MM-DD" date for display: "Oct 1, 2026".
// Built from its parts so time zones can't shift it to the day before.
export function formatDate(key: string) {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-CA', { dateStyle: 'medium' })
}
