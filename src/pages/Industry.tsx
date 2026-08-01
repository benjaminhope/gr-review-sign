// One component, three industry landing pages — the copy is data.
import { Link, useParams, Navigate } from 'react-router-dom';
import { SiteHeader, SiteFooter } from '../components/Chrome';
import TemplateGallery from '../components/TemplateGallery';

interface IndustrySpec {
  slug: string;
  kicker: string;
  title: React.ReactNode;
  sub: string;
  ctaTemplate: string;
  ctaLabel: string;
  galleryKicker: string;
  galleryTitle: string;
  templates: { id: string; name?: string; cta?: string }[];
  whyTitle: string;
  why: { title: string; body: string }[];
  faqTitle: string;
  faqs: { q: string; a: string }[];
  closing: React.ReactNode;
}

const INDUSTRIES: Record<string, IndustrySpec> = {
  cafes: {
    slug: 'cafes',
    kicker: 'For cafés & restaurants',
    title: <>The counter sign that turns <em>great coffee</em> into Google reviews.</>,
    sub: 'Your regulars love you — Google just doesn\'t know it yet. A small sign by the register or on each table does the asking while your staff pour. Design yours to match the room: chalkboard, warm timber, or clean and modern.',
    ctaTemplate: 'chalk', ctaLabel: 'Design your café sign — free',
    galleryKicker: 'Made for hospitality', galleryTitle: 'Styles that suit a café, not an office.',
    templates: [
      { id: 'chalk', name: 'Marigold Espresso' },
      { id: 'timber', name: 'The Woodshed Cafe' },
      { id: 'classic', name: 'Harvest Lane Deli' },
      { id: 'pop', name: 'Scoop! Gelato' },
      { id: 'midnight', name: 'Studio North Coffee' },
    ],
    whyTitle: 'Reviews are how new locals pick a café.',
    why: [
      { title: 'Rating drives foot traffic', body: '"Best coffee near me" is decided by Google rating and review count. Every extra review nudges you up that list.' },
      { title: 'Ask at the happy moment', body: 'The best time to ask is right after the flat white lands — exactly where the sign sits. No awkward asking, no forgotten follow-ups.' },
      { title: 'Survives the counter', body: 'Go engraved acrylic and it wipes clean, doesn\'t fade, and doesn\'t curl like a laminated print next to the machine.' },
    ],
    faqTitle: 'Café owners ask us…',
    faqs: [
      { q: 'Where should the sign go?', a: 'The register is the classic spot — everyone pauses there to pay. Table talkers work well for table service, and a second sign near the door catches takeaway regulars.' },
      { q: 'Can it match our brand colours?', a: 'Yes — every colour on the sign is editable, including the QR itself. Start from a template and adjust, or build from scratch. The built-in scan check makes sure it still scans.' },
      { q: 'Is asking for reviews allowed?', a: 'Asking is fine; incentivising isn\'t. A neutral "enjoyed your coffee? tell Google" sign is exactly what Google expects businesses to do.' },
      { q: 'What sizes work best?', a: 'A5 suits counters; A6 table talkers for tables. The print pack includes A5, A4 and 5×7″ at 300 DPI, and the engraved sign is ~150×100 mm with a stand.' },
    ],
    closing: <>Two minutes now, reviews every week after.</>,
  },
  salons: {
    slug: 'salons',
    kicker: 'For salons, hair & beauty',
    title: <>They leave feeling <em>amazing</em>. Catch it in a review.</>,
    sub: 'The moment a client checks the mirror is the moment to ask. An elegant sign at reception — gold on black, soft blush, or your exact brand colours — invites the review while the feeling is fresh.',
    ctaTemplate: 'goldblack', ctaLabel: 'Design your salon sign — free',
    galleryKicker: 'Made for your space', galleryTitle: 'Designs that belong at a styling station, not a servo.',
    templates: [
      { id: 'goldblack', name: 'Velvet & Co. Hair' },
      { id: 'blush', name: 'Petal Beauty Bar' },
      { id: 'mint', name: 'Glow Skin Studio', cta: 'Loved your treatment? Share it.' },
      { id: 'midnight', name: 'Mane Society' },
      { id: 'classic', name: 'The Brow Room' },
    ],
    whyTitle: 'New clients read reviews before they book.',
    why: [
      { title: 'Reviews win the booking', body: 'Hair and beauty is trust-first: people scroll reviews before trying someone new with their hair, brows or skin. Volume and recency both count.' },
      { title: 'Matches your fit-out', body: 'Fully customisable colours, fonts and shapes — the arch and rounded formats sit beautifully next to a mirror or reception till.' },
      { title: 'Engraved feels premium', body: 'A laser-engraved acrylic sign reads as considered — the same way your interior does. No curling laminate at reception.' },
    ],
    faqTitle: 'Salon owners ask us…',
    faqs: [
      { q: 'Where does the sign work best?', a: 'Reception, right where clients pay — plus one at each station works brilliantly for chairs with regulars. Small formats suit shelf and mirror edges.' },
      { q: 'Can it carry our Instagram too?', a: 'Yes — add your Instagram and Facebook handles to the sign in the designer. The QR still points at your Google review page (that\'s the one that grows bookings).' },
      { q: 'Can we match our exact brand colour?', a: 'Every element takes a custom hex colour, including the QR and its backing panel. The scan check warns you if a combination would stop phones reading it.' },
      { q: 'What about clients who don\'t use Google?', a: 'Most have a Google account even if they never post — leaving a review takes one tap after the scan. The sign\'s small print tells them just to point their camera.' },
    ],
    closing: <>Your work already earns the five stars.<br />Put up the sign that collects them.</>,
  },
  trades: {
    slug: 'trades',
    kicker: 'For trades & local services',
    title: <>Good jobs deserve <em>good reviews</em>. Make asking automatic.</>,
    sub: 'You win work on your Google rating — sparkies, plumbers, landscapers, cleaners all do. A bold QR card handed over at job\'s end (or printed on the invoice) asks for the review while the customer\'s still impressed.',
    ctaTemplate: 'trade', ctaLabel: 'Design your review card — free',
    galleryKicker: 'Built to be noticed', galleryTitle: 'High-vis for your reputation.',
    templates: [
      { id: 'trade', name: 'Brightline Electrical' },
      { id: 'ocean', name: 'Anchor Plumbing', cta: 'Happy with the job? Review us!' },
      { id: 'classic', name: 'GreenEdge Landscaping', cta: 'Happy with the work? Tell Google!' },
      { id: 'midnight', name: 'Apex Air & Electrical' },
      { id: 'timber', name: 'HomeSafe Inspections', cta: 'Happy with the work? Tell Google!' },
    ],
    whyTitle: 'Local search is a review contest.',
    why: [
      { title: '"Plumber near me" = reviews', body: 'The map pack ranks on rating, review count and recency. Ten fresh reviews can move you from invisible to first call.' },
      { title: 'Works beyond the counter', body: 'You don\'t have a shopfront — so put the QR on invoices, quote emails, a card handed over at completion, or a sticker on the ute.' },
      { title: 'Ask while they\'re happy', body: 'The gap between "you legend" at handover and the review never happening is about two hours. The card closes that gap on the spot.' },
    ],
    faqTitle: 'Tradies ask us…',
    faqs: [
      { q: 'What format works for trades?', a: 'The digital file scales anywhere: print business-card size for handovers, A5 for the office, or drop the PNG into your invoice template. The landscape format suits cards best.' },
      { q: 'Can I put it on the ute?', a: 'Yes — buy the digital file and any signwriter can print it as a decal. Keep the QR at least 10 cm square for scanning at a glance, and test-scan the proof before it goes on.' },
      { q: 'I do jobs across town — where does the sign live?', a: 'The engraved sign suits your counter or office if customers visit; otherwise most tradies use cards + the invoice PNG. Same design, three placements.' },
      { q: 'Does the QR ever expire?', a: 'No — it encodes Google\'s own review link for your business. No subscription, nothing to renew, works as long as your Google listing exists.' },
    ],
    closing: <>The next job is reading your reviews right now.</>,
  },
};

export default function Industry() {
  const { slug } = useParams();
  const spec = slug ? INDUSTRIES[slug] : undefined;
  if (!spec) return <Navigate to="/" replace />;

  return (
    <>
      <SiteHeader />
      <main>
        <section className="hero">
          <div className="wrap" style={{ gridTemplateColumns: '1fr', maxWidth: 820 }}>
            <div>
              <div className="kicker">{spec.kicker}</div>
              <h1>{spec.title}</h1>
              <p className="hero-sub">{spec.sub}</p>
              <div className="hero-ctas">
                <Link to={`/design?template=${spec.ctaTemplate}`} className="btn btn-accent btn-lg">{spec.ctaLabel}</Link>
              </div>
              <p className="hero-note"><b>No signup.</b> Full designer free · watermark-free files from <b>$19 AUD</b> · engraved acrylic $79 posted.</p>
            </div>
          </div>
        </section>

        <section className="section alt">
          <div className="wrap">
            <div className="kicker">{spec.galleryKicker}</div>
            <h2>{spec.galleryTitle}</h2>
            <TemplateGallery items={spec.templates} />
          </div>
        </section>

        <section className="section">
          <div className="wrap">
            <div className="kicker">Why it matters</div>
            <h2>{spec.whyTitle}</h2>
            <div className="feature-grid">
              {spec.why.map((w) => (
                <div className="feature-card" key={w.title}>
                  <div className="f-icon">★</div>
                  <h3>{w.title}</h3>
                  <p>{w.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section alt">
          <div className="wrap">
            <div className="kicker">FAQ</div>
            <h2>{spec.faqTitle}</h2>
            <div className="faq-list">
              {spec.faqs.map((f) => (
                <details className="faq-item" key={f.q}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="wrap" style={{ textAlign: 'center' }}>
            <h2 style={{ margin: '0 auto' }}>{spec.closing}</h2>
            <div style={{ marginTop: 30 }}>
              <Link to={`/design?template=${spec.ctaTemplate}`} className="btn btn-accent btn-lg">{spec.ctaLabel}</Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
