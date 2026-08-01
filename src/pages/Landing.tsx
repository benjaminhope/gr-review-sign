import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TEMPLATES } from '../lib/render-core';
import { SiteHeader, SiteFooter } from '../components/Chrome';
import SignCanvas from '../components/SignCanvas';
import TemplateGallery, { demoDesign } from '../components/TemplateGallery';
import { PricingRow } from '../components/PricingCards';

const HERO_ROTATION = ['chalk', 'goldblack', 'mint', 'trade', 'classic', 'midnight', 'blush'];

const FEATURES = [
  { title: 'Try everything before paying', body: 'The whole designer is open — no account, no trial timer. Download a watermarked preview, print it, sit it on your counter tonight. Pay when you\'re sure.' },
  { title: 'Styled QR codes that still scan', body: 'Rounded modules, dots, your colours — drawn from the real QR data, never a filter over an image. A built-in scan check warns you before a design gets too pretty to work.' },
  { title: 'Direct link to your review page', body: 'Search your business and we build the exact Google "write a review" link — one scan, straight to the five stars. Or paste any link you like.' },
  { title: 'Actually customisable', body: 'Eight shapes, solid / gradient / chalkboard / timber backgrounds, eight fonts, custom wording, drag-anywhere layout. Your sign, not a template with your name pasted in.' },
  { title: 'Print-ready, properly', body: 'The print pack exports at 300 DPI in A5, A4 and 5×7″ with safe margins — hand it to any printer, or your own inkjet, and it just works.' },
  { title: 'Or get it laser-engraved', body: 'We\'re a real Brisbane engraving workshop. Your exact design, engraved on acrylic with a stand, posted to your door. No other sign tool can ship you the sign.' },
];

const FAQS = [
  { q: 'Is asking for Google reviews allowed?', a: 'Yes — asking customers to leave an honest review is fine. What Google prohibits is offering incentives for reviews or gating (only asking happy customers). A neutral "leave us a review" sign is exactly the kind of ask Google expects.' },
  { q: 'Will the QR code keep working?', a: 'Yes. The QR encodes Google\'s own review link for your business — it points at Google, not at us, so it works forever and doesn\'t depend on our service existing. Nothing to renew.' },
  { q: 'Can I really use the designer without paying?', a: 'Completely. Every feature is open and you can download a watermarked preview to test on your counter. Payment just removes the watermark and unlocks the print pack or engraving.' },
  { q: 'What if my business doesn\'t show up in search?', a: 'You can paste your Google review link (or any URL) directly and the designer works exactly the same. The search is a shortcut, not a requirement.' },
  { q: 'How does the engraved sign work?', a: 'Your design becomes the engraving file — what you see in the preview is what gets lasered. We make it on acrylic (about 150 × 100 mm) with a stand at our Brisbane workshop and post it within 5 business days, shipping included Australia-wide.' },
  { q: 'What sizes do the files come in?', a: 'Digital: a high-resolution PNG (about 1440 px on the short edge). Print pack: 300 DPI files pre-sized for A5, A4 and 5×7″ with safe margins, plus the master PNG.' },
];

export default function Landing() {
  const [heroIdx, setHeroIdx] = useState(0);
  const [heroVisible, setHeroVisible] = useState(true);

  useEffect(() => {
    const t = setInterval(() => {
      setHeroVisible(false);
      setTimeout(() => { setHeroIdx((i) => (i + 1) % HERO_ROTATION.length); setHeroVisible(true); }, 450);
    }, 4200);
    return () => clearInterval(t);
  }, []);

  const heroTpl = TEMPLATES.find((t) => t.id === HERO_ROTATION[heroIdx])!;

  return (
    <>
      <SiteHeader />
      <main>
        <section className="hero">
          <div className="wrap">
            <div>
              <h1>More Google reviews, without <em>asking twice</em>.</h1>
              <p className="hero-sub">
                Design a review sign for your counter in about two minutes. Pick a template,
                make it yours — colours, fonts, wording, even the QR style — and see exactly
                what you'll get before you pay a cent.
              </p>
              <div className="hero-ctas">
                <Link to="/design" className="btn btn-accent btn-lg">Design your sign — free</Link>
                <a href="#templates" className="btn btn-ghost btn-lg">Browse templates</a>
              </div>
              <p className="hero-note">
                <b>No signup.</b> The full designer is free, including a watermarked preview download.
                Pay once — from <b>$19 AUD</b> — only when you want the clean file.
              </p>
            </div>
            <div className="hero-stage">
              <div className="hero-sign" style={{ opacity: heroVisible ? 1 : 0 }}>
                <SignCanvas design={demoDesign(heroTpl.id)} scale={2} />
              </div>
              <div className="hero-caption">
                <span className="dot" /><span>{heroTpl.name} — {heroTpl.tag.toLowerCase()}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section alt" id="templates">
          <div className="wrap">
            <div className="kicker">Templates</div>
            <h2>Start from a design that already looks finished.</h2>
            <p className="section-sub">Ten opinionated starting points, built around real shopfronts — then every one of them opens fully editable in the designer.</p>
            <TemplateGallery />
          </div>
        </section>

        <section className="section" id="features">
          <div className="wrap">
            <div className="kicker">Why it works</div>
            <h2>A sign does the asking, so your staff don't have to.</h2>
            <div className="feature-grid">
              {FEATURES.map((f) => (
                <div className="feature-card" key={f.title}>
                  <div className="f-icon">✦</div>
                  <h3>{f.title}</h3>
                  <p>{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section alt">
          <div className="wrap">
            <div className="kicker">How it works</div>
            <h2>Two minutes, three steps.</h2>
            <div className="steps-row">
              <div className="step-card"><h3>Find your business</h3><p>Search Google for your business name — we generate the direct "write a review" link and its QR code instantly.</p></div>
              <div className="step-card"><h3>Make it yours</h3><p>Start from a template, then change anything: shape, colours, fonts, wording, QR style, layout. Watch the live preview as you go.</p></div>
              <div className="step-card"><h3>Download or hold it</h3><p>Grab the free watermarked preview to test, buy the clean file when ready — or have us engrave the real thing and post it.</p></div>
            </div>
          </div>
        </section>

        <section className="section" id="pricing">
          <div className="wrap">
            <div className="kicker">Pricing</div>
            <h2>Pay once. Own it forever.</h2>
            <p className="section-sub">All prices in Australian dollars, GST inclusive. No subscription — a sign shouldn't need one.</p>
            <PricingRow />
          </div>
        </section>

        <section className="section alt" id="faq">
          <div className="wrap">
            <div className="kicker">FAQ</div>
            <h2>Fair questions.</h2>
            <div className="faq-list">
              {FAQS.map((f) => (
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
            <h2 style={{ margin: '0 auto' }}>Your counter is prime real estate.<br />Put a sign on it that earns its spot.</h2>
            <div style={{ marginTop: 30 }}>
              <Link to="/design" className="btn btn-accent btn-lg">Design your sign — free</Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
