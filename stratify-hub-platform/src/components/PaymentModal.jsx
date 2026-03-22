import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../api'
import './PaymentModal.css'

const API_BASE    = import.meta.env.VITE_API_BASE || 'http://localhost:3001'
const STRIPE_PK   = import.meta.env.VITE_STRIPE_PK || ''
const stripePromise = STRIPE_PK ? loadStripe(STRIPE_PK) : null

const METHODS = [
  { id: 'btc',     label: 'Bitcoin',   icon: '₿',  desc: 'Pay with Bitcoin (BTC)' },
  { id: 'usdt',    label: 'USDT',      icon: '₮',  desc: 'Pay with Tether (TRC-20)' },
  { id: 'cashapp', label: 'Cash App',  icon: '$',  desc: 'Pay with Cash App' },
  { id: 'venmo',   label: 'Venmo',     icon: 'V',  desc: 'Pay with Venmo' },
  { id: 'paypal',  label: 'PayPal',    icon: 'P',  desc: 'Pay with PayPal' },
  { id: 'giftcard',label: 'Gift Card', icon: '🎁', desc: 'Redeem a gift card code' },
]

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
        { method: 'POST', body: JSON.stringify({ talent_id: celebrity.id, package_name: pkg.name, package_price: pkg.price, payment_intent_id: intentId, payment_method: 'Stripe' }) },
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

// ── Alternative payment instructions ─────────────────────────────────────────
function AltPayment({ method, celebrity, pkg, onSuccess, onBack }) {
  const { token } = useAuth()
  const [payInfo,   setPayInfo]   = useState(null)
  const [giftCode,  setGiftCode]  = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [copied,    setCopied]    = useState(false)

  useEffect(() => {
    fetch(`${API_BASE}/api/payment-info`)
      .then(r => r.json())
      .then(setPayInfo)
      .catch(() => setPayInfo({}))
  }, [])

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleConfirm = async () => {
    setError('')
    setLoading(true)
    try {
      await apiFetch(
        '/api/bookings',
        {
          method: 'POST',
          body: JSON.stringify({
            talent_id: celebrity.id,
            package_name: pkg.name,
            package_price: pkg.price,
            payment_method: method.label,
            gift_card_code: method.id === 'giftcard' ? giftCode.trim() : undefined,
          }),
        },
        token
      )
      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const renderInstructions = () => {
    if (!payInfo) return <p className="pay-loading">Loading payment info…</p>

    if (method.id === 'btc') return (
      <div className="pay-instructions">
        <p className="pay-instructions__label">Send <strong className="pay-amount">${pkg.price.toLocaleString()}</strong> worth of BTC to:</p>
        <div className="pay-address">
          <code>{payInfo.btc || 'Address not configured'}</code>
          {payInfo.btc && <button className="pay-copy" onClick={() => copyToClipboard(payInfo.btc)}>{copied ? '✓ Copied' : 'Copy'}</button>}
        </div>
        <p className="pay-note">Network: Bitcoin (BTC). After sending, click "I've Paid" below.</p>
      </div>
    )

    if (method.id === 'usdt') return (
      <div className="pay-instructions">
        <p className="pay-instructions__label">Send <strong className="pay-amount">${pkg.price.toLocaleString()} USDT</strong> to:</p>
        <div className="pay-address">
          <code>{payInfo.usdt || 'Address not configured'}</code>
          {payInfo.usdt && <button className="pay-copy" onClick={() => copyToClipboard(payInfo.usdt)}>{copied ? '✓ Copied' : 'Copy'}</button>}
        </div>
        <p className="pay-note">Network: TRON (TRC-20). After sending, click "I've Paid" below.</p>
      </div>
    )

    if (method.id === 'cashapp') return (
      <div className="pay-instructions">
        <p className="pay-instructions__label">Send <strong className="pay-amount">${pkg.price.toLocaleString()}</strong> on Cash App to:</p>
        <div className="pay-address">
          <code>{payInfo.cashapp || 'Tag not configured'}</code>
          {payInfo.cashapp && <button className="pay-copy" onClick={() => copyToClipboard(payInfo.cashapp)}>{copied ? '✓ Copied' : 'Copy'}</button>}
        </div>
        <p className="pay-note">Add "StratifyHub booking" in the note. After sending, click "I've Paid".</p>
      </div>
    )

    if (method.id === 'venmo') return (
      <div className="pay-instructions">
        <p className="pay-instructions__label">Send <strong className="pay-amount">${pkg.price.toLocaleString()}</strong> on Venmo to:</p>
        <div className="pay-address">
          <code>{payInfo.venmo || 'Username not configured'}</code>
          {payInfo.venmo && <button className="pay-copy" onClick={() => copyToClipboard(payInfo.venmo)}>{copied ? '✓ Copied' : 'Copy'}</button>}
        </div>
        <p className="pay-note">Set payment to "Private". After sending, click "I've Paid".</p>
      </div>
    )

    if (method.id === 'paypal') return (
      <div className="pay-instructions">
        <p className="pay-instructions__label">Send <strong className="pay-amount">${pkg.price.toLocaleString()}</strong> on PayPal to:</p>
        <div className="pay-address">
          <code>{payInfo.paypal || 'Email not configured'}</code>
          {payInfo.paypal && <button className="pay-copy" onClick={() => copyToClipboard(payInfo.paypal)}>{copied ? '✓ Copied' : 'Copy'}</button>}
        </div>
        <p className="pay-note">Send as "Friends &amp; Family". After sending, click "I've Paid".</p>
      </div>
    )

    if (method.id === 'giftcard') return (
      <div className="pay-instructions">
        <p className="pay-instructions__label">Enter your StratifyHub gift card code:</p>
        <input
          className="input-field"
          placeholder="XXXX-XXXX-XXXX-XXXX"
          value={giftCode}
          onChange={e => setGiftCode(e.target.value)}
        />
        <p className="pay-note">Gift card must cover the full booking amount of <strong>${pkg.price.toLocaleString()}</strong>.</p>
      </div>
    )
  }

  const canConfirm = method.id === 'giftcard' ? giftCode.trim().length >= 8 : true

  return (
    <div className="pay-alt">
      <button className="pay-back" onClick={onBack}>← Back</button>
      <div className="pay-method-header">
        <span className="pay-method-icon">{method.icon}</span>
        <span>{method.label}</span>
      </div>
      {renderInstructions()}
      {error && <div className="auth-alert auth-alert--error">{error}</div>}
      <button
        className="btn btn-primary payment-form__submit"
        onClick={handleConfirm}
        disabled={loading || !canConfirm}
      >
        {loading ? 'Confirming…' : method.id === 'giftcard' ? 'Redeem & Book' : "I've Paid — Confirm Booking"}
      </button>
    </div>
  )
}

// ── Method selection grid ─────────────────────────────────────────────────────
function MethodSelector({ onSelect }) {
  const methods = stripePromise
    ? [{ id: 'stripe', label: 'Credit Card', icon: '💳', desc: 'Pay securely with card' }, ...METHODS]
    : METHODS

  return (
    <div className="pay-method-grid">
      {methods.map(m => (
        <button key={m.id} className="pay-method-card" onClick={() => onSelect(m)}>
          <span className="pay-method-card__icon">{m.icon}</span>
          <span className="pay-method-card__label">{m.label}</span>
        </button>
      ))}
    </div>
  )
}

// ── Modal shell ───────────────────────────────────────────────────────────────
export default function PaymentModal({ celebrity, pkg, onClose, onSuccess }) {
  const [method, setMethod] = useState(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box glass-panel animate-fade">
        <button className="modal-close" onClick={onClose}>✕</button>

        <h2 className="modal-title gradient-text">Complete Booking</h2>

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

        {!method ? (
          <>
            <p className="pay-select-label">Select payment method</p>
            <MethodSelector onSelect={setMethod} />
          </>
        ) : method.id === 'stripe' ? (
          <Elements stripe={stripePromise}>
            <div className="pay-back-wrap">
              <button className="pay-back" onClick={() => setMethod(null)}>← Back</button>
            </div>
            <StripeCheckout celebrity={celebrity} pkg={pkg} onSuccess={onSuccess} />
          </Elements>
        ) : (
          <AltPayment
            method={method}
            celebrity={celebrity}
            pkg={pkg}
            onSuccess={onSuccess}
            onBack={() => setMethod(null)}
          />
        )}

        <p className="modal-note">🔒 Secure booking. Full refund within 48 hours.</p>
      </div>
    </div>
  )
}
