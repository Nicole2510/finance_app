import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { PopoverContent } from '@/components/ui/popover'

type Props = {
  // title?: string // a heading at the top of the card (lists don't have one)
  children: ReactNode
} & Omit<ComponentProps<typeof PopoverContent>, 'title' | 'children'>

// The floating card every picker opens. Sits under the box it belongs to, or
// flips above when there isn't room. Closes by picking, Escape or clicking outside.
function PickerCard({ children, className, ...props }: Props) {
  return (
    <PopoverContent
      align="start"
      sideOffset={8}
      collisionPadding={16}
      className={cn(
        'max-h-[min(26rem,var(--radix-popover-content-available-height))] w-(--radix-popover-trigger-width) gap-0 overflow-hidden rounded-2xl border border-border px-0 py-2 shadow-xl shadow-primary/10 ring-0',
        className,
      )}
      {...props}
    >
      {/* Only the sides are padded here: the card's top and bottom padding keeps
          the scrollbar clear of the rounded corners */}
      <div className="min-h-0 overflow-y-auto px-2">{children}</div>
    </PopoverContent>
  )
}

export default PickerCard
