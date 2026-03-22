import './Footer.css'

export default function Footer() {
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
          <form className="newsletter-form" onSubmit={e => e.preventDefault()}>
            <input type="email" className="input-field" placeholder="Your email address" />
            <button type="submit" className="btn btn-primary">Subscribe</button>
          </form>
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
