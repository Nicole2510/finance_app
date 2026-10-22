import { Navigate, NavLink, Outlet } from 'react-router'
import { UserButton, useAuth } from '@clerk/react'

// Wraps every page that needs a signed-in user.
// Signed-out visitors are sent back to the home page.
function ProtectedLayout() {
  const { isLoaded, isSignedIn } = useAuth()

  if (!isLoaded) return <p>Loading...</p>
  if (!isSignedIn) return <Navigate to="/" replace />

  return (
    <div>
      <nav>
        <NavLink to="/dashboard">Dashboard</NavLink> |{' '}
        <NavLink to="/profile">Profile</NavLink>
        <UserButton />
      </nav>

      <main>
        <Outlet />
      </main>
    </div>
  )
}

export default ProtectedLayout
