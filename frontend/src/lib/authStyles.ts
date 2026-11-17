// Tailwind classes for the sign-in pages, shared by our own pages and
// Clerk's forms (see authAppearance)

export const authHeading = 'font-heading text-4xl font-semibold'
export const authSubtext = 'mb-4 text-center text-muted-foreground'

// Full-width buttons: outlined, or solid violet for the main action
const authButtonBase =
  'flex w-full max-w-[320px] items-center justify-center gap-2 rounded-[10px] border p-3.5 text-center font-medium no-underline transition-[transform,box-shadow] duration-150 hover:-translate-y-px hover:shadow-[0_8px_20px_-10px_rgba(30,27,46,0.5)]'
export const authButton = `${authButtonBase} border-border bg-card text-foreground`
export const authButtonPrimary = `${authButtonBase} border-primary bg-primary text-primary-foreground`
