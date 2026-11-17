import type { ReactNode } from 'react'
import { ClerkProvider } from '@clerk/react'
import { useNavigate } from 'react-router'

// Connects Clerk to our router, so sign-in/sign-up stay on our own pages
// and Clerk's redirects don't reload the whole app
function ClerkWithRouter({ children }: { children: ReactNode }) {
  const navigate = useNavigate()

  return (
    <ClerkProvider
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
      afterSignOutUrl="/"
      appearance={{
        // Put Clerk's styles in their own CSS layer, ranked in index.css
        cssLayerName: 'clerk',
        // Nayad palette for every Clerk component (e.g. "Manage account")
        variables: {
          colorPrimary: '#6d3fd0',
          colorPrimaryForeground: '#ffffff',
          colorForeground: '#1e1b2e',
          colorMutedForeground: '#6b6880',
          colorNeutral: '#1e1b2e',
          colorBackground: '#ffffff',
          colorInput: '#f3f0fa',
          colorInputForeground: '#1e1b2e',
          colorBorder: '#e7e4f0',
          colorRing: 'rgba(109, 63, 208, 0.35)',
          colorDanger: '#b84653',
          fontFamily: 'inherit',
          borderRadius: '14px',
        },
        options: {
          // The banner only appears with development keys, never in production
          unsafe_disableDevelopmentModeWarnings: true,
        },
      }}
    >
      {children}
    </ClerkProvider>
  )
}

export default ClerkWithRouter
