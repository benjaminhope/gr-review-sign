// Pricing tiers — one definition, used by the landing page and the checkout
// modal so displayed prices can never drift from what checkout charges
// (amounts themselves live in the worker; keep TIER_LABELS in sync with it).
import { Link } from 'react-router-dom';

export interface Tier {
  id: 'digital' | 'print' | 'engraved';
  name: string;
  desc: string;
  price: string;
  gst: string;
  features: string[];
  featured?: boolean;
  buttonClass: string;
}

export const TIERS: Tier[] = [
  {
    id: 'digital', name: 'Digital', desc: 'For screens & home printing', price: '$19',
    gst: 'One-time · GST inc.',
    features: ['High-resolution PNG, no watermark', 'Your exact design, instant download', 'Great for laminating or framing'],
    buttonClass: 'btn-ghost',
  },
  {
    id: 'print', name: 'Print pack', desc: 'For professional printing', price: '$39',
    gst: 'One-time · GST inc.', featured: true,
    features: ['Everything in Digital', '300 DPI files sized A5, A4 & 5×7″', 'Safe margins — printer-ready'],
    buttonClass: 'btn-accent',
  },
  {
    id: 'engraved', name: 'Engraved acrylic', desc: 'The real sign, made & posted', price: '$79',
    gst: 'One-time · GST inc. · AU postage included',
    features: ['Your design laser-engraved on acrylic', '~150 × 100 mm with counter stand', 'Ships in 5 business days from Brisbane'],
    buttonClass: 'btn-primary',
  },
];

export function PricingRow({ onBuy }: { onBuy?: (tier: Tier['id']) => void }) {
  return (
    <div className="pricing-row">
      {TIERS.map((t) => (
        <div key={t.id} className={`price-card${t.featured ? ' featured' : ''}`}>
          {t.featured && <div className="price-flag">Most popular</div>}
          <h3>{t.name}</h3>
          <p className="price-desc">{t.desc}</p>
          <div className="price-amount">{t.price} <small>AUD</small></div>
          <div className="price-gst">{t.gst}</div>
          <ul className="price-feats">{t.features.map((f) => <li key={f}>{f}</li>)}</ul>
          {onBuy
            ? <button className={`btn ${t.buttonClass} checkout-btn`} onClick={() => onBuy(t.id)}>
                {t.id === 'engraved' ? `Order engraved — ${t.price}` : `Buy ${t.name} — ${t.price}`}
              </button>
            : <Link to="/design" className={`btn ${t.buttonClass}`}>Start designing</Link>}
        </div>
      ))}
    </div>
  );
}
