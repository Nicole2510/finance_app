import type { AccountMapping, AmountMapping, Mapping } from '../../lib/import/detect'
import { DATE_FORMATS, type DateFormat } from '../../lib/import/parse'

export type ColumnChoice = { index: number; label: string }

type Props = {
  columns: ColumnChoice[]
  mapping: Mapping
  ambiguousDates: boolean
  onChange: (mapping: Mapping) => void
}

// One dropdown per field, already set to what the app detected
function ColumnSelect({
  label,
  columns,
  value,
  optional = false,
  onChange,
}: {
  label: string
  columns: ColumnChoice[]
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
        {columns.map((c) => (
          <option key={c.index} value={c.index}>
            {c.label}
          </option>
        ))}
      </select>
    </label>
  )
}

const STYLES: { id: AmountMapping['style']; label: string }[] = [
  { id: 'typed', label: 'An amount, plus a column saying what kind it is' },
  { id: 'split', label: 'Separate money out and money in columns' },
  { id: 'signed', label: 'One column, with − for one direction' },
]

// Step 2: which column is which. Starts filled in; the person confirms or fixes it.
function ColumnMatcher({ columns, mapping, ambiguousDates, onChange }: Props) {
  const set = (changes: Partial<Mapping>) => onChange({ ...mapping, ...changes })
  const amount = mapping.amount
  const first = columns[0]?.index ?? 0

  // Switching style keeps the amount column where it makes sense
  function changeStyle(style: AmountMapping['style']) {
    const current = amount?.style === 'split' ? amount.outgoing : (amount?.column ?? first)
    if (style === 'signed') set({ amount: { style, column: current, negativeIs: 'EXPENSE' } })
    if (style === 'split') {
      set({ amount: { style, outgoing: current, incoming: current, incomingNotes: null } })
    }
    if (style === 'typed') set({ amount: { style, column: current, typeColumn: current } })
  }

  function changeAccountKind(kind: AccountMapping['kind'] | '') {
    const column = mapping.account?.column ?? first
    set({ account: kind ? { kind, column } : null })
  }

  return (
    <div className="column-matcher">
      <div className="column-matcher__grid">
        <ColumnSelect
          label="Date"
          columns={columns}
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

      {amount?.style === 'typed' && (
        <div className="column-matcher__grid">
          <ColumnSelect
            label="Amount"
            columns={columns}
            value={amount.column}
            onChange={(c) => c !== null && set({ amount: { ...amount, column: c } })}
          />
          <ColumnSelect
            label="Kind (e.g. Income, Expenses)"
            columns={columns}
            value={amount.typeColumn}
            onChange={(c) => c !== null && set({ amount: { ...amount, typeColumn: c } })}
          />
        </div>
      )}
      {amount?.style === 'split' && (
        <div className="column-matcher__grid column-matcher__grid--three">
          <ColumnSelect
            label="Money out"
            columns={columns}
            value={amount.outgoing}
            onChange={(c) => c !== null && set({ amount: { ...amount, outgoing: c } })}
          />
          <ColumnSelect
            label="Money in"
            columns={columns}
            value={amount.incoming}
            onChange={(c) => c !== null && set({ amount: { ...amount, incoming: c } })}
          />
          <ColumnSelect
            label="Notes for money in (optional)"
            columns={columns}
            value={amount.incomingNotes}
            optional
            onChange={(c) => set({ amount: { ...amount, incomingNotes: c } })}
          />
        </div>
      )}
      {amount?.style === 'signed' && (
        <div className="column-matcher__grid">
          <ColumnSelect
            label="Amount"
            columns={columns}
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

      <div className="column-matcher__grid">
        <ColumnSelect
          label="Category (optional)"
          columns={columns}
          value={mapping.category}
          optional
          onChange={(category) => set({ category })}
        />
        <ColumnSelect
          label="Notes (optional)"
          columns={columns}
          value={mapping.description}
          optional
          onChange={(description) => set({ description })}
        />
      </div>

      <div className="column-matcher__grid">
        <label className="form-field">
          <span className="form-field__label">Which account?</span>
          <select
            className="form-input form-select"
            value={mapping.account?.kind ?? ''}
            onChange={(e) => changeAccountKind(e.target.value as AccountMapping['kind'] | '')}
          >
            <option value="">I'll choose one for the whole file</option>
            <option value="column">A column names the account</option>
            <option value="cardFlag">A TRUE/FALSE column says "on a credit card"</option>
          </select>
        </label>
        {mapping.account && (
          <ColumnSelect
            label={mapping.account.kind === 'cardFlag' ? 'Credit card column' : 'Account column'}
            columns={columns}
            value={mapping.account.column}
            onChange={(c) => c !== null && set({ account: { ...mapping.account!, column: c } })}
          />
        )}
      </div>
    </div>
  )
}

export default ColumnMatcher
