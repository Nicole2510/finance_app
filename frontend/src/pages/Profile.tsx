import { useEffect, useState } from 'react'
import { useApiFetch } from '../lib/api'

type Me = {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  createdAt: string
}

// Shows the signed-in user's profile from our own database (GET /api/me)
function Profile() {
  const apiFetch = useApiFetch()
  const [me, setMe] = useState<Me | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiFetch<Me>('/api/me')
      .then(setMe)
      .catch((err: Error) => setError(err.message))
  }, [apiFetch])

  if (error) return <p>Could not load your profile: {error}</p>
  if (!me) return <p>Loading...</p>

  return (
    <div>
      <h2>Profile</h2>
      <p>Name: {[me.firstName, me.lastName].filter(Boolean).join(' ') || '—'}</p>
      <p>Email: {me.email}</p>
      <p>Member since: {new Date(me.createdAt).toLocaleDateString()}</p>
    </div>
  )
}

export default Profile
