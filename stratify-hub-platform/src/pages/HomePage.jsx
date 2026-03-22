import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import './HomePage.css'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001'

export default function HomePage() {
  const [talents, setTalents] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE}/api/talents`)
      .then(r => r.json())
      .then(data => setTalents(data))
      .catch(() => setTalents([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = talents.filter(t =>
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.industry?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <main className="home">
      {/* Hero */}
      <section className="hero">
        <div className="bg-glow" style={{ top: '-100px', left: '50%', transform: 'translateX(-50%)' }} />
        <div className="container hero__content animate-fade">
          <span className="hero__badge">Premium Talent Network</span>
          <h1>Exclusive Access.<br /><span className="gradient-text">Unforgettable Moments.</span></h1>
          <p className="hero__sub">
            Connect with world-class celebrity talent for virtual meet &amp; greets,
            VIP experiences, and personalized sessions.
          </p>
          <div className="hero__search glass-panel">
            <span className="hero__search-icon">🔍</span>
            <input
              className="hero__search-input"
              placeholder="Search by name or industry..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="hero__ctas">
            <a href="#talent" className="btn btn-primary">Browse Talent</a>
            <Link to="/auth" className="btn btn-outline">Create Account</Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="stats">
        <div className="container stats__grid">
          {[['500+', 'Celebrity Partners'], ['50K+', 'Bookings Completed'], ['98%', 'Satisfaction Rate'], ['24/7', 'Agent Support']].map(([val, label]) => (
            <div key={label} className="stats__item glass-panel">
              <span className="stats__value gradient-text">{val}</span>
              <span className="stats__label">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Talent Grid */}
      <section id="talent" className="talent-section">
        <div className="container">
          <div className="section-header">
            <h2>Featured <span className="gradient-text">Celebrities</span></h2>
            <p>Curated A-list talent available for exclusive bookings</p>
          </div>

          {loading ? (
            <div className="loading-grid">
              {[...Array(6)].map((_, i) => <div key={i} className="talent-card talent-card--skeleton" />)}
            </div>
          ) : (
            <div className="talent-grid grid grid-cols-3">
              {filtered.map(talent => (
                <TalentCard key={talent.id} talent={talent} />
              ))}
              {filtered.length === 0 && (
                <p className="no-results">No talent found matching "{search}"</p>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

function TalentCard({ talent }) {
  return (
    <div className="talent-card glass-panel">
      <div className="talent-card__avatar">
        {talent.avatar_url
          ? <img src={talent.avatar_url} alt={talent.name} />
          : <div className="talent-card__initials">{talent.name?.charAt(0)}</div>
        }
        {talent.featured && <span className="talent-card__badge">⭐ Featured</span>}
      </div>
      <div className="talent-card__body">
        <h3 className="talent-card__name">{talent.name}</h3>
        <p className="talent-card__industry">{talent.industry}</p>
        <div className="talent-card__meta">
          <span>📍 {talent.location || 'Global'}</span>
          <span className="talent-card__rate">From ${talent.base_rate?.toLocaleString()}</span>
        </div>
        <div className="talent-card__actions">
          <Link to={`/celebrity/${talent.id}`} className="btn btn-primary">Book Now</Link>
          <button className="btn btn-outline">Donate</button>
        </div>
      </div>
    </div>
  )
}

