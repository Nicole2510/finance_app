import type { ReactNode } from 'react'
import './AuthLayout.css'

// Card used by the landing, sign-in and sign-up pages:
// brand panel on one side, page content on the other
function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth">
      <div className="auth__card">
        <section className="auth__brand">
          <div>
            <h1 className="auth__logo">Nayad</h1>
            <p className="auth__tagline">Your money, your way.</p>
          </div>
          <p className="auth__footer">
            Build better habits.
            <br />
            Reach your goals.
            <br />
            Live the life you want.
          </p>
        </section>

        <section className="auth__panel">{children}</section>
      </div>
    </div>
  )
}

export default AuthLayout
