import { lazy, Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useApiFetch } from '../lib/api'
import { useToast } from '../lib/toast'
import { totals } from '../lib/budgets'
import { currentMonth, monthLabel, shiftMonth } from '../lib/dates'
import type { BudgetMonth } from '../lib/types'
import PageHeader from '../components/PageHeader'
import MonthSwitcher from '../components/transactions/MonthSwitcher'
import BudgetHero from '../components/budgets/BudgetHero'
import BudgetPlan from '../components/budgets/BudgetPlan'
import { FormError } from '../components/form'

// The chart library only downloads when Budgets is opened
const SpendingChart = lazy(() => import('../components/budgets/SpendingChart'))

type History = { months: { month: string; spent: string }[] }

// Monthly budgets: the month at a glance, spending over time, and the plan
function Budgets() {
  const apiFetch = useApiFetch()
  const toast = useToast()
  // The month lives in the URL (?month=2026-11), like on Transactions
  const [params, setParams] = useSearchParams()
  const month = params.get('month') ?? currentMonth()
  // Bumped after every change, so the month loads again
  const [version, setVersion] = useState(0)
  const [copying, setCopying] = useState(false)

  // Each answer is stored with the month it's for, so a slow answer for a
  // month you've already left can't show up on the wrong month
  const [result, setResult] = useState<{
    month: string
    data?: BudgetMonth
    error?: string
  } | null>(null)
  const [history, setHistory] = useState<{ month: string; data: History } | null>(null)

  useEffect(() => {
    // If the month changes before this answer arrives, ignore it
    let stale = false
    apiFetch<BudgetMonth>(`/api/budgets/${month}`)
      .then((data) => !stale && setResult({ month, data }))
      .catch((err: Error) => !stale && setResult({ month, error: err.message }))
    return () => {
      stale = true
    }
  }, [apiFetch, month, version])

  // Spending for the last 6 months, for the chart
  useEffect(() => {
    let stale = false
    apiFetch<History>(`/api/budgets/${month}/history`)
      .then((data) => !stale && setHistory({ month, data }))
      .catch(() => {}) // the chart is extra; the page works without it
    return () => {
      stale = true
    }
  }, [apiFetch, month])

  const current = result?.month === month ? result : null
  const lines = current?.data?.categories
  const months = history?.month === month ? history.data.months : null

  // Sets, changes or (amount null) removes one category's budget
  async function saveBudget(categoryId: string, amount: string | null) {
    try {
      await apiFetch(`/api/budgets/${month}/${categoryId}`, {
        method: amount === null ? 'DELETE' : 'PUT',
        ...(amount !== null && { body: JSON.stringify({ amount }) }),
      })
    } catch (err) {
      toast({ title: "Couldn't save that budget", message: (err as Error).message, tone: 'error' })
    }
    setVersion((v) => v + 1)
  }

  // Fills in last month's budgets, keeping any already set this month
  async function copyLastMonth() {
    const from = monthLabel(shiftMonth(month, -1))
    setCopying(true)
    try {
      const { copied } = await apiFetch<{ copied: number }>(`/api/budgets/${month}/copy-previous`, {
        method: 'POST',
      })
      toast(
        copied > 0
          ? { title: `Copied ${copied} ${copied === 1 ? 'budget' : 'budgets'} from ${from}` }
          : { title: `Nothing new to copy from ${from}`, tone: 'info' },
      )
      setVersion((v) => v + 1)
    } catch (err) {
      toast({ title: "Couldn't copy last month", message: (err as Error).message, tone: 'error' })
    }
    setCopying(false)
  }

  return (
    <div>
      <PageHeader title="Budgets" />

      {/* The month, and the action that fills it in */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <MonthSwitcher month={month} onChange={(m) => setParams({ month: m })} />
        <Button
          type="button"
          variant="outline"
          disabled={!current?.data || copying}
          onClick={copyLastMonth}
        >
          <Copy size={18} /> Copy last month
        </Button>
      </div>

      {current?.error ? (
        <FormError>{current.error}</FormError>
      ) : !lines ? (
        <p>Loading...</p>
      ) : lines.length === 0 ? (
        <p className="rounded-[14px] border border-dashed border-border px-6 py-10 text-center text-muted-foreground">
          No spending categories yet. Add some on the Categories page.
        </p>
      ) : (
        <>
          {/* The month's budget beside the spending chart; stacked when narrow */}
          <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-5 max-[1000px]:grid-cols-1">
            <BudgetHero lines={lines} />
            {months && (
              <Suspense fallback={null}>
                <SpendingChart months={months} budget={totals(lines).budgeted} />
              </Suspense>
            )}
          </div>
          <BudgetPlan lines={lines} onSave={saveBudget} />
          <p className="sr-only" aria-live="polite">
            Budgets for {monthLabel(month)}
          </p>
        </>
      )}
    </div>
  )
}

export default Budgets
