import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../api'
import './AuthPage.css'

export default function AuthPage() {
  const [mode, setMode]       = useState('login')
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')

  const { login, isLoggedIn } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const redirect = params.get('redirect') || '/dashboard'

  useEffect(() => {
    if (isLoggedIn) navigate(redirect, { replace: true })
  }, [isLoggedIn, navigate, redirect])

  const switchMode = (m) => {
    setMode(m)
    setError('')
    setSuccess('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'register') {
        const data = await apiFetch('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ name, email, password }),
        })
        login(data.token, data.user)
        navigate(redirect, { replace: true })
      } else {
        const data = await apiFetch('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        })
        login(data.token, data.user)
        navigate(redirect, { replace: true })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!email) { setError('Enter your email address first'); return }
    setError('')
    setLoading(true)
    try {
      await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      setSuccess('If that email is registered, you will receive a reset link.')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="bg-glow" style={{ top: 0, left: '50%', transform: 'translateX(-50%)' }} />
      <div className="container auth-page__inner">
        <div className="auth-card glass-panel animate-fade">
          <h1 className="auth-card__title gradient-text">
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="auth-card__sub">
            {mode === 'login'
              ? 'Sign in to access your exclusive bookings.'
              : 'Join StratifyHub and unlock celebrity access.'}
          </p>

          {error   && <div className="auth-alert auth-alert--error">{error}</div>}
          {success && <div className="auth-alert auth-alert--success">{success}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            {mode === 'register' && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  className="input-field"
                  type="text"
                  placeholder="Your full name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                className="input-field"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                className="input-field"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            {mode === 'login' && (
              <div className="auth-form__forgot">
                <button type="button" onClick={handleForgotPassword} disabled={loading}>
                  Forgot Password?
                </button>
              </div>
            )}

            <button type="submit" className="btn btn-primary auth-form__submit" disabled={loading}>
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="auth-card__footer">
            {mode === 'login' ? (
              <p>Don't have an account? <button onClick={() => switchMode('register')}>Register Now</button></p>
            ) : (
              <p>Already have an account? <button onClick={() => switchMode('login')}>Sign In</button></p>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
