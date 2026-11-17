import { ListFilter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { filterButtonClasses } from '../lib/formStyles'
import ListPicker from './ListPicker'

type Props<T extends string> = {
  label: string // what the button says to screen readers, and the list's name
  value: T
  options: { value: T; label: string }[] // the first one means "no filter"
  onChange: (value: T) => void
  className?: string // extra classes for the button, e.g. spacing
}

// A small filter icon that opens a list card. It turns dark while a filter is on.
function FilterSelect<T extends string>({ label, value, options, onChange, className }: Props<T>) {
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
          className={cn(filterButtonClasses(active), className)}
        >
          <ListFilter size={18} aria-hidden />
        </button>
      }
    />
  )
}

export default FilterSelect
