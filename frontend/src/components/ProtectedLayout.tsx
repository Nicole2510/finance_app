import { Navigate, NavLink, Outlet } from 'react-router'
import { useAuth } from '@clerk/react'
import UserMenu from './UserMenu'
import { mainNav, secondaryNav } from './navItems'
import './ProtectedLayout.css'

// Wraps every page that needs a signed-in user.
// Desktop: light sidebar. Phone: top bar + bottom tab bar.
// Signed-out visitors are sent back to the home page.
function ProtectedLayout() {
  const { isLoaded, isSignedIn } = useAuth()

  if (!isLoaded) return <p>Loading...</p>
  if (!isSignedIn) return <Navigate to="/" replace />

  return (
    <div className="app">
      <aside className="sidebar">
        <span className="sidebar__logo">Nayad</span>

        <nav className="sidebar__nav" aria-label="Main">
          {mainNav.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className="sidebar__link">
              <Icon size={20} strokeWidth={1.75} aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__bottom">
          {secondaryNav.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className="sidebar__link">
              <Icon size={20} strokeWidth={1.75} aria-hidden />
              {label}
            </NavLink>
          ))}
          <UserMenu variant="sidebar" />
        </div>
      </aside>

      <header className="mobile-header">
        <span className="mobile-header__logo">Nayad</span>
        <UserMenu variant="compact" />
      </header>

      <main className="app__main">
        <Outlet />
      </main>

      <nav className="tab-bar" aria-label="Main">
        {mainNav.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className="tab-bar__link">
            <Icon size={22} strokeWidth={1.75} aria-hidden />
            <span>{label.split(' ')[0]}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export default ProtectedLayout
