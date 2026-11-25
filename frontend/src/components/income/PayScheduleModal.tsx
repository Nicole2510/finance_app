import { useEffect, useState } from 'react'
import { CalendarCheck, Pencil, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useApiFetch } from '../../lib/api'
import { today } from '../../lib/dates'
import { choiceOf, currentSchedule, describeSchedule, periodLabel } from '../../lib/paySchedules'
import type { IncomeSource, PaySchedule } from '../../lib/types'
import ActionsMenu from '../ActionsMenu'
import DatePicker from '../DatePicker'
import Modal from '../Modal'
import { FormActions, FormError } from '../form'
import ScheduleForm, { type ScheduleValues } from './ScheduleForm'

type Props = {
  source: IncomeSource
  onClose: () => void
  onChanged: () => void // a schedule was added, edited, ended or deleted
}

// What the popup is showing: the list, or one task on a schedule
type View =
  | { type: 'list' }
  | { type: 'form'; schedule?: PaySchedule }
  | { type: 'end'; schedule: PaySchedule }
  | { type: 'delete'; schedule: PaySchedule }

// An income source's pay schedules: what it pays and when, over time
function PayScheduleModal({ source, onClose, onChanged }: Props) {
  const apiFetch = useApiFetch()
  const url = `/api/income-sources/${source.id}/schedules`
  const [schedules, setSchedules] = useState<PaySchedule[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const [view, setView] = useState<View>({ type: 'list' })
  const [lastPayday, setLastPayday] = useState(today())
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    apiFetch<PaySchedule[]>(url)
      .then(setSchedules)
      .catch((err: Error) => setLoadError(err.message))
  }, [apiFetch, url, version])

  function show(next: View) {
    setError(null)
    setView(next)
  }

  // Runs a change, then goes back to the list; returns the problem, if any
  async function change(request: () => Promise<unknown>) {
    setBusy(true)
    try {
      await request()
    } catch (err) {
      setBusy(false)
      return (err as Error).message
    }
    setBusy(false)
    setVersion((v) => v + 1)
    onChanged()
    show({ type: 'list' })
    return null
  }

  function save(values: ScheduleValues, schedule?: PaySchedule) {
    return change(() =>
      apiFetch(schedule ? `${url}/${schedule.id}` : url, {
        method: schedule ? 'PATCH' : 'POST',
        body: JSON.stringify(values),
      }),
    )
  }

  async function endOrDelete(schedule: PaySchedule, ending: boolean) {
    const problem = await change(() =>
      apiFetch(`${url}/${schedule.id}`, {
        method: ending ? 'PATCH' : 'DELETE',
        ...(ending && { body: JSON.stringify({ endsOn: lastPayday }) }),
      }),
    )
    if (problem) setError(problem)
  }

  const title =
    view.type === 'form'
      ? view.schedule
        ? 'Edit pay schedule'
        : 'Add pay schedule'
      : view.type === 'end'
        ? 'End this pay'
        : view.type === 'delete'
          ? 'Delete this schedule?'
          : `${source.name} pay`

  const paying = schedules ? currentSchedule(schedules, today()) : undefined
  const newestFirst = [...(schedules ?? [])].sort((a, b) => b.startsOn.localeCompare(a.startsOn))

  return (
    <Modal title={title} onClose={onClose}>
      {view.type === 'form' && (
        <ScheduleForm
          schedule={view.schedule}
          onCancel={() => show({ type: 'list' })}
          onSubmit={(values) => save(values, view.schedule)}
        />
      )}

      {view.type === 'end' && (
        <>
          <p className="mb-5 text-muted-foreground">
            {describeSchedule(view.schedule)}. No paydays are expected after the last one.
          </p>
          <div className="mb-5 flex flex-col gap-2">
            <span className="text-sm font-medium">Last payday</span>
            <DatePicker value={lastPayday} min={view.schedule.startsOn} onChange={setLastPayday} />
          </div>
          {error && <FormError role="alert">{error}</FormError>}
          <FormActions>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => show({ type: 'list' })}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="lg"
              disabled={busy}
              onClick={() => endOrDelete(view.schedule, true)}
            >
              End pay
            </Button>
          </FormActions>
        </>
      )}

      {view.type === 'delete' && (
        <>
          <p className="mb-5 text-muted-foreground">
            {describeSchedule(view.schedule)} · {periodLabel(view.schedule)}. Its paydays stop
            counting towards expected income, including in past months. To keep past months as they
            were, end it instead.
          </p>
          {error && <FormError role="alert">{error}</FormError>}
          <FormActions>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => show({ type: 'list' })}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="lg"
              disabled={busy}
              onClick={() => endOrDelete(view.schedule, false)}
            >
              Delete
            </Button>
          </FormActions>
        </>
      )}

      {view.type === 'list' && (
        <>
          <p className="mb-5 text-muted-foreground">
            What {source.name} pays and when. Budgets uses this to work out your expected income.
          </p>

          {loadError ? (
            <FormError>{loadError}</FormError>
          ) : !schedules ? (
            <p>Loading...</p>
          ) : schedules.length === 0 ? (
            <p className="mb-4 rounded-[14px] bg-card p-5 text-center text-muted-foreground">
              No pay schedule yet.
            </p>
          ) : (
            <ul className="mb-4 list-none rounded-[14px] bg-card px-2 py-1">
              {newestFirst.map((s) => {
                const ended = s.endsOn !== null
                return (
                  <li
                    key={s.id}
                    className="flex items-center gap-3 border-b border-border px-2 py-3 last:border-b-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn('font-medium', ended && s !== paying && 'text-foreground/70')}
                      >
                        {describeSchedule(s)}
                        {s === paying && (
                          <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-primary">
                            {s.startsOn > today() ? 'Starts soon' : 'Paying now'}
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">{periodLabel(s)}</p>
                    </div>
                    <ActionsMenu
                      label={`Actions for ${describeSchedule(s)}`}
                      actions={[
                        {
                          label: 'Edit',
                          hint: 'Fix the amount, days or dates',
                          icon: Pencil,
                          onSelect: () => show({ type: 'form', schedule: s }),
                        },
                        ...(!ended && choiceOf(s) !== 'once'
                          ? [
                              {
                                label: 'End this pay',
                                hint: 'e.g. you left this job',
                                icon: CalendarCheck,
                                onSelect: () => {
                                  setLastPayday(today() < s.startsOn ? s.startsOn : today())
                                  show({ type: 'end', schedule: s })
                                },
                              },
                            ]
                          : []),
                        {
                          label: 'Delete',
                          hint: 'Only for one added by mistake',
                          icon: Trash2,
                          danger: true,
                          onSelect: () => show({ type: 'delete', schedule: s }),
                        },
                      ]}
                    />
                  </li>
                )
              })}
            </ul>
          )}

          <button
            type="button"
            onClick={() => show({ type: 'form' })}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[14px] border-none bg-accent p-4 text-foreground hover:bg-primary/15"
          >
            <Plus size={18} /> Add schedule
          </button>
          {schedules && schedules.length > 0 && (
            <p className="mt-2 text-center text-[13px] text-muted-foreground">
              Got a raise or a new pay frequency? Add a schedule from the first payday at the new
              rate.
            </p>
          )}
        </>
      )}
    </Modal>
  )
}

export default PayScheduleModal
