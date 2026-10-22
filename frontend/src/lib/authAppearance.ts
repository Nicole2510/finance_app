// Clerk appearance for the sign-in / sign-up forms.
// Maps Clerk's stable element names to our own CSS classes (see ClerkAuth.css)
// so the forms look like a native part of Nayad.
export const authAppearance = {
  options: {
    // Remove Clerk's own card border, shadow and padding
    elevation: 'flush',
    socialButtonsPlacement: 'bottom',
    socialButtonsVariant: 'blockButton',
  },
  elements: {
    rootBox: 'nayad-clerk',
    logoBox: 'nayad-clerk__hidden',
    headerTitle: 'nayad-clerk__title',
    headerSubtitle: 'nayad-clerk__subtitle',
    formFieldLabel: 'nayad-clerk__label',
    formFieldInput: 'nayad-clerk__input',
    formButtonPrimary: 'auth__button auth__button--primary nayad-clerk__button',
    socialButtonsBlockButton: 'auth__button nayad-clerk__button',
    dividerText: 'nayad-clerk__divider-text',
    footer: 'nayad-clerk__footer',
    footerActionLink: 'nayad-clerk__link',
    formFieldAction: 'nayad-clerk__link',
    identityPreviewEditButton: 'nayad-clerk__link',
  },
} as const
