import type { AccountMapping, AmountMapping, Mapping } from '../../lib/import/detect'
import { DATE_FORMATS, type DateFormat } from '../../lib/import/parse'
import ListPicker from '../ListPicker'
import { Field, FieldLabel } from '../form'
import { fieldGrid, warnText } from './styles'

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
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <ListPicker
        title={label}
        value={value === null ? '' : String(value)}
        options={[
          ...(optional ? [{ value: '', label: 'None' }] : []),
          ...columns.map((c) => ({ value: String(c.index), label: c.label })),
        ]}
        onChange={(v) => onChange(v === '' ? null : Number(v))}
        placeholder="Choose a column"
      />
    </Field>
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
    <div>
      <div className={fieldGrid}>
        <ColumnSelect
          label="Date"
          columns={columns}
          value={mapping.date}
          onChange={(date) => set({ date })}
        />
        <Field>
          <FieldLabel>Dates are written like</FieldLabel>
          <ListPicker
            title="Date format"
            value={mapping.dateFormat ?? ''}
            options={DATE_FORMATS.map((f) => ({ value: f.id, label: f.label }))}
            onChange={(dateFormat) =>
              set({ dateFormat: (dateFormat || null) as DateFormat | null })
            }
            placeholder="Choose a format"
          />
          {ambiguousDates && !mapping.dateFormat && (
            <span className={warnText}>
              These dates could be day/month or month/day, so please choose.
            </span>
          )}
        </Field>
      </div>

      <Field>
        <FieldLabel>How are amounts written?</FieldLabel>
        <ListPicker
          title="Amounts"
          value={amount?.style ?? ''}
          options={STYLES.map((s) => ({ value: s.id, label: s.label }))}
          onChange={(style) => changeStyle(style as AmountMapping['style'])}
        />
      </Field>

      {amount?.style === 'typed' && (
        <div className={fieldGrid}>
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
        <div className={fieldGrid}>
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
        <div className={fieldGrid}>
          <ColumnSelect
            label="Amount"
            columns={columns}
            value={amount.column}
            onChange={(c) => c !== null && set({ amount: { ...amount, column: c } })}
          />
          <Field>
            <FieldLabel>Negative amounts are</FieldLabel>
            <ListPicker<'EXPENSE' | 'INCOME'>
              title="Negative amounts are"
              value={amount.negativeIs}
              options={[
                { value: 'EXPENSE', label: 'Spending (positive is income)' },
                { value: 'INCOME', label: 'Income (positive is spending)' },
              ]}
              onChange={(negativeIs) => set({ amount: { ...amount, negativeIs } })}
            />
          </Field>
        </div>
      )}

      <div className={fieldGrid}>
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

      <div className={fieldGrid}>
        <Field>
          <FieldLabel>Which account?</FieldLabel>
          <ListPicker<AccountMapping['kind'] | ''>
            title="Which account?"
            value={mapping.account?.kind ?? ''}
            options={[
              { value: '', label: "I'll choose one for the whole file" },
              { value: 'column', label: 'A column names the account' },
              { value: 'cardFlag', label: 'A TRUE/FALSE column says "on a credit card"' },
            ]}
            onChange={changeAccountKind}
          />
        </Field>
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
