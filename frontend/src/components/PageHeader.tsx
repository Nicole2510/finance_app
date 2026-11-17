import type { ReactNode } from 'react'

type Props = {
  title: string
  children?: ReactNode // the page's action, e.g. an Add button
}

// Slim bar across the top of a page
function PageHeader({ title, children }: Props) {
  return (
    // The negative margins undo the main area's padding so the bar and its line
    // reach both edges. On phones the app's top bar is the sticky one.
    <header className="sticky top-0 z-4 -mx-8 -mt-8 mb-7 flex min-h-[69px] items-center justify-between gap-4 border-b border-border bg-background px-8 py-3 max-[860px]:static max-[860px]:-mx-4 max-[860px]:-mt-6 max-[860px]:mb-5 max-[860px]:min-h-[60px] max-[860px]:px-4 max-[860px]:py-2.5">
      <h1 className="font-heading text-xl font-semibold tracking-[-0.01em]">{title}</h1>
      {children}
    </header>
  )
}

export default PageHeader
