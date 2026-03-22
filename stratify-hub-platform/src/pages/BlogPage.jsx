import { useState, useEffect } from 'react'
import './BlogPage.css'

const API_BASE = 'http://localhost:3001'

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
      setPosts(FALLBACK_POSTS)
      setTotal(FALLBACK_POSTS.length)
      setOffset(FALLBACK_POSTS.length)
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
        <div className="article-card__category">{article.category}</div>
      </div>
      <div className="article-card__body">
        <div className="article-card__meta">
          <span>
            {article.created_at
              ? new Date(article.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
              : article.date}
          </span>
          <span>·</span>
          <span>{article.read_time}</span>
        </div>
        <h3 className="article-card__title">{article.title}</h3>
        <p className="article-card__excerpt">{article.excerpt}</p>
        <button className="btn btn-outline article-card__btn">Read Article →</button>
      </div>
    </article>
  )
}

const FALLBACK_POSTS = [
  { id: 1, title: 'The Future of Virtual Celebrity Meet and Greets',      excerpt: 'How digital experiences are redefining fan-celebrity connections worldwide.',               category: 'Industry Trends', read_time: '5 min read', created_at: '2026-03-15' },
  { id: 2, title: 'Platform Update: Enhanced Booking Experience',          excerpt: 'New features to streamline your booking process and improve agent communication.',           category: 'Platform News',   read_time: '3 min read', created_at: '2026-03-10' },
  { id: 3, title: 'Top 10 Most Requested Celebrities in 2026',             excerpt: "Find out which celebrities are trending on StratifyHub and why fans can't get enough.",     category: 'Trending',        read_time: '7 min read', created_at: '2026-03-05' },
  { id: 4, title: 'How to Make the Most of Your VIP Backstage Experience', excerpt: 'Tips and etiquette for your in-person celebrity encounter to ensure an unforgettable time.', category: 'Guide',           read_time: '6 min read', created_at: '2026-02-28' },
]
