import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Input } from './form'

// A curated set for money categories; any emoji can also be typed
const ALL_EMOJIS = [
  '🏠',
  '🛒',
  '🚌',
  '🚗',
  '⛽',
  '💡',
  '📱',
  '🩺',
  '❤️',
  '💊',
  '🍽️',
  '☕',
  '🍕',
  '🛍️',
  '👗',
  '💄',
  '📺',
  '🎬',
  '🎮',
  '🎵',
  '🎁',
  '✈️',
  '🏖️',
  '🏋️',
  '📚',
  '🎓',
  '🐶',
  '👶',
  '💇',
  '🧺',
  '🐷',
  '💳',
  '🏦',
  '📈',
  '🛟',
  '🎯',
  '💼',
  '💰',
  '💸',
  '🪙',
  '🏛️',
  '🏢',
  '🧑‍💻',
  '🎨',
  '🤝',
  '🎉',
  '🌱',
  '✨',
]

type Props = {
  value: string | null
  onChange: (emoji: string | null) => void
  suggestions: string[] // quick picks shown in the first row
}

// A round emoji button, with a little wiggle on hover for a playful touch
const optionClasses =
  'grid size-[46px] cursor-pointer place-items-center rounded-full border-2 border-transparent bg-muted p-0 text-[22px] text-muted-foreground transition-[transform,border-color] duration-150 hover:scale-[1.08] hover:-rotate-8'
const selectedClasses = 'border-primary bg-card'

// Inline icon chooser: quick picks, "⋯" for the full grid or your own, or none
function EmojiPicker({ value, onChange, suggestions }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [custom, setCustom] = useState('')

  // Keep the current choice visible even if it isn't a quick pick
  const quick = value && !suggestions.includes(value) ? [value, ...suggestions] : suggestions

  function option(emoji: string) {
    return (
      <button
        key={emoji}
        type="button"
        className={cn(optionClasses, emoji === value && selectedClasses)}
        aria-pressed={emoji === value}
        onClick={() => onChange(emoji)}
      >
        {emoji}
      </button>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {quick.map(option)}
        <button
          type="button"
          className={cn(optionClasses, expanded && selectedClasses)}
          aria-label="More emojis"
          aria-expanded={expanded}
          onClick={() => setExpanded((e) => !e)}
        >
          <MoreHorizontal size={18} />
        </button>
      </div>

      {expanded && (
        <div className="mt-3 rounded-[14px] bg-card p-3">
          {/* Smaller, plain buttons in the full grid */}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(40px,1fr))] gap-1 [&>button]:size-10 [&>button:not([aria-pressed=true])]:bg-transparent [&>button]:text-xl">
            {ALL_EMOJIS.map(option)}
          </div>

          <div className="mt-3 flex gap-2">
            <Input
              className="min-w-0 flex-1"
              value={custom}
              placeholder="Or type any emoji"
              aria-label="Type any emoji"
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && custom.trim()) {
                  e.preventDefault()
                  onChange(custom.trim())
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              disabled={!custom.trim()}
              onClick={() => onChange(custom.trim())}
            >
              Use
            </Button>
          </div>
        </div>
      )}

      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="mt-2 cursor-pointer border-none bg-transparent py-1 text-[13px] text-muted-foreground underline underline-offset-3"
        >
          No icon
        </button>
      )}
    </div>
  )
}

export default EmojiPicker
