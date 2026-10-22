import { useUser } from '@clerk/react'
import './Page.css'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

// Placeholder until the real dashboard (M9)
function Dashboard() {
  const { user } = useUser()
  const firstName = user?.firstName

  return (
    <div className="page">
      <h1 className="page__title">
        {greeting()}
        {firstName ? `, ${firstName}` : ''}.
      </h1>
      <p className="page__subtitle">Your money, at a glance.</p>
    </div>
  )
}

export default Dashboard
