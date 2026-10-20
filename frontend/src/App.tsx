import { SignInButton, SignUpButton, UserButton, useAuth } from '@clerk/react'

function App() {
  const { isSignedIn } = useAuth()

  return (
    <div>
      <h1>Finance App</h1>

      {!isSignedIn && (
        <>
          <SignInButton />
          <SignUpButton />
        </>
      )}

      {isSignedIn && (
        <>
        <h2>Welcome to your dashboard!</h2>
        <UserButton />
        </>
      )}
    </div>
  )
}

export default App