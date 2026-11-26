import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatMoney } from '../../lib/money'

type Props = {
  months: { month: string; spent: string }[] // oldest first; the last is this month
  budget: string // this month's total budget, shown as a grey bar beside its spending
}

const shortMonth = (month: string) =>
  new Date(`${month}-01T00:00:00`).toLocaleDateString('en-CA', { month: 'short' })

const fullMonth = (month: string) =>
  new Date(`${month}-01T00:00:00`).toLocaleDateString('en-CA', { month: 'long' })

// Short money for the axis: $950, $1.8k
function axisMoney(value: number) {
  if (value < 1000) return `$${value}`
  const thousands = (value / 1000).toFixed(1)
  return `$${thousands.endsWith('.0') ? thousands.slice(0, -2) : thousands}k`
}

// Spending for the last 6 months, with this month's budget beside its bar
function SpendingChart({ months, budget }: Props) {
  const last = months[months.length - 1]?.month
  const hasBudget = Number(budget) > 0
  const data = months.map((m) => ({
    label: shortMonth(m.month),
    spent: Number(m.spent),
    budget: m.month === last && hasBudget ? Number(budget) : null,
  }))

  return (
    <section className="flex flex-col rounded-[20px] border border-border bg-card p-7 max-sm:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold">Spending overview</h2>
        <span className="text-sm text-muted-foreground">Last 6 months</span>
      </div>
      <div className="mt-3 flex gap-5 text-sm text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-primary" aria-hidden /> Spent
        </span>
        {hasBudget && last && (
          <span className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-[#cfcbd8]" aria-hidden /> {fullMonth(last)}{' '}
            budget
          </span>
        )}
      </div>

      <div className="mt-4 min-h-[220px] flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={4} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 4" stroke="var(--line)" />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--slate)', fontSize: 13 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              width={48}
              tickFormatter={axisMoney}
              tick={{ fill: 'var(--slate)', fontSize: 12 }}
            />
            <Tooltip
              cursor={{ fill: 'var(--lavender)' }}
              formatter={(value, name) => [
                formatMoney(String(value)),
                name === 'spent' ? 'Spent' : 'Budget',
              ]}
              contentStyle={{
                borderRadius: 12,
                border: '1px solid var(--line)',
                boxShadow: '0 12px 32px -16px rgba(30, 27, 46, 0.25)',
              }}
            />
            <Bar dataKey="spent" fill="var(--violet)" radius={[6, 6, 0, 0]} maxBarSize={44} />
            <Bar dataKey="budget" fill="#cfcbd8" radius={[6, 6, 0, 0]} maxBarSize={44} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

export default SpendingChart
