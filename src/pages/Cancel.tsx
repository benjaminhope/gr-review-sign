import { Link } from 'react-router-dom';
import { SiteHeader } from '../components/Chrome';

export default function Cancel() {
  return (
    <div className="center-page">
      <SiteHeader />
      <main className="center-main">
        <div className="big-card">
          <h1>No worries — nothing was charged.</h1>
          <p className="sub">Your design is safe in this browser, exactly where you left it. Come back whenever you're ready.</p>
          <Link to="/design" className="btn btn-accent btn-lg">Back to my design</Link>
          <p style={{ marginTop: 18 }}><Link to="/" style={{ fontSize: 14, color: 'var(--ink-3)' }}>or return home</Link></p>
        </div>
      </main>
    </div>
  );
}
