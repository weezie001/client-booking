import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { apiFetch } from '../api'
import './AuthPage.css'

export default function ResetPasswordPage() {
  const [password, setPassword]   = useState('')
  const [confirm,  setConfirm]    = useState('')
  const [error,    setError]      = useState('')
  const [success,  setSuccess]    = useState('')
  const [loading,  setLoading]    = useState(false)
  const [params]                  = useSearchParams()
  const navigate                  = useNavigate()
  const token                     = params.get('token') || ''

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    try {
      const data = await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      })
      setSuccess(data.message)
      setTimeout(() => navigate('/auth'), 2500)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!token) return (
    <main className="auth-page">
      <div className="container auth-page__inner">
        <div className="auth-card glass-panel animate-fade">
          <h1 className="auth-card__title gradient-text">Invalid Link</h1>
          <p className="auth-card__sub">This reset link is invalid or has expired.</p>
        </div>
      </div>
    </main>
  )

  return (
    <main className="auth-page">
      <div className="bg-glow" style={{ top: 0, left: '50%', transform: 'translateX(-50%)' }} />
      <div className="container auth-page__inner">
        <div className="auth-card glass-panel animate-fade">
          <h1 className="auth-card__title gradient-text">Reset Password</h1>
          <p className="auth-card__sub">Choose a new password for your account.</p>

          {error   && <div className="auth-alert auth-alert--error">{error}</div>}
          {success && <div className="auth-alert auth-alert--success">{success}</div>}

          {!success && (
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  className="input-field"
                  type="password"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input
                  className="input-field"
                  type="password"
                  placeholder="Repeat password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary auth-form__submit" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
