import PageHeader from '../components/PageHeader'

// Placeholder for pages we haven't built yet
function ComingSoon({ title }: { title: string }) {
  return (
    <div>
      <PageHeader title={title} />
      <p className="mt-1.5 text-muted-foreground">Coming soon.</p>
    </div>
  )
}

export default ComingSoon
