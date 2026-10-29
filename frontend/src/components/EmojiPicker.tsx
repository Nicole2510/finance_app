import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import './EmojiPicker.css'

// A curated set for money categories; any emoji can also be typed
const ALL_EMOJIS = [
  '🏠', '🛒', '🚌', '🚗', '⛽', '💡', '📱', '🩺', '❤️', '💊',
  '🍽️', '☕', '🍕', '🛍️', '👗', '💄', '📺', '🎬', '🎮', '🎵',
  '🎁', '✈️', '🏖️', '🏋️', '📚', '🎓', '🐶', '👶', '💇', '🧺',
  '🐷', '💳', '🏦', '📈', '🛟', '🎯', '💼', '💰', '💸', '🪙',
  '🏛️', '🏢', '🧑‍💻', '🎨', '🤝', '🎉', '🌱', '✨',
]

type Props = {
  value: string | null
  onChange: (emoji: string | null) => void
  suggestions: string[] // quick picks shown in the first row
}

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
        className={`emoji-option${emoji === value ? ' is-selected' : ''}`}
        aria-pressed={emoji === value}
        onClick={() => onChange(emoji)}
      >
        {emoji}
      </button>
    )
  }

  return (
    <div className="emoji-picker">
      <div className="emoji-picker__row">
        {quick.map(option)}
        <button
          type="button"
          className={`emoji-option emoji-option--more${expanded ? ' is-selected' : ''}`}
          aria-label="More emojis"
          aria-expanded={expanded}
          onClick={() => setExpanded((e) => !e)}
        >
          <MoreHorizontal size={18} />
        </button>
      </div>

      {expanded && (
        <div className="emoji-picker__more">
          <div className="emoji-picker__grid">{ALL_EMOJIS.map(option)}</div>

          <div className="emoji-picker__custom">
            <input
              className="form-input"
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
            <button
              type="button"
              className="btn btn--secondary"
              disabled={!custom.trim()}
              onClick={() => onChange(custom.trim())}
            >
              Use
            </button>
          </div>
        </div>
      )}

      {value && (
        <button type="button" className="emoji-picker__none" onClick={() => onChange(null)}>
          No icon
        </button>
      )}
    </div>
  )
}

export default EmojiPicker
