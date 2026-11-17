import { Link, Navigate } from 'react-router'
import { useAuth } from '@clerk/react'
import AuthLayout from '../components/AuthLayout'
import { authButton, authButtonPrimary, authHeading, authSubtext } from '../lib/authStyles'

// Public landing page. Signed-in users go straight to the dashboard.
function Home() {
  const { isLoaded, isSignedIn } = useAuth()

  if (!isLoaded) return <p>Loading...</p>
  if (isSignedIn) return <Navigate to="/dashboard" replace />

  return (
    <AuthLayout>
      <h2 className={authHeading}>Welcome</h2>
      <p className={authSubtext}>Track spending, budgets and debts in one calm place.</p>
      <Link to="/sign-in" className={authButtonPrimary}>
        Sign in
      </Link>
      <Link to="/sign-up" className={authButton}>
        Create account
      </Link>
    </AuthLayout>
  )
}

export default Home
