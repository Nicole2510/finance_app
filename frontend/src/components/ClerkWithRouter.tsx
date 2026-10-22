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
        // Put Clerk's styles in a low-priority CSS layer so ours always win
        cssLayerName: 'clerk',
        // Nayad palette for every Clerk component
        variables: {
          colorPrimary: '#2f2724',
          colorPrimaryForeground: '#f6f1ec',
          colorForeground: '#2f2724',
          colorMutedForeground: '#8c7b73',
          colorNeutral: '#2f2724',
          colorBackground: '#ffffff',
          colorInput: '#f6f1ec',
          colorInputForeground: '#2f2724',
          colorBorder: '#e8dfd8',
          colorRing: 'rgba(217, 138, 128, 0.45)',
          colorDanger: '#b4544a',
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
