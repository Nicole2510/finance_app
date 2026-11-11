import type { ReactNode } from 'react'
import './PageHeader.css'

type Props = {
  title: string
  children?: ReactNode // the page's action, e.g. an Add button
}

// Slim bar across the top of a page
function PageHeader({ title, children }: Props) {
  return (
    <header className="page-header">
      <h1 className="page-header__title">{title}</h1>
      {children}
    </header>
  )
}

export default PageHeader
