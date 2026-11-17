import { createContext } from 'react'

// Where floating pieces (dropdown lists, menus) should be drawn.
// Our popups use the browser's <dialog>, which sits above everything else on
// the page, so a dropdown inside one must be drawn inside it to be visible.
// null means "at the end of the page", the normal place.
export const PortalContainer = createContext<HTMLElement | null>(null)
