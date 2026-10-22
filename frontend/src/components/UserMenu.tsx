import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useClerk, useUser } from '@clerk/react'
import { ChevronUp } from 'lucide-react'
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

  // Close when clicking outside the menu or pressing Escape
  useEffect(() => {
    if (!open) return

    function onClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

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
