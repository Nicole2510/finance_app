import type { AmountMapping, Mapping } from '../../lib/import/detect'
import { DATE_FORMATS, type DateFormat } from '../../lib/import/parse'

type Props = {
  headers: string[]
  mapping: Mapping
  ambiguousDates: boolean
  onChange: (mapping: Mapping) => void
}

// One dropdown per field, already set to what the app detected
function ColumnSelect({
  label,
  headers,
  value,
  optional = false,
  onChange,
}: {
  label: string
  headers: string[]
  value: number | null
  optional?: boolean
  onChange: (value: number | null) => void
}) {
  return (
    <label className="form-field">
      <span className="form-field__label">{label}</span>
      <select
        className="form-input form-select"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      >
        <option value="">{optional ? 'None' : 'Choose a column'}</option>
        {headers.map((heading, c) => (
          <option key={c} value={c}>
            {heading || `Column ${c + 1}`}
          </option>
        ))}
      </select>
    </label>
  )
}

const STYLES: { id: AmountMapping['style']; label: string }[] = [
  { id: 'signed', label: 'One column, with − for one direction' },
  { id: 'split', label: 'Separate money out and money in columns' },
  { id: 'typed', label: 'An amount, plus a column saying income or expense' },
]

// Step 2: which column is which. Starts filled in; the person confirms or fixes it.
function ColumnMatcher({ headers, mapping, ambiguousDates, onChange }: Props) {
  const set = (changes: Partial<Mapping>) => onChange({ ...mapping, ...changes })
  const amount = mapping.amount

  // Switching style keeps the amount column where it makes sense
  function changeStyle(style: AmountMapping['style']) {
    const first = amount?.style === 'split' ? amount.debit : (amount?.column ?? 0)
    if (style === 'signed') set({ amount: { style, column: first, negativeIs: 'EXPENSE' } })
    if (style === 'split') set({ amount: { style, debit: first, credit: first } })
    if (style === 'typed') set({ amount: { style, column: first, typeColumn: first } })
  }

  return (
    <div className="column-matcher">
      <div className="column-matcher__grid">
        <ColumnSelect
          label="Date"
          headers={headers}
          value={mapping.date}
          onChange={(date) => set({ date })}
        />
        <label className="form-field">
          <span className="form-field__label">Dates are written like</span>
          <select
            className="form-input form-select"
            value={mapping.dateFormat ?? ''}
            onChange={(e) => set({ dateFormat: (e.target.value || null) as DateFormat | null })}
          >
            <option value="">Choose a format</option>
            {DATE_FORMATS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
          {ambiguousDates && !mapping.dateFormat && (
            <span className="column-matcher__hint">
              These dates could be day/month or month/day, so please choose.
            </span>
          )}
        </label>
      </div>

      <label className="form-field">
        <span className="form-field__label">How are amounts written?</span>
        <select
          className="form-input form-select"
          value={amount?.style ?? ''}
          onChange={(e) => changeStyle(e.target.value as AmountMapping['style'])}
        >
          {!amount && <option value="">Choose</option>}
          {STYLES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>

      {amount?.style === 'signed' && (
        <div className="column-matcher__grid">
          <ColumnSelect
            label="Amount"
            headers={headers}
            value={amount.column}
            onChange={(c) => c !== null && set({ amount: { ...amount, column: c } })}
          />
          <label className="form-field">
            <span className="form-field__label">Negative amounts are</span>
            <select
              className="form-input form-select"
              value={amount.negativeIs}
              onChange={(e) =>
                set({ amount: { ...amount, negativeIs: e.target.value as 'EXPENSE' | 'INCOME' } })
              }
            >
              <option value="EXPENSE">Spending (positive is income)</option>
              <option value="INCOME">Income (positive is spending)</option>
            </select>
          </label>
        </div>
      )}
      {amount?.style === 'split' && (
        <div className="column-matcher__grid">
          <ColumnSelect
            label="Money out"
            headers={headers}
            value={amount.debit}
            onChange={(c) => c !== null && set({ amount: { ...amount, debit: c } })}
          />
          <ColumnSelect
            label="Money in"
            headers={headers}
            value={amount.credit}
            onChange={(c) => c !== null && set({ amount: { ...amount, credit: c } })}
          />
        </div>
      )}
      {amount?.style === 'typed' && (
        <div className="column-matcher__grid">
          <ColumnSelect
            label="Amount"
            headers={headers}
            value={amount.column}
            onChange={(c) => c !== null && set({ amount: { ...amount, column: c } })}
          />
          <ColumnSelect
            label="Income or expense"
            headers={headers}
            value={amount.typeColumn}
            onChange={(c) => c !== null && set({ amount: { ...amount, typeColumn: c } })}
          />
        </div>
      )}

      <div className="column-matcher__grid column-matcher__grid--three">
        <ColumnSelect
          label="Description (optional)"
          headers={headers}
          value={mapping.description}
          optional
          onChange={(description) => set({ description })}
        />
        <ColumnSelect
          label="Category (optional)"
          headers={headers}
          value={mapping.category}
          optional
          onChange={(category) => set({ category })}
        />
        <ColumnSelect
          label="Account (optional)"
          headers={headers}
          value={mapping.account}
          optional
          onChange={(account) => set({ account })}
        />
      </div>
    </div>
  )
}

export default ColumnMatcher
