// Shared site chrome: header + footer for marketing pages.
import { Link } from 'react-router-dom';

export function BrandMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3h-3zM18 18h3v3h-3z" />
    </svg>
  );
}

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="wrap">
        <Link className="brand" to="/">
          <span className="brand-mark"><BrandMark /></span>
          <span>ReviewSign<small>by EtchWonders</small></span>
        </Link>
        <nav className="site-nav">
          <a href="/#templates">Templates</a>
          <a href="/#features">Why it works</a>
          <a href="/#pricing">Pricing</a>
          <a href="/#faq">FAQ</a>
          <Link to="/design" className="btn btn-primary btn-sm">Open the designer</Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <p>
          © 2026 EtchWonders · Brisbane, Australia · <a href="mailto:admin@etchwonders.com">admin@etchwonders.com</a><br />
          For your industry: <Link to="/cafes">cafés &amp; restaurants</Link> · <Link to="/salons">salons &amp; beauty</Link> · <Link to="/trades">trades &amp; services</Link>
        </p>
        <p>ReviewSign is not affiliated with Google. Google and the Google logo are trademarks of Google LLC.</p>
      </div>
    </footer>
  );
}
