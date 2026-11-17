import { useState } from 'react'
import Modal from '../Modal'
import DatePicker from '../DatePicker'
import { Button } from '@/components/ui/button'

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
      <div className="form-field">
        <span className="form-field__label">From</span>
        <DatePicker value={from} onChange={setFrom} />
      </div>
      <div className="form-field">
        <span className="form-field__label">To</span>
        <DatePicker value={to} onChange={setTo} />
      </div>
      {backwards && (
        <p className="form-error" role="alert">
          The start date must be on or before the end date.
        </p>
      )}
      <div className="modal-actions">
        <Button type="button" variant="outline" size="lg" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" size="lg" disabled={backwards} onClick={() => onApply({ from, to })}>
          Show these dates
        </Button>
      </div>
    </Modal>
  )
}

export default DateRangeModal
