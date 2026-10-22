import { useCallback } from 'react'
import { useAuth } from '@clerk/react'

// Returns an apiFetch function that sends the Clerk session token with
// every request, so the server knows who is signed in
export function useApiFetch() {
  const { getToken } = useAuth()

  return useCallback(
    async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
      const token = await getToken()

      const res = await fetch(path, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers,
        },
      })

      const body = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(body?.error ?? `Request failed (${res.status})`)
      }

      return body as T
    },
    [getToken],
  )
}
