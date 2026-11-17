import { SignIn } from '@clerk/react'
import AuthLayout from '../components/AuthLayout'
import { authHeading, authSubtext } from '../lib/authStyles'
import { authAppearance } from '../lib/authAppearance'

// Clerk's sign-in form, embedded in our own page
function SignInPage() {
  return (
    <AuthLayout>
      <h2 className={authHeading}>Welcome back</h2>
      <p className={authSubtext}>Sign in to continue to Nayad.</p>
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" appearance={authAppearance} />
    </AuthLayout>
  )
}

export default SignInPage
