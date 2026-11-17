import { ListFilter } from 'lucide-react'
import ListPicker from './ListPicker'
import './FilterSelect.css'

type Props<T extends string> = {
  label: string // what the button says to screen readers, and the card's title
  value: T
  options: { value: T; label: string }[] // the first one means "no filter"
  onChange: (value: T) => void
}

// A small filter icon that opens a list card. It turns dark while a filter is on.
function FilterSelect<T extends string>({ label, value, options, onChange }: Props<T>) {
  const active = value !== options[0]?.value

  return (
    <ListPicker
      title={label}
      value={value}
      options={options}
      onChange={onChange}
      trigger={
        <button
          type="button"
          aria-label={label}
          className={`filter-select${active ? ' is-active' : ''}`}
        >
          <ListFilter size={18} aria-hidden />
        </button>
      }
    />
  )
}

export default FilterSelect
