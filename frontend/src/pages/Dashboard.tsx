import { useUser } from '@clerk/react'

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
    <div>
      <h1 className="font-heading text-[clamp(26px,3vw,30px)] font-semibold tracking-[-0.01em]">
        {greeting()}
        {firstName ? `, ${firstName}` : ''}.
      </h1>
      <p className="mt-1.5 text-muted-foreground">Your money, at a glance.</p>
    </div>
  )
}

export default Dashboard
