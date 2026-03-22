import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import './BlogDetailPage.css'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001'

const fmt = (d) =>
  new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

// Render plain markdown-ish body: ## headings, **bold**, paragraphs
function ArticleBody({ body }) {
  if (!body) return null
  const blocks = body.trim().split(/\n\n+/)

  return (
    <div className="article-body">
      {blocks.map((block, i) => {
        if (block.startsWith('## ')) {
          return <h2 key={i}>{block.slice(3)}</h2>
        }
        // inline bold
        const parts = block.split(/(\*\*[^*]+\*\*)/)
        return (
          <p key={i}>
            {parts.map((part, j) =>
              part.startsWith('**') && part.endsWith('**')
                ? <strong key={j}>{part.slice(2, -2)}</strong>
                : part
            )}
          </p>
        )
      })}
    </div>
  )
}

export default function BlogDetailPage() {
  const { id }                  = useParams()
  const [post,    setPost]      = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error,   setError]     = useState('')

  useEffect(() => {
    fetch(`${API_BASE}/api/blog/${id}`)
      .then(r => { if (!r.ok) throw new Error('Article not found'); return r.json() })
      .then(setPost)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <main className="blog-detail-page">
      <div className="container blog-detail__inner">
        <div className="blog-detail-skeleton glass-panel" />
      </div>
    </main>
  )

  if (error) return (
    <main className="blog-detail-page">
      <div className="container blog-detail__inner">
        <Link to="/blog" className="blog-detail__back">← Back to Blog</Link>
        <div className="glass-panel blog-detail__error">
          <p>{error}</p>
        </div>
      </div>
    </main>
  )

  return (
    <main className="blog-detail-page">
      <div className="bg-glow" style={{ top: 0, left: '30%' }} />
      <div className="container blog-detail__inner">
        <Link to="/blog" className="blog-detail__back">← Back to Blog</Link>

        <article className="blog-detail__article animate-fade">
          {/* Hero image */}
          {post.image_url && (
            <div className="blog-detail__hero">
              <img src={post.image_url} alt={post.title} />
              <div className="blog-detail__hero-overlay" />
            </div>
          )}

          {/* Header */}
          <div className="blog-detail__header">
            <span className="blog-detail__category">{post.category}</span>
            <h1 className="blog-detail__title">{post.title}</h1>
            <div className="blog-detail__meta">
              <span>{fmt(post.created_at)}</span>
              <span>·</span>
              <span>{post.read_time}</span>
            </div>
            <p className="blog-detail__excerpt">{post.excerpt}</p>
          </div>

          {/* Body */}
          {post.body
            ? <ArticleBody body={post.body} />
            : <p className="blog-detail__nobody">Full article coming soon.</p>
          }
        </article>
      </div>
    </main>
  )
}
