import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useApiFetch } from '../lib/api'
import { useToast } from '../lib/toast'
import { currentMonth, monthLabel, shiftMonth } from '../lib/dates'
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
  // Bumped after every change, so the month loads again
  const [version, setVersion] = useState(0)
  const [copying, setCopying] = useState(false)
  const toast = useToast()
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
  }, [apiFetch, month, version])

  const current = result?.month === month ? result : null

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
  const lines = current?.data?.categories

  return (
    <div>
      <PageHeader title="Budgets">
        <Button
          type="button"
          variant="outline"
          disabled={!current?.data || copying}
          onClick={copyLastMonth}
        >
          <Copy size={18} /> Copy last month
        </Button>
      </PageHeader>

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
