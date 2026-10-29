import { useEffect, type RefObject } from 'react'

// Calls onDismiss when the user clicks outside `ref` or presses Escape.
// Used by popovers like the user menu and emoji picker.
export function useDismiss(
  ref: RefObject<HTMLElement | null>,
  open: boolean,
  onDismiss: () => void,
) {
  useEffect(() => {
    if (!open) return

    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) onDismiss()
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onDismiss()
    }

    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [ref, open, onDismiss])
}
