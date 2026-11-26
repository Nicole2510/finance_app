import { cn } from '@/lib/utils'

type Props = {
  percent: number // 0–100
  over?: boolean // turns the bar red
  className?: string
}

// A thin rounded bar: violet while within budget, red once over
function ProgressBar({ percent, over = false, className }: Props) {
  return (
    <div
      className={cn('h-2 overflow-hidden rounded-full bg-muted', className)}
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn('h-full rounded-full', over ? 'bg-destructive' : 'bg-primary')}
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  )
}

export default ProgressBar
