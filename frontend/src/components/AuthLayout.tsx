import type { ReactNode } from 'react'

// Card used by the landing, sign-in and sign-up pages:
// brand panel on one side, page content on the other.
// Tablet and phone: the brand panel becomes a short banner above the form.
function AuthLayout({ children }: { children: ReactNode }) {
  return (
    // Page background with soft lavender glows, card centred on top
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_85%_15%,rgba(155,123,227,0.3),transparent_40%),radial-gradient(circle_at_10%_90%,rgba(235,229,250,0.9),transparent_45%)] bg-muted p-8 max-[860px]:items-start max-[860px]:p-4">
      <div className="grid min-h-[640px] w-full max-w-[1080px] grid-cols-2 gap-6 rounded-[20px] bg-card p-4 shadow-xl shadow-primary/10 max-[860px]:min-h-0 max-[860px]:grid-cols-1">
        <section className="flex flex-col justify-between gap-6 rounded-[14px] bg-[radial-gradient(circle_at_80%_85%,rgba(155,123,227,0.45),transparent_50%),linear-gradient(160deg,#8a63e0_0%,#4b2a99_100%)] p-10 text-white max-[860px]:px-6 max-[860px]:py-7">
          <div>
            <h1 className="font-heading text-[clamp(40px,5vw,60px)] font-semibold">Nayad</h1>
            <p className="mt-2 opacity-85">Your money, your way.</p>
          </div>
          <p className="text-lg leading-relaxed opacity-90 max-[860px]:hidden">
            Build better habits.
            <br />
            Reach your goals.
            <br />
            Live the life you want.
          </p>
        </section>

        <section className="flex flex-col items-center justify-center gap-4 px-2 py-6 max-[860px]:px-0 max-[860px]:pt-2">
          {children}
        </section>
      </div>
    </div>
  )
}

export default AuthLayout
