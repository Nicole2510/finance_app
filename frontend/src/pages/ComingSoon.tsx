import PageHeader from '../components/PageHeader'
import './Page.css'

// Placeholder for pages we haven't built yet
function ComingSoon({ title }: { title: string }) {
  return (
    <div className="page">
      <PageHeader title={title} />
      <p className="page__subtitle">Coming soon.</p>
    </div>
  )
}

export default ComingSoon
