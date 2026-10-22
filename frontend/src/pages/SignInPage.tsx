import { SignIn } from '@clerk/react'
import AuthLayout from '../components/AuthLayout'
import { authAppearance } from '../lib/authAppearance'
import '../components/ClerkAuth.css'

// Clerk's sign-in form, embedded in our own page
function SignInPage() {
  return (
    <AuthLayout>
      <h2 className="auth__heading">Welcome back</h2>
      <p className="auth__subtext">Sign in to continue to Nayad.</p>
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        appearance={authAppearance}
      />
    </AuthLayout>
  )
}

export default SignInPage
