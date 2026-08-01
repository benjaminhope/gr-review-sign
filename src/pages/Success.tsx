import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Design, SHAPE_CONFIGS, renderSign } from '../lib/render-core';
import { STORAGE_KEY } from '../state/useDesign';
import { SiteHeader } from '../components/Chrome';
import SignCanvas from '../components/SignCanvas';

type State = 'loading' | 'ok' | 'error' | 'nodesign';

export default function Success() {
  const [params] = useSearchParams();
  const [state, setState] = useState<State>('loading');
  const designRef = useRef<Design | null>(null);
  const tier = params.get('tier') ?? 'digital';

  useEffect(() => {
    const sessionId = params.get('session_id');
    if (!sessionId) { setState('error'); return; }
    (async () => {
      let paid = false;
      try {
        const res = await fetch(`/api/verify-session?id=${encodeURIComponent(sessionId)}`);
        const data = await res.json();
        paid = !!data.paid;
      } catch { /* treated as unpaid */ }
      if (!paid) { setState('error'); return; }
      try {
        designRef.current = JSON.parse(sessionStorage.getItem('qrSignDesign') ?? 'null')
          ?? JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
      } catch { designRef.current = null; }
      setState(designRef.current ? 'ok' : 'nodesign');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const download = (scale: number, suffix: string) => {
    const design = designRef.current;
    if (!design) return;
    const slug = (design.businessName || 'review-sign').replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const off = document.createElement('canvas');
    renderSign(off, design, { scale });
    off.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${slug}-${suffix}.png`; a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  const printScales = () => {
    const design = designRef.current!;
    const cfg = SHAPE_CONFIGS[design.shape] ?? SHAPE_CONFIGS.portrait;
    const longEdge = Math.max(cfg.W, cfg.H);
    return {
      a5: Math.ceil(2480 / longEdge),
      a4: Math.ceil(3508 / longEdge),
      photo57: Math.ceil(2100 / longEdge),
    };
  };

  return (
    <div className="center-page">
      <SiteHeader />
      <main className="center-main">
        <div className="big-card">
          {state === 'loading' && (<><div className="spinner" /><p className="sub">Confirming your payment…</p></>)}

          {state === 'error' && (
            <>
              <h1 style={{ color: 'var(--danger)' }}>Payment not confirmed</h1>
              <p className="sub">We couldn't verify this payment. If you were charged, email{' '}
                <a href="mailto:admin@etchwonders.com">admin@etchwonders.com</a> and we'll sort it straight away.</p>
              <Link to="/design" className="btn btn-primary">← Back to the designer</Link>
            </>
          )}

          {state === 'nodesign' && (
            <>
              <h1>Payment confirmed 🎉</h1>
              <p className="sub">It looks like you finished checkout on a different device — open the designer on the
                device you designed on, or email us and we'll regenerate your files.</p>
              <Link to="/design" className="btn btn-primary">Open the designer</Link>
            </>
          )}

          {state === 'ok' && designRef.current && (
            <>
              <h1>{tier === 'engraved' ? "Order received — we're on it 🎉" : 'Your sign is ready 🎉'}</h1>
              <p className="sub">
                {tier === 'engraved'
                  ? 'Your engraved sign will ship from Brisbane within 5 business days. Your digital files are below in the meantime.'
                  : 'Payment confirmed. Download your files below — no watermark.'}
              </p>
              {(tier === 'print' || tier === 'engraved') && (
                <div className="tier-note"><strong>Print pack:</strong> each file is rendered at 300 DPI for its size.
                  Hand any of them straight to a print shop — no conversion needed.</div>
              )}
              {tier === 'engraved' && (
                <div className="tier-note"><strong>Engraved acrylic:</strong> we engrave exactly what you see in the
                  preview (~150×100 mm with stand). Order confirmation and tracking go to your checkout email.
                  Questions? <a href="mailto:admin@etchwonders.com">admin@etchwonders.com</a></div>
              )}
              <div className="canvas-preview">
                <SignCanvas design={designRef.current} scale={2} />
              </div>
              <div className="dl-row">
                <button className="btn btn-accent" onClick={() => download(3, 'sign')}>Download PNG (high-res)</button>
                {(tier === 'print' || tier === 'engraved') && (
                  <>
                    <button className="btn btn-primary" onClick={() => download(printScales().a5, 'a5-print')}>A5 print file</button>
                    <button className="btn btn-primary" onClick={() => download(printScales().a4, 'a4-print')}>A4 print file</button>
                    <button className="btn btn-primary" onClick={() => download(printScales().photo57, '5x7-print')}>5×7″ print file</button>
                  </>
                )}
              </div>
              <div className="divider" />
              <p className="small">Want another sign? <Link to="/design">Create a new one →</Link></p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
