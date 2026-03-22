import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import './BlogPage.css'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001'

export default function BlogPage() {
  const [posts, setPosts]     = useState([])
  const [total, setTotal]     = useState(0)
  const [offset, setOffset]   = useState(0)
  const [loading, setLoading] = useState(true)
  const LIMIT = 4

  const loadPosts = async (nextOffset = 0) => {
    try {
      const res  = await fetch(`${API_BASE}/api/blog?limit=${LIMIT}&offset=${nextOffset}`)
      const data = await res.json()
      setPosts(prev => nextOffset === 0 ? data.posts : [...prev, ...data.posts])
      setTotal(data.total)
      setOffset(nextOffset + data.posts.length)
    } catch {
      // backend unreachable — leave list empty
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadPosts(0) }, [])

  return (
    <main className="blog-page">
      <div className="bg-glow" style={{ top: 0, left: '20%' }} />
      <div className="container">
        <div className="blog-hero animate-fade">
          <h1>News &amp; <span className="gradient-text">Insights</span></h1>
          <p>Stay current with the latest in celebrity culture, platform updates, and exclusive insights.</p>
        </div>

        {loading ? (
          <div className="blog-grid grid grid-cols-2">
            {[...Array(4)].map((_, i) => <div key={i} className="article-card article-card--skeleton" />)}
          </div>
        ) : (
          <div className="blog-grid grid grid-cols-2">
            {posts.map(post => <ArticleCard key={post.id} article={post} />)}
          </div>
        )}

        {offset < total && (
          <div className="blog-load-more">
            <button className="btn btn-outline" onClick={() => loadPosts(offset)}>
              Load More
            </button>
          </div>
        )}
      </div>
    </main>
  )
}

function ArticleCard({ article }) {
  return (
    <article className="article-card glass-panel">
      <div className="article-card__image">
        {article.image_url
          ? <img src={article.image_url} alt={article.title} />
          : <div className="article-card__image-placeholder" />
        }
        <span className="article-card__category">{article.category}</span>
      </div>
      <div className="article-card__body">
        <div className="article-card__meta">
          <span>
            {new Date(article.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </span>
          <span>·</span>
          <span>{article.read_time}</span>
        </div>
        <h3 className="article-card__title">{article.title}</h3>
        <p className="article-card__excerpt">{article.excerpt}</p>
        <Link to={`/blog/${article.id}`} className="btn btn-outline article-card__btn">Read Article →</Link>
      </div>
    </article>
  )
}
