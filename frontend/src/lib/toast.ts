import { createContext, useContext } from 'react'

export type ToastTone = 'success' | 'info' | 'error'

export type ToastOptions = {
  title: string
  message?: string
  tone?: ToastTone // defaults to success
}

// Shows a short pop-up message that closes itself
export const ToastContext = createContext<(options: ToastOptions) => void>(() => {})

// const toast = useToast(); toast({ title: 'Saved' })
export function useToast() {
  return useContext(ToastContext)
}
