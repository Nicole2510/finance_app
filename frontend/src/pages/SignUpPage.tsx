import { SignUp } from '@clerk/react'
import AuthLayout from '../components/AuthLayout'
import { authAppearance } from '../lib/authAppearance'
import '../components/ClerkAuth.css'

// Clerk's registration form, embedded in our own page
function SignUpPage() {
  return (
    <AuthLayout>
      <h2 className="auth__heading">Create your account</h2>
      <p className="auth__subtext">Start tracking your money the calm way.</p>
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        appearance={authAppearance}
      />
    </AuthLayout>
  )
}

export default SignUpPage
