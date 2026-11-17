import { Navigate, NavLink, Outlet } from 'react-router'
import { useAuth } from '@clerk/react'
import { cn } from '@/lib/utils'
import { Settings } from 'lucide-react'
import ToastProvider from './ToastProvider'
import { mainNav, secondaryNav } from './navItems'

// The violet square + name, used in the sidebar and the phone top bar
function Logo() {
  return (
    <span className="flex items-center gap-3 font-heading text-xl font-semibold tracking-tight">
      <span className="grid size-9 place-items-center rounded-[10px] bg-primary shadow-sm">
        <span className="size-3 rounded-full bg-white" />
      </span>
      Nayad
    </span>
  )
}

// Sidebar links: the current page gets a lavender pill (NavLink tells us which)
function sidebarLink({ isActive }: { isActive: boolean }) {
  return cn(
    'flex items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-[15px] text-sidebar-foreground no-underline transition-colors',
    'hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
    isActive && 'bg-sidebar-accent font-medium text-sidebar-accent-foreground',
  )
}

// Wraps every page that needs a signed-in user.
// Desktop: lavender sidebar. Phone (860px and under): top bar + bottom tab bar.
// Signed-out visitors are sent back to the home page.
function ProtectedLayout() {
  const { isLoaded, isSignedIn } = useAuth()

  if (!isLoaded) return <p>Loading...</p>
  if (!isSignedIn) return <Navigate to="/" replace />

  return (
    <ToastProvider>
      <div className="grid min-h-screen grid-cols-[256px_1fr] max-[860px]:block">
        <aside className="sticky top-0 flex h-screen flex-col border-r border-sidebar-border bg-sidebar px-4 pt-6 pb-4 max-[860px]:hidden">
          <div className="px-2 pb-7">
            <Logo />
          </div>

          <nav className="flex flex-col gap-1" aria-label="Main">
            {mainNav.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={sidebarLink}>
                <Icon size={20} strokeWidth={1.75} aria-hidden />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto flex flex-col gap-1 border-t border-sidebar-border pt-4">
            {secondaryNav.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={sidebarLink}>
                <Icon size={20} strokeWidth={1.75} aria-hidden />
                {label}
              </NavLink>
            ))}
          </div>
        </aside>

        <header className="sticky top-0 z-5 hidden items-center justify-between border-b border-border bg-background px-4 py-3 max-[860px]:flex">
          <Logo />
          <NavLink
            to="/settings"
            aria-label="Settings"
            className={({ isActive }) =>
              cn(
                'grid size-10 place-items-center rounded-xl text-muted-foreground',
                isActive && 'bg-accent text-accent-foreground',
              )
            }
          >
            <Settings size={22} strokeWidth={1.75} aria-hidden />
          </NavLink>
        </header>

        <main className="min-w-0 p-8 max-[860px]:px-4 max-[860px]:pt-6 max-[860px]:pb-[calc(96px+env(safe-area-inset-bottom))]">
          <Outlet />
        </main>

        <nav
          className="fixed right-3 bottom-[calc(12px+env(safe-area-inset-bottom))] left-3 z-5 hidden justify-around rounded-2xl border border-border bg-background p-2 shadow-lg shadow-primary/5 max-[860px]:flex"
          aria-label="Main"
        >
          {mainNav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[11px] text-muted-foreground no-underline',
                  isActive && 'bg-accent text-accent-foreground',
                )
              }
            >
              <Icon size={22} strokeWidth={1.75} aria-hidden />
              <span>{label.split(' ')[0]}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </ToastProvider>
  )
}

export default ProtectedLayout
