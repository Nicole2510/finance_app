import { authButton, authButtonPrimary } from './authStyles'

// The parts of Clerk's forms we restyle. Tailwind classes win over Clerk's own
// styles because of the layer order at the top of index.css.
const clerkButton = 'max-w-none text-[15px] normal-case'
const link = 'font-medium text-foreground underline underline-offset-3 hover:text-primary'

// Clerk appearance for the sign-in / sign-up forms.
// Maps Clerk's stable element names to Tailwind classes so the forms look
// like a native part of Nayad.
export const authAppearance = {
  options: {
    // Remove Clerk's own card border, shadow and padding
    elevation: 'flush',
    socialButtonsPlacement: 'bottom',
    socialButtonsVariant: 'blockButton',
  },
  elements: {
    rootBox: 'w-full max-w-[400px]',
    logoBox: 'hidden',
    headerTitle: 'font-heading text-2xl font-semibold text-foreground',
    headerSubtitle: 'text-muted-foreground',
    formFieldLabel: 'text-sm font-medium text-foreground',
    formFieldInput:
      'rounded-[10px] border border-transparent bg-muted px-[18px] py-3 text-[15px] text-foreground shadow-none transition-[border-color,box-shadow] focus:border-primary focus:ring-4 focus:ring-primary/15 focus:outline-none',
    formButtonPrimary: `${authButtonPrimary} ${clerkButton}`,
    socialButtonsBlockButton: `${authButton} ${clerkButton}`,
    dividerText: 'text-muted-foreground',
    // Keep the required "Secured by Clerk" footer, but make it quiet
    footer: 'bg-transparent text-[13px] opacity-75',
    footerActionLink: link,
    formFieldAction: link,
    identityPreviewEditButton: link,
  },
} as const
