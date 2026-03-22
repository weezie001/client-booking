import { useState } from 'react'
import './Footer.css'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001'

export default function Footer() {
  const [email,   setEmail]   = useState('')
  const [status,  setStatus]  = useState(null) // 'ok' | 'error'
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubscribe = async (e) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    setStatus(null)
    try {
      const res  = await fetch(`${API_BASE}/api/newsletter/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Subscribe failed')
      setStatus('ok')
      setMessage(data.message || 'Subscribed!')
      setEmail('')
    } catch (err) {
      setStatus('error')
      setMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__brand">
          <h3 className="footer__logo gradient-text">StratifyHub</h3>
          <p>Your exclusive gateway to world-class celebrity talent and unforgettable experiences.</p>
          <div className="footer__social">
            <a href="#" aria-label="Twitter">𝕏</a>
            <a href="#" aria-label="Instagram">📷</a>
            <a href="#" aria-label="LinkedIn">in</a>
          </div>
        </div>

        <div className="footer__links">
          <div>
            <h4>Platform</h4>
            <a href="/#talent">Browse Talent</a>
            <a href="/blog">News & Blog</a>
            <a href="/auth">Login / Register</a>
          </div>
          <div>
            <h4>Company</h4>
            <a href="#">About Us</a>
            <a href="#">Contact</a>
            <a href="#">Privacy Policy</a>
          </div>
        </div>

        <div className="footer__newsletter">
          <h4>Stay Updated</h4>
          <p>Get the latest news and exclusive offers.</p>
          {status === 'ok' ? (
            <p className="newsletter-success">{message}</p>
          ) : (
            <form className="newsletter-form" onSubmit={handleSubscribe}>
              <input
                type="email"
                className="input-field"
                placeholder="Your email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? '…' : 'Subscribe'}
              </button>
            </form>
          )}
          {status === 'error' && <p className="newsletter-error">{message}</p>}
        </div>
      </div>

      <div className="footer__bottom">
        <div className="container">
          <p>© {new Date().getFullYear()} StratifyHub. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
