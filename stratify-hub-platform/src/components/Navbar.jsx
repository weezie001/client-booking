import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import './Navbar.css'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
      <div className="container navbar__inner">
        <Link to="/" className="navbar__logo">
          StratifyHub
        </Link>

        <nav className="navbar__links">
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>Home</Link>
          <a href="/#talent">Talent</a>
          <Link to="/blog" className={location.pathname === '/blog' ? 'active' : ''}>Blog</Link>
        </nav>

        <div className="navbar__actions">
          <Link to="/auth" className="btn btn-outline">Login</Link>
          <Link to="/auth" className="btn btn-primary">Get Started</Link>
        </div>
      </div>
    </header>
  )
}
