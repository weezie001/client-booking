import { useState } from 'react'
import './AuthPage.css'

export default function AuthPage() {
  const [mode, setMode] = useState('login') // 'login' | 'register'

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

          <form onSubmit={e => e.preventDefault()} className="auth-form">
            {mode === 'register' && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="input-field" type="text" placeholder="Your full name" />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="input-field" type="email" placeholder="your@email.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="input-field" type="password" placeholder="••••••••" />
            </div>

            {mode === 'login' && (
              <div className="auth-form__forgot">
                <button type="button" onClick={() => {}}>Forgot Password?</button>
              </div>
            )}

            <button type="submit" className="btn btn-primary auth-form__submit">
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="auth-card__footer">
            {mode === 'login' ? (
              <p>Don't have an account? <button onClick={() => setMode('register')}>Register Now</button></p>
            ) : (
              <p>Already have an account? <button onClick={() => setMode('login')}>Sign In</button></p>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
