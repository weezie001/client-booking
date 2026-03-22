import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import PaymentModal from '../components/PaymentModal'
import './CelebrityDetailPage.css'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001'

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
  const { id }                          = useParams()
  const [selectedPackage, setSelected]  = useState(PACKAGES[1])
  const [celebrity, setCelebrity]       = useState(null)
  const [loading, setLoading]           = useState(true)
  const [showPayment, setShowPayment]   = useState(false)

  const { isLoggedIn } = useAuth()
  const navigate        = useNavigate()

  useEffect(() => {
    fetch(`${API_BASE}/api/talents/${id}`)
      .then(r => { if (!r.ok) throw new Error('Talent not found'); return r.json() })
      .then(data => setCelebrity(data))
      .catch(err => setCelebrity({ error: err.message }))
      .finally(() => setLoading(false))
  }, [id])

  const handleBooking = () => {
    if (!isLoggedIn) {
      navigate(`/auth?redirect=${encodeURIComponent(`/celebrity/${id}`)}`)
      return
    }
    setShowPayment(true)
  }

  if (loading) return (
    <main className="detail-page">
      <div className="container detail-page__inner">
        <div className="detail-skeleton glass-panel" />
      </div>
    </main>
  )

  if (celebrity?.error) return (
    <main className="detail-page">
      <div className="container detail-page__inner">
        <Link to="/" className="detail-back">← Back to Talent</Link>
        <div className="glass-panel" style={{ padding: '40px', marginTop: '24px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>Could not load talent: {celebrity.error}</p>
        </div>
      </div>
    </main>
  )

  return (
    <main className="detail-page">
      <div className="bg-glow" style={{ top: 0, right: 0 }} />
      <div className="container detail-page__inner">
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

            <h2 className="detail-section-title">Booking Packages</h2>
            <div className="packages">
              {PACKAGES.map(pkg => (
                <div
                  key={pkg.id}
                  className={`package-card glass-panel ${selectedPackage.id === pkg.id ? 'package-card--selected' : ''} ${pkg.featured ? 'package-card--featured' : ''}`}
                  onClick={() => setSelected(pkg)}
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

              <button className="btn btn-primary booking-card__cta" onClick={handleBooking}>
                {isLoggedIn ? 'Confirm Booking' : 'Sign In to Book'}
              </button>
              <button className="btn btn-outline booking-card__chat" onClick={() => {}}>
                Chat with Agent
              </button>

              <p className="booking-card__note">
                🔒 Secure payment powered by Stripe. Full refund within 48 hours of booking.
              </p>
            </div>
          </aside>
        </div>
      </div>

      {showPayment && (
        <PaymentModal
          celebrity={celebrity}
          pkg={selectedPackage}
          onClose={() => setShowPayment(false)}
          onSuccess={() => {
            setShowPayment(false)
            navigate('/dashboard')
          }}
        />
      )}
    </main>
  )
}
