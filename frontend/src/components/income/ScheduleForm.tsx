import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { parseBudgetInput } from '../../lib/budgets'
import { today } from '../../lib/dates'
import {
  choiceOf,
  dayLabel,
  PAY_CHOICES,
  scheduleFields,
  type PayChoice,
} from '../../lib/paySchedules'
import type { PaySchedule } from '../../lib/types'
import DatePicker from '../DatePicker'
import ListPicker from '../ListPicker'
import { Field, FieldLabel, FormActions, FormError, Input } from '../form'

export type ScheduleValues = Omit<PaySchedule, 'id'>

type Props = {
  schedule?: PaySchedule // editing this one; otherwise adding
  onCancel: () => void
  onSubmit: (values: ScheduleValues) => Promise<string | null> // the problem, if any
}

// Days 1–30, then "Last day" (stored as 31, so it works in every month)
const DAYS = Array.from({ length: 31 }, (_, i) => ({
  value: String(i + 1),
  label: i + 1 === 31 ? 'Last day' : dayLabel(i + 1),
}))

// Add or edit one pay schedule: how much, how often, and from/until when
function ScheduleForm({ schedule, onCancel, onSubmit }: Props) {
  const [amount, setAmount] = useState(schedule?.amount ?? '')
  const [choice, setChoice] = useState<PayChoice>(schedule ? choiceOf(schedule) : 'biweekly')
  const [customEvery, setCustomEvery] = useState(String(schedule?.interval ?? 3))
  const [customUnit, setCustomUnit] = useState<'WEEKS' | 'MONTHS'>(
    schedule?.frequency === 'WEEKS' ? 'WEEKS' : 'MONTHS',
  )
  const [dayOne, setDayOne] = useState(String(schedule?.dayOne ?? 15))
  const [dayTwo, setDayTwo] = useState(String(schedule?.dayTwo ?? 31))
  const [startsOn, setStartsOn] = useState(schedule?.startsOn ?? today())
  const [ended, setEnded] = useState(schedule?.endsOn != null && choiceOf(schedule) !== 'once')
  const [endsOn, setEndsOn] = useState(schedule?.endsOn ?? startsOn)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const pay = parseBudgetInput(amount)
    if (!pay.ok || pay.amount === null) {
      setError('Enter the amount of each paycheque, like 800 or 812.50')
      return
    }
    const every = Number(customEvery)
    const max = customUnit === 'WEEKS' ? 52 : 12
    if (choice === 'custom' && !(Number.isInteger(every) && every >= 1 && every <= max)) {
      setError(`Choose every 1 to ${max} ${customUnit === 'WEEKS' ? 'weeks' : 'months'}`)
      return
    }
    if (ended && endsOn < startsOn) {
      setError("The last payday can't be before the first payday")
      return
    }

    setSaving(true)
    const problem = await onSubmit({
      amount: pay.amount,
      startsOn,
      // A one-time payment's first payday is also its last
      endsOn: choice === 'once' ? startsOn : ended ? endsOn : null,
      ...scheduleFields(choice, { every, unit: customUnit }),
      dayOne: choice === 'twice' ? Number(dayOne) : null,
      dayTwo: choice === 'twice' ? Number(dayTwo) : null,
    })
    setSaving(false)
    if (problem) setError(problem)
  }

  return (
    <form onSubmit={submit}>
      <Field>
        <FieldLabel>Amount per paycheque</FieldLabel>
        <Input
          value={amount}
          inputMode="decimal"
          placeholder="0.00"
          autoFocus
          onChange={(e) => setAmount(e.target.value)}
        />
      </Field>

      <Field as="div">
        <FieldLabel id="pay-how-often">How often</FieldLabel>
        <ListPicker
          title="How often"
          labelId="pay-how-often"
          value={choice}
          options={PAY_CHOICES}
          onChange={setChoice}
        />
      </Field>

      {choice === 'custom' && (
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel>Every</FieldLabel>
            <Input
              value={customEvery}
              inputMode="numeric"
              onChange={(e) => setCustomEvery(e.target.value)}
            />
          </Field>
          <Field as="div">
            <FieldLabel id="pay-unit">&nbsp;</FieldLabel>
            <ListPicker<'WEEKS' | 'MONTHS'>
              title="Weeks or months"
              labelId="pay-unit"
              value={customUnit}
              options={[
                { value: 'WEEKS', label: 'weeks' },
                { value: 'MONTHS', label: 'months' },
              ]}
              onChange={setCustomUnit}
            />
          </Field>
        </div>
      )}

      {choice === 'twice' && (
        <div className="grid grid-cols-2 gap-3">
          <Field as="div">
            <FieldLabel id="pay-day-one">First payday</FieldLabel>
            <ListPicker
              title="First payday each month"
              labelId="pay-day-one"
              value={dayOne}
              options={DAYS}
              onChange={setDayOne}
            />
          </Field>
          <Field as="div">
            <FieldLabel id="pay-day-two">Second payday</FieldLabel>
            <ListPicker
              title="Second payday each month"
              labelId="pay-day-two"
              value={dayTwo}
              options={DAYS}
              onChange={setDayTwo}
            />
          </Field>
        </div>
      )}

      <Field as="div">
        <FieldLabel>{choice === 'once' ? 'Payday' : 'First payday at this amount'}</FieldLabel>
        <DatePicker value={startsOn} onChange={setStartsOn} />
        {choice !== 'once' && (
          <span className="text-[13px] text-muted-foreground">
            Got a raise or a new pay frequency? Add a new schedule from its first payday instead, so
            earlier months stay as they were.
          </span>
        )}
      </Field>

      {choice !== 'once' && (
        <div className="mb-5">
          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={ended}
              onChange={(e) => {
                setEnded(e.target.checked)
                if (e.target.checked && endsOn < startsOn) setEndsOn(startsOn)
              }}
              className="size-[17px] cursor-pointer accent-primary"
            />
            This pay has ended (e.g. you left this job)
          </label>
          {ended && (
            <div className="mt-3 flex flex-col gap-2">
              <span className="text-sm font-medium">Last payday</span>
              <DatePicker value={endsOn} min={startsOn} onChange={setEndsOn} />
            </div>
          )}
        </div>
      )}

      {error && <FormError role="alert">{error}</FormError>}

      <FormActions>
        <Button type="button" variant="outline" size="lg" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="lg" disabled={saving || !amount.trim()}>
          {schedule ? 'Save changes' : 'Add schedule'}
        </Button>
      </FormActions>
    </form>
  )
}

export default ScheduleForm
