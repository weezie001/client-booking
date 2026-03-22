import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../api'
import './DashboardPage.css'

const STATUS_COLORS = {
  pending:   '#c9a227',
  confirmed: '#22c55e',
  completed: '#6366f1',
  cancelled: '#ef4444',
}

const fmt = (dateStr) =>
  new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

export default function DashboardPage() {
  const { user, token }               = useAuth()
  const [bookings, setBookings]       = useState([])
  const [loading,  setLoading]        = useState(true)
  const [cancelling, setCancelling]   = useState(null)
  const [error,    setError]          = useState('')

  useEffect(() => {
    apiFetch('/api/bookings', {}, token)
      .then(setBookings)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [token])

  const handleCancel = async (bookingId) => {
    if (!confirm('Cancel this booking?')) return
    setCancelling(bookingId)
    try {
      const updated = await apiFetch(
        `/api/bookings/${bookingId}`,
        { method: 'PATCH', body: JSON.stringify({ status: 'cancelled' }) },
        token
      )
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: updated.status } : b))
    } catch (err) {
      setError(err.message)
    } finally {
      setCancelling(null)
    }
  }

  return (
    <main className="dashboard">
      <div className="bg-glow" style={{ top: 0, left: '20%' }} />
      <div className="container dashboard__inner">

        {/* Header */}
        <div className="dashboard__header animate-fade">
          <div>
            <h1>My <span className="gradient-text">Dashboard</span></h1>
            <p>Welcome back, {user?.name}!</p>
          </div>
          <Link to="/" className="btn btn-primary">Browse Talent</Link>
        </div>

        {/* Profile Card */}
        <div className="dash-profile glass-panel animate-fade">
          <div className="dash-profile__avatar">{user?.name?.charAt(0)?.toUpperCase()}</div>
          <div className="dash-profile__info">
            <h3>{user?.name}</h3>
            <p>{user?.email}</p>
            <span className={`dash-badge ${user?.role === 'admin' ? 'dash-badge--admin' : ''}`}>
              {user?.role === 'admin' ? 'Admin' : 'Member'}
            </span>
          </div>
          <div className="dash-profile__stat">
            <span className="gradient-text">{bookings.length}</span>
            <small>Total Bookings</small>
          </div>
        </div>

        {/* Bookings */}
        <section className="dash-section">
          <h2 className="dash-section__title">Your Bookings</h2>

          {error && <div className="auth-alert auth-alert--error">{error}</div>}

          {loading ? (
            <div className="dash-loading">
              {[1,2,3].map(i => <div key={i} className="booking-card-skeleton glass-panel" />)}
            </div>
          ) : bookings.length === 0 ? (
            <div className="dash-empty glass-panel">
              <p>You have no bookings yet.</p>
              <Link to="/" className="btn btn-primary" style={{ marginTop: 16 }}>Book Your First Experience</Link>
            </div>
          ) : (
            <div className="bookings-list">
              {bookings.map(b => (
                <div key={b.id} className="booking-item glass-panel">
                  <div className="booking-item__avatar">{b.talent_name?.charAt(0)}</div>

                  <div className="booking-item__info">
                    <h4>{b.talent_name}</h4>
                    <p>{b.industry} · {b.location}</p>
                    <span className="booking-item__package">{b.package_name}</span>
                  </div>

                  <div className="booking-item__meta">
                    <span className="booking-item__price">${Number(b.package_price).toLocaleString()}</span>
                    <span className="booking-item__date">{fmt(b.booked_at)}</span>
                  </div>

                  <div className="booking-item__right">
                    <span
                      className="booking-item__status"
                      style={{ color: STATUS_COLORS[b.status] || '#a1a1aa', borderColor: STATUS_COLORS[b.status] || '#a1a1aa' }}
                    >
                      {b.status}
                    </span>
                    {b.status === 'pending' && (
                      <button
                        className="btn btn-outline booking-item__cancel"
                        onClick={() => handleCancel(b.id)}
                        disabled={cancelling === b.id}
                      >
                        {cancelling === b.id ? '...' : 'Cancel'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
