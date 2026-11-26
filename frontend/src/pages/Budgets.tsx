import { lazy, Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useApiFetch } from '../lib/api'
import { useToast } from '../lib/toast'
import { DEFAULT_SPLIT, totals, type Split } from '../lib/budgets'
import { currentMonth, monthLabel, shiftMonth } from '../lib/dates'
import type { BudgetMonth, BudgetPlan as Plan } from '../lib/types'
import PageHeader from '../components/PageHeader'
import MonthSwitcher from '../components/transactions/MonthSwitcher'
import BudgetHero from '../components/budgets/BudgetHero'
import BudgetPlan from '../components/budgets/BudgetPlan'
import BudgetBreakdown from '../components/budgets/BudgetBreakdown'
import PlanFormModal from '../components/budgets/PlanFormModal'
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
  const [planResult, setPlanResult] = useState<{ month: string; plan: Plan | null } | null>(null)
  const [editingPlan, setEditingPlan] = useState(false)

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

  // The split this month uses (carried from an earlier month if needed)
  useEffect(() => {
    let stale = false
    apiFetch<{ plan: Plan | null }>(`/api/budgets/${month}/plan`)
      .then(({ plan }) => !stale && setPlanResult({ month, plan }))
      .catch(() => {}) // the breakdown is extra; the rest of the page still works
    return () => {
      stale = true
    }
  }, [apiFetch, month, version])

  const current = result?.month === month ? result : null
  const lines = current?.data?.categories
  const months = history?.month === month ? history.data.months : null
  const planLoaded = planResult?.month === month
  const plan = planLoaded ? planResult.plan : null
  // 50/30/20 until a split has been saved
  const split: Split = plan ?? DEFAULT_SPLIT

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

  // Saves the split from this month on; returns the problem, if any
  async function savePlan(values: Split) {
    try {
      await apiFetch(`/api/budgets/${month}/plan`, {
        method: 'PUT',
        body: JSON.stringify(values),
      })
    } catch (err) {
      return (err as Error).message
    }
    toast({ title: `Split saved from ${monthLabel(month)} on` })
    setVersion((v) => v + 1)
    return null
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
            <BudgetHero lines={lines} income={current.data!.income} />
            {months && (
              <Suspense fallback={null}>
                <SpendingChart months={months} budget={totals(lines).budgeted} />
              </Suspense>
            )}
          </div>
          {planLoaded && (
            <BudgetBreakdown
              split={split}
              income={current.data!.income}
              lines={lines}
              onEdit={() => setEditingPlan(true)}
            />
          )}
          <BudgetPlan lines={lines} onSave={saveBudget} />
          <p className="sr-only" aria-live="polite">
            Budgets for {monthLabel(month)}
          </p>
        </>
      )}

      {editingPlan && (
        <PlanFormModal
          month={month}
          split={split}
          from={plan?.from ?? null}
          onClose={() => setEditingPlan(false)}
          onSubmit={savePlan}
        />
      )}
    </div>
  )
}

export default Budgets
