import { useState, type ReactNode } from 'react'
import { useClerk, useUser } from '@clerk/react'
import { LogOut, Trash2, UserCog } from 'lucide-react'
import { Button } from '@/components/ui/button'
import PageHeader from '../components/PageHeader'
import DeleteAccountModal from '../components/DeleteAccountModal'

// A white card with a title and a short line under it
function Card({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-7 max-[860px]:p-5">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 text-muted-foreground">{description}</p>
      <div className="mt-6">{children}</div>
    </section>
  )
}

// A read-only value with a small uppercase label above it
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium tracking-[0.08em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="truncate rounded-xl border border-border px-4 py-3">{value}</p>
    </div>
  )
}

// Settings: your profile (shown from Clerk, edited in Clerk's own popup), sign
// out, and deleting the account
function Settings() {
  const { user } = useUser()
  const { openUserProfile, signOut } = useClerk()
  const [deleting, setDeleting] = useState(false)

  if (!user) return <p>Loading...</p>

  const email = user.primaryEmailAddress?.emailAddress ?? '—'
  const initial = (user.fullName || email).charAt(0).toUpperCase()

  return (
    <div>
      <PageHeader title="Settings" />

      <div className="flex max-w-4xl flex-col gap-6">
        <Card title="Profile" description="How your account appears across Nayad.">
          <div className="mb-6 flex items-center gap-4">
            <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-full bg-accent text-xl font-semibold text-primary">
              {user.hasImage ? <img src={user.imageUrl} alt="" /> : initial}
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium">{user.fullName || 'No name yet'}</p>
              {user.createdAt && (
                <p className="text-sm text-muted-foreground">
                  Member since{' '}
                  {user.createdAt.toLocaleDateString(undefined, {
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5 max-[640px]:grid-cols-1">
            <Field label="Full name" value={user.fullName || '—'} />
            <Field label="Email" value={email} />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => openUserProfile()}>
              <UserCog /> Manage account
            </Button>
            <Button variant="outline" onClick={() => signOut({ redirectUrl: '/' })}>
              <LogOut /> Sign out
            </Button>
          </div>
        </Card>

        <Card
          title="Delete account"
          description="Permanently delete your account and all your data."
        >
          <Button variant="destructive" onClick={() => setDeleting(true)}>
            <Trash2 /> Delete account
          </Button>
        </Card>
      </div>

      {deleting && <DeleteAccountModal onClose={() => setDeleting(false)} />}
    </div>
  )
}

export default Settings
