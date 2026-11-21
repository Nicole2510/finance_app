import { cn } from '@/lib/utils'

type Props = {
  percent: number // 0–100
  over?: boolean // turns the bar red
  tone?: string // the bar's colour class while within budget
  className?: string
}

// A thin rounded bar: coloured while within budget, red once over
function ProgressBar({ percent, over = false, tone = 'bg-primary', className }: Props) {
  return (
    <div
      className={cn('h-2 overflow-hidden rounded-full bg-muted', className)}
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn('h-full rounded-full', over ? 'bg-destructive' : tone)}
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  )
}

export default ProgressBar
