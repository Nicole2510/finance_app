import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useApiFetch } from '../lib/api'
import { currentMonth, monthLabel } from '../lib/dates'
import type { BudgetMonth } from '../lib/types'
import PageHeader from '../components/PageHeader'
import MonthSwitcher from '../components/transactions/MonthSwitcher'
import BudgetHero from '../components/budgets/BudgetHero'
import BudgetPlan from '../components/budgets/BudgetPlan'
import { FormError } from '../components/form'

// Monthly budgets: what's planned and spent per category, grouped
function Budgets() {
  const apiFetch = useApiFetch()
  // The month lives in the URL (?month=2026-11), like on Transactions
  const [params, setParams] = useSearchParams()
  const month = params.get('month') ?? currentMonth()
  // The answer is stored with the month it's for, success or error
  const [result, setResult] = useState<{
    month: string
    data?: BudgetMonth
    error?: string
  } | null>(null)

  useEffect(() => {
    // If the month changes before this answer arrives, ignore it
    let stale = false
    apiFetch<BudgetMonth>(`/api/budgets/${month}`)
      .then((data) => !stale && setResult({ month, data }))
      .catch((err: Error) => !stale && setResult({ month, error: err.message }))
    return () => {
      stale = true
    }
  }, [apiFetch, month])

  const current = result?.month === month ? result : null
  const lines = current?.data?.categories

  return (
    <div>
      <PageHeader title="Budgets" />

      <div className="mb-5">
        <MonthSwitcher month={month} onChange={(m) => setParams({ month: m })} />
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
          <BudgetHero lines={lines} />
          <BudgetPlan lines={lines} />
          <p className="sr-only" aria-live="polite">
            Budgets for {monthLabel(month)}
          </p>
        </>
      )}
    </div>
  )
}

export default Budgets
