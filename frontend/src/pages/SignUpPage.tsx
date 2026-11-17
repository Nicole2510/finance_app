import { SignUp } from '@clerk/react'
import AuthLayout from '../components/AuthLayout'
import { authHeading, authSubtext } from '../lib/authStyles'
import { authAppearance } from '../lib/authAppearance'

// Clerk's registration form, embedded in our own page
function SignUpPage() {
  return (
    <AuthLayout>
      <h2 className={authHeading}>Create your account</h2>
      <p className={authSubtext}>Start tracking your money the calm way.</p>
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" appearance={authAppearance} />
    </AuthLayout>
  )
}

export default SignUpPage
