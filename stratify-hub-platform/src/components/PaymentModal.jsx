import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../api'
import './PaymentModal.css'

const STRIPE_PK     = import.meta.env.VITE_STRIPE_PK || ''
const stripePromise = STRIPE_PK ? loadStripe(STRIPE_PK) : null

// ── Stripe card checkout ──────────────────────────────────────────────────────
function StripeCheckout({ celebrity, pkg, onSuccess }) {
  const stripe    = useStripe()
  const elements  = useElements()
  const { token } = useAuth()
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setError('')
    setLoading(true)
    try {
      const { clientSecret, id: intentId } = await apiFetch(
        '/api/payments/create-intent',
        { method: 'POST', body: JSON.stringify({ amount: pkg.price, talentId: celebrity.id, packageName: pkg.name }) },
        token
      )
      const { error: stripeErr } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: elements.getElement(CardElement) },
      })
      if (stripeErr) { setError(stripeErr.message); setLoading(false); return }

      await apiFetch(
        '/api/bookings',
        { method: 'POST', body: JSON.stringify({ talent_id: celebrity.id, package_name: pkg.name, package_price: pkg.price, payment_intent_id: intentId }) },
        token
      )
      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="payment-form">
      <div className="payment-form__card-wrap">
        <label className="form-label">Card Details</label>
        <div className="payment-form__card-element">
          <CardElement options={{
            style: {
              base: { color: '#fff', fontFamily: 'Inter, sans-serif', fontSize: '16px', '::placeholder': { color: '#a1a1aa' } },
              invalid: { color: '#ff6b6b' },
            },
          }} />
        </div>
      </div>
      {error && <div className="auth-alert auth-alert--error">{error}</div>}
      <button type="submit" className="btn btn-primary payment-form__submit" disabled={loading || !stripe}>
        {loading ? 'Processing...' : `Pay $${pkg.price.toLocaleString()}`}
      </button>
    </form>
  )
}

// ── Direct booking (no payment step) ─────────────────────────────────────────
function DirectBooking({ celebrity, pkg, onSuccess }) {
  const { token } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const handleConfirm = async () => {
    setError('')
    setLoading(true)
    try {
      await apiFetch(
        '/api/bookings',
        { method: 'POST', body: JSON.stringify({ talent_id: celebrity.id, package_name: pkg.name, package_price: pkg.price }) },
        token
      )
      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="payment-direct">
      {error && <div className="auth-alert auth-alert--error">{error}</div>}
      <button className="btn btn-primary payment-form__submit" onClick={handleConfirm} disabled={loading}>
        {loading ? 'Confirming...' : 'Confirm Booking'}
      </button>
    </div>
  )
}

// ── Modal shell ───────────────────────────────────────────────────────────────
export default function PaymentModal({ celebrity, pkg, onClose, onSuccess }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box glass-panel animate-fade">
        <button className="modal-close" onClick={onClose}>✕</button>

        <h2 className="modal-title gradient-text">Confirm Booking</h2>

        <div className="modal-summary">
          <div className="modal-summary__row">
            <span>Talent</span>
            <span>{celebrity.name}</span>
          </div>
          <div className="modal-summary__row">
            <span>Package</span>
            <span>{pkg.name}</span>
          </div>
          <div className="modal-summary__row">
            <span>Duration</span>
            <span>{pkg.duration}</span>
          </div>
          <div className="modal-summary__row modal-summary__row--total">
            <span>Total</span>
            <span className="gradient-text">${pkg.price.toLocaleString()}</span>
          </div>
        </div>

        {stripePromise ? (
          <Elements stripe={stripePromise}>
            <StripeCheckout celebrity={celebrity} pkg={pkg} onSuccess={onSuccess} />
          </Elements>
        ) : (
          <DirectBooking celebrity={celebrity} pkg={pkg} onSuccess={onSuccess} />
        )}

        <p className="modal-note">🔒 Secure booking. Full refund within 48 hours.</p>
      </div>
    </div>
  )
}
