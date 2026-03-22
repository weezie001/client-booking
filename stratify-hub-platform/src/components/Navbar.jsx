import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Navbar.css'

export default function Navbar() {
  const [scrolled, setScrolled]       = useState(false)
  const [menuOpen, setMenuOpen]       = useState(false)
  const { user, isLoggedIn, isAdmin, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const menuRef  = useRef(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = () => {
    logout()
    setMenuOpen(false)
    navigate('/')
  }

  return (
    <header className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
      <div className="container navbar__inner">
        <Link to="/" className="navbar__logo">
          StratifyHub
        </Link>

        <nav className="navbar__links">
          <Link to="/"     className={location.pathname === '/'     ? 'active' : ''}>Home</Link>
          <a href="/#talent">Talent</a>
          <Link to="/blog" className={location.pathname === '/blog' ? 'active' : ''}>Blog</Link>
        </nav>

        <div className="navbar__actions">
          {isLoggedIn ? (
            <div className="navbar__user" ref={menuRef}>
              <button
                className="navbar__user-btn"
                onClick={() => setMenuOpen(o => !o)}
                aria-expanded={menuOpen}
              >
                <span className="navbar__user-avatar">{user?.name?.charAt(0)?.toUpperCase()}</span>
                <span className="navbar__user-name">{user?.name?.split(' ')[0]}</span>
                <span className="navbar__chevron">{menuOpen ? '▴' : '▾'}</span>
              </button>

              {menuOpen && (
                <div className="navbar__dropdown glass-panel">
                  <Link to="/dashboard" onClick={() => setMenuOpen(false)}>My Bookings</Link>
                  {isAdmin && <Link to="/admin" onClick={() => setMenuOpen(false)}>Admin Panel</Link>}
                  <button onClick={handleLogout}>Logout</button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/auth" className="btn btn-outline">Login</Link>
              <Link to="/auth" className="btn btn-primary">Get Started</Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
