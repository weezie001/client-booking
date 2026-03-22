import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import './CelebrityDetailPage.css'

const API_BASE = 'http://localhost:3001'

const PACKAGES = [
  {
    id: 'meet',
    name: 'Meet & Greet',
    price: 500,
    duration: '15-minute digital interaction',
    includes: ['Live video call', 'Personalized shoutout', 'Digital autograph', 'Exclusive photo'],
  },
  {
    id: 'vip',
    name: 'Backstage VIP Pass',
    price: 2500,
    duration: '2-hour in-person experience',
    includes: ['VIP backstage access', 'Private meet & greet', 'Signed memorabilia', 'Professional photos', 'Exclusive gift bag'],
    featured: true,
  },
  {
    id: 'studio',
    name: 'Studio Session',
    price: 10000,
    duration: '4-hour premium hangout',
    includes: ['Full studio access', 'Collaborative session', 'Custom content creation', 'All previous perks', 'Lifetime memory package'],
  },
]

export default function CelebrityDetailPage() {
  const { id } = useParams()
  const [selectedPackage, setSelectedPackage] = useState(PACKAGES[1])
  const [celebrity, setCelebrity] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE}/api/talents/${id}`)
      .then(r => r.json())
      .then(data => setCelebrity(data))
      .catch(() => setCelebrity({
        id,
        name: 'Christopher Larosa',
        industry: 'Music',
        location: 'Los Angeles, CA',
        bio: 'Grammy-nominated artist and cultural icon known for his electrifying performances and philanthropic work.',
        rating: 4.9,
        reviews: 312,
      }))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <main className="detail-page">
      <div className="container detail-page__inner">
        <div className="detail-skeleton glass-panel" />
      </div>
    </main>
  )

  return (
    <main className="detail-page">
      <div className="bg-glow" style={{ top: 0, right: 0 }} />
      <div className="container detail-page__inner">
        {/* Back */}
        <Link to="/" className="detail-back">← Back to Talent</Link>

        <div className="detail-layout">
          {/* Left - Celebrity Info */}
          <div className="detail-info animate-fade">
            <div className="detail-avatar glass-panel">
              <div className="detail-avatar__placeholder">{celebrity.name.charAt(0)}</div>
            </div>

            <h1 className="detail-name">{celebrity.name}</h1>
            <p className="detail-industry">{celebrity.industry} · {celebrity.location}</p>

            <div className="detail-stats">
              <div className="detail-stat">
                <span className="detail-stat__val">⭐ {celebrity.rating}</span>
                <span className="detail-stat__label">Rating</span>
              </div>
              <div className="detail-stat">
                <span className="detail-stat__val">{celebrity.reviews}</span>
                <span className="detail-stat__label">Reviews</span>
              </div>
              <div className="detail-stat">
                <span className="detail-stat__val">Verified</span>
                <span className="detail-stat__label">Identity</span>
              </div>
            </div>

            <p className="detail-bio">{celebrity.bio}</p>

            {/* Packages */}
            <h2 className="detail-section-title">Booking Packages</h2>
            <div className="packages">
              {PACKAGES.map(pkg => (
                <div
                  key={pkg.id}
                  className={`package-card glass-panel ${selectedPackage.id === pkg.id ? 'package-card--selected' : ''} ${pkg.featured ? 'package-card--featured' : ''}`}
                  onClick={() => setSelectedPackage(pkg)}
                >
                  {pkg.featured && <div className="package-card__badge">Most Popular</div>}
                  <div className="package-card__header">
                    <h3>{pkg.name}</h3>
                    <span className="package-card__price">${pkg.price.toLocaleString()}</span>
                  </div>
                  <p className="package-card__duration">{pkg.duration}</p>
                  <ul className="package-card__includes">
                    {pkg.includes.map(item => <li key={item}>✓ {item}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Right - Booking Sidebar */}
          <aside className="booking-sidebar">
            <div className="booking-card glass-panel">
              <h3 className="booking-card__title">Your Booking</h3>

              <div className="booking-card__package">
                <span>{selectedPackage.name}</span>
                <span className="gradient-text">${selectedPackage.price.toLocaleString()}</span>
              </div>

              <div className="booking-card__summary">
                <div><span>Duration</span><span>{selectedPackage.duration}</span></div>
                <div><span>Payment</span><span>Stripe (Secure)</span></div>
                <div><span>Booking Fee</span><span>$0</span></div>
              </div>

              <div className="booking-card__total">
                <span>Total</span>
                <span className="gradient-text">${selectedPackage.price.toLocaleString()}</span>
              </div>

              <Link to="/auth" className="btn btn-primary booking-card__cta">
                Confirm Booking
              </Link>
              <button className="btn btn-outline booking-card__chat">
                Chat with Agent
              </button>

              <p className="booking-card__note">
                🔒 Secure payment powered by Stripe. Full refund within 48 hours of booking.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}
