import { useState } from 'react'
import Modal from '../Modal'
import DatePicker from '../DatePicker'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel, FormActions, FormError } from '../form'

export type DateRange = { from: string; to: string }

type Props = {
  initial: DateRange
  onApply: (range: DateRange) => void
  onClose: () => void
}

// Choose a From and To day (both included) to see transactions across months
function DateRangeModal({ initial, onApply, onClose }: Props) {
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)
  // "YYYY-MM-DD" strings compare like dates
  const backwards = from > to

  return (
    <Modal title="Filter by dates" onClose={onClose}>
      <Field as="div">
        <FieldLabel>From</FieldLabel>
        <DatePicker value={from} onChange={setFrom} />
      </Field>
      <Field as="div">
        <FieldLabel>To</FieldLabel>
        <DatePicker value={to} onChange={setTo} />
      </Field>
      {backwards && (
        <FormError role="alert">The start date must be on or before the end date.</FormError>
      )}
      <FormActions>
        <Button type="button" variant="outline" size="lg" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" size="lg" disabled={backwards} onClick={() => onApply({ from, to })}>
          Show these dates
        </Button>
      </FormActions>
    </Modal>
  )
}

export default DateRangeModal
