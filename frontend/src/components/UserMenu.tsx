import { useCallback, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useClerk, useUser } from '@clerk/react'
import { ChevronUp } from 'lucide-react'
import { useDismiss } from '../lib/useDismiss'
import './UserMenu.css'

type Props = {
  // "sidebar": avatar + name card that opens upward (desktop sidebar)
  // "compact": avatar only, opens downward (mobile top bar)
  variant: 'sidebar' | 'compact'
}

// Our own avatar dropdown (replaces Clerk's <UserButton />)
function UserMenu({ variant }: Props) {
  const { user } = useUser()
  const { signOut } = useClerk()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])

  // Close when clicking outside the menu or pressing Escape
  useDismiss(menuRef, open, close)

  if (!user) return null

  const name = user.fullName || user.primaryEmailAddress?.emailAddress || 'Account'
  const email = user.primaryEmailAddress?.emailAddress
  const initial = name.charAt(0).toUpperCase()

  const avatar = (
    <span className="user-menu__avatar">
      {user.hasImage ? <img src={user.imageUrl} alt="" /> : initial}
    </span>
  )

  return (
    <div className={`user-menu user-menu--${variant}`} ref={menuRef}>
      <button
        type="button"
        className="user-menu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open account menu"
        onClick={() => setOpen((o) => !o)}
      >
        {avatar}
        {variant === 'sidebar' && (
          <>
            <span className="user-menu__trigger-text">
              <span className="user-menu__trigger-name">{name}</span>
              {email && <span className="user-menu__trigger-email">{email}</span>}
            </span>
            <ChevronUp size={16} aria-hidden />
          </>
        )}
      </button>

      {open && (
        <div className="user-menu__dropdown" role="menu">
          <div className="user-menu__header">
            <p className="user-menu__name">{name}</p>
            {email && <p className="user-menu__email">{email}</p>}
          </div>

          <Link
            to="/profile"
            className="user-menu__item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            Profile
          </Link>
          <Link
            to="/categories"
            className="user-menu__item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            Categories
          </Link>
          <button
            type="button"
            className="user-menu__item"
            role="menuitem"
            onClick={() => signOut({ redirectUrl: '/' })}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

export default UserMenu
