import { ListFilter } from 'lucide-react'
import './FilterSelect.css'

type Props<T extends string> = {
  label: string // what the button says to screen readers
  value: T
  options: { value: T; label: string }[] // the first one means "no filter"
  onChange: (value: T) => void
}

// A small filter icon that opens a list. It turns dark while a filter is on.
// An invisible <select> covers the icon, so clicking it opens the native list.
function FilterSelect<T extends string>({ label, value, options, onChange }: Props<T>) {
  const active = value !== options[0]?.value

  return (
    <label className={`filter-select${active ? ' is-active' : ''}`}>
      <ListFilter size={18} aria-hidden />
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export default FilterSelect
