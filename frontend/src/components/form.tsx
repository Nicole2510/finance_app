import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'
import { inputClasses } from '../lib/formStyles'

// One form row: a label above its box. A <label> by default, so clicking the
// label focuses the box; use as="div" for pickers labelled by id instead.
export function Field({
  as = 'label',
  className,
  ...props
}: ComponentProps<'div'> & { as?: 'label' | 'div' }) {
  const classes = cn('mb-5 flex flex-col gap-2', className)
  return as === 'div' ? (
    <div className={classes} {...props} />
  ) : (
    <label className={classes} {...(props as ComponentProps<'label'>)} />
  )
}

// The text above a box
export function FieldLabel({ className, ...props }: ComponentProps<'span'>) {
  return <span className={cn('text-sm font-medium', className)} {...props} />
}

// A text box
export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(inputClasses, className)} {...props} />
}

// A message saying what went wrong
export function FormError({ className, ...props }: ComponentProps<'p'>) {
  return (
    <p
      className={cn(
        'mb-4 rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive',
        className,
      )}
      {...props}
    />
  )
}

// A popup's buttons (Cancel, Save) side by side. On phones they stack,
// with the main action (the last one) on top.
export function FormActions({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'mt-2 grid grid-cols-2 gap-3 max-sm:grid-cols-1 max-sm:[&>:last-child]:-order-1',
        className,
      )}
      {...props}
    />
  )
}
