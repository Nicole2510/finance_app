import './Page.css'

// Placeholder for pages we haven't built yet
function ComingSoon({ title }: { title: string }) {
  return (
    <div className="page">
      <h1 className="page__title">{title}</h1>
      <p className="page__subtitle">Coming soon.</p>
    </div>
  )
}

export default ComingSoon
