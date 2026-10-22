import { Link, Navigate } from 'react-router'
import { useAuth } from '@clerk/react'
import AuthLayout from '../components/AuthLayout'

// Public landing page. Signed-in users go straight to the dashboard.
function Home() {
  const { isLoaded, isSignedIn } = useAuth()

  if (!isLoaded) return <p>Loading...</p>
  if (isSignedIn) return <Navigate to="/dashboard" replace />

  return (
    <AuthLayout>
      <h2 className="auth__heading">Welcome</h2>
      <p className="auth__subtext">Track spending, budgets and debts in one calm place.</p>
      <Link to="/sign-in" className="auth__button auth__button--primary">
        Sign in
      </Link>
      <Link to="/sign-up" className="auth__button">
        Create account
      </Link>
    </AuthLayout>
  )
}

export default Home
