import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Bounds, Design, ElementKey, ENGRAVE_MATERIALS, SHAPE_CONFIGS, ShapeId, SIGN_FONTS, TEMPLATES,
  applyTemplate as applyTemplateCore, getDefaultLayout,
  qrScanCheck, renderSign,
} from '../lib/render-core';
import { useDesign, STORAGE_KEY } from '../state/useDesign';
import SignCanvas from '../components/SignCanvas';
import { BrandMark } from '../components/Chrome';
import { PricingRow } from '../components/PricingCards';
import { demoDesign } from '../components/TemplateGallery';
import { lazy, Suspense } from 'react';

const Sign3D = lazy(() => import('../components/Sign3D'));

const CTA_PRESETS = [
  'Leave us a Google review!',
  'Scan to share your experience',
  'How did we do? Let us know!',
  '30 seconds. Means the world.',
];

const EL_NAMES: Record<ElementKey, string> = {
  qr: 'QR code', businessName: 'Business name', reviewLabel: '"Google Reviews"',
  stars: 'Stars', cta: 'Call to action', instruction: 'Small print',
};

const SHAPE_ICONS: Record<ShapeId, string> = {
  portrait: '<rect x="8" y="3" width="18" height="28" rx="2"/>',
  landscape: '<rect x="3" y="8" width="28" height="18" rx="2"/>',
  rounded: '<rect x="3" y="8" width="28" height="18" rx="7"/>',
  arch: '<path d="M7,31 L7,15 A10,10 0,0,1 27,15 L27,31 Z"/>',
  circle: '<circle cx="17" cy="17" r="13"/>',
  speech: '<path d="M7,5 L27,5 Q31,5 31,9 L31,20 Q31,24 27,24 L17,24 L13,30 L11,24 L7,24 Q3,24 3,20 L3,9 Q3,5 7,5 Z"/>',
  pin: '<path d="M17,31 C10,22 6,17 6,11.5 A11,11 0,0,1 28,11.5 C28,17 24,22 17,31 Z"/>',
  house: '<polygon points="3,15 17,3 31,15 31,31 3,31"/>',
  smiley: '<circle cx="17" cy="17" r="13"/><circle cx="12.5" cy="13.5" r="1.6" fill="currentColor" fill-opacity="1"/><circle cx="21.5" cy="13.5" r="1.6" fill="currentColor" fill-opacity="1"/><path d="M11,20 Q17,26 23,20" fill="none"/>',
  thumb: '<path d="M7,16 L7,29 L25,29 L25,16 L20,16 Q22,10 20,6.5 Q18,4 16,6.5 Q16,11 11,16 Z"/>',
  arrow: '<path d="M12,3 L22,3 L22,16 L29,16 L17,31 L5,16 L12,16 Z"/>',
};

interface PlacePrediction { place_id: string; structured_formatting: { main_text: string; secondary_text?: string } }

declare global {
  interface Window { google?: any; initPlacesAPI?: () => void }
}

function Section({ title, icon, defaultOpen, children }: {
  title: string; icon: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode;
}) {
  return (
    <details className="ctl-section" open={defaultOpen}>
      <summary><span className="sec-icon">{icon}</span>{title}<span className="chev">›</span></summary>
      <div className="ctl-body">{children}</div>
    </details>
  );
}

export default function Designer() {
  const { design, setDesign, patch, setShape, resetLayout } = useDesign();
  const [params] = useSearchParams();
  const [selected, setSelected] = useState<ElementKey | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [showAllMats, setShowAllMats] = useState(false);
  const [view3D, setView3D] = useState(false);
  const [toast, setToast] = useState('');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [searchText, setSearchText] = useState('');
  const [manualOpen, setManualOpen] = useState(false);
  const [placesReady, setPlacesReady] = useState(false);
  const boundsRef = useRef<Bounds>({});
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ key: ElementKey; dx: number; dy: number } | null>(null);
  const toastTimer = useRef<number>(undefined);
  const placeIdRef = useRef<string | null>(null);
  const acServiceRef = useRef<any>(null);
  const placesServiceRef = useRef<any>(null);
  const searchDebounce = useRef<number>(undefined);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 2600);
  }, []);

  // URL params: template preselect + prefill (used by marketing links + tests)
  useEffect(() => {
    const tpl = params.get('template');
    const url = params.get('url');
    const name = params.get('name');
    if (tpl && TEMPLATES.some((t) => t.id === tpl)) setDesign((d) => applyTemplateCore(d, tpl));
    if (url && /^https?:\/\//i.test(url)) patch({ reviewUrl: url });
    if (name) patch({ businessName: name.slice(0, 48) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Google Places (progressive enhancement; manual link is the fallback)
  useEffect(() => {
    window.initPlacesAPI = () => {
      try {
        acServiceRef.current = new window.google.maps.places.AutocompleteService();
        placesServiceRef.current = new window.google.maps.places.PlacesService(document.createElement('div'));
        setPlacesReady(true);
      } catch { /* stays on manual */ }
    };
    if (window.google?.maps?.places) window.initPlacesAPI();
    else if (!document.getElementById('places-script')) {
      const s = document.createElement('script');
      s.id = 'places-script';
      s.src = '/api/places-script';
      s.async = true;
      document.head.appendChild(s);
    }
  }, []);

  const searchPlaces = (q: string) => {
    setSearchText(q);
    window.clearTimeout(searchDebounce.current);
    if (q.trim().length < 2 || !acServiceRef.current) { setPredictions([]); return; }
    searchDebounce.current = window.setTimeout(() => {
      acServiceRef.current.getPlacePredictions({ input: q.trim(), types: ['establishment'] }, (preds: PlacePrediction[] | null, status: string) => {
        setPredictions(status === 'OK' && preds ? preds.slice(0, 6) : []);
      });
    }, 320);
  };

  const selectPlace = (placeId: string) => {
    setPredictions([]);
    placesServiceRef.current?.getDetails({ placeId, fields: ['name', 'place_id', 'formatted_address'] }, (place: any, status: string) => {
      if (status !== 'OK' || !place) { showToast('Could not load that business — try again'); return; }
      placeIdRef.current = place.place_id;
      patch({
        businessName: place.name,
        reviewUrl: `https://search.google.com/local/writereview?placeid=${place.place_id}`,
      });
      setSearchText(place.name);
    });
  };

  /* drag & drop on the canvas */
  const canvasPos = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const cfg = SHAPE_CONFIGS[design.shape];
    return { x: (clientX - rect.left) * cfg.W / rect.width, y: (clientY - rect.top) * cfg.H / rect.height };
  };
  const hitTest = (x: number, y: number): ElementKey | null => {
    const order: ElementKey[] = ['instruction', 'cta', 'stars', 'reviewLabel', 'businessName', 'qr'];
    for (const key of order) {
      const b = boundsRef.current[key];
      if (b && design.visible[key] && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return key;
    }
    return null;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const pos = canvasPos(e.clientX, e.clientY);
    const key = hitTest(pos.x, pos.y);
    if (key) {
      const lay = design.layout ?? getDefaultLayout(design.shape);
      dragRef.current = { key, dx: pos.x - lay[key].x, dy: pos.y - lay[key].y };
      setSelected(key);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      e.preventDefault();
    } else setSelected(null);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const pos = canvasPos(e.clientX, e.clientY);
    const { key, dx, dy } = dragRef.current;
    setDesign((d) => {
      const lay = { ...(d.layout ?? getDefaultLayout(d.shape)) };
      lay[key] = { x: Math.round(pos.x - dx), y: Math.round(pos.y - dy) };
      return { ...d, layout: lay };
    });
  };
  const onPointerUp = () => { dragRef.current = null; };

  const alignSelected = (dir: string) => {
    if (!selected) return;
    const b = boundsRef.current[selected];
    if (!b) return;
    const cfg = SHAPE_CONFIGS[design.shape];
    setDesign((d) => {
      const lay = { ...(d.layout ?? getDefaultLayout(d.shape)) };
      const p = { ...lay[selected] };
      if (dir === 'left') p.x += -b.x;
      else if (dir === 'hcenter') p.x += (cfg.W / 2) - (b.x + b.w / 2);
      else if (dir === 'right') p.x += cfg.W - (b.x + b.w);
      else if (dir === 'top') p.y += -b.y;
      else if (dir === 'vcenter') p.y += (cfg.H / 2) - (b.y + b.h / 2);
      else if (dir === 'bottom') p.y += cfg.H - (b.y + b.h);
      lay[selected] = p;
      return { ...d, layout: lay };
    });
  };

  /* downloads + checkout */
  const freeDownload = () => {
    if (!design.reviewUrl) { showToast('Pick your business (or paste a link) first — the QR needs somewhere to point'); return; }
    const scan = qrScanCheck(design);
    if (scan.level === 'bad' && !window.confirm(`Heads up: the scan check says this QR will NOT scan as designed.\n\n${scan.msg}\n\nDownload anyway?`)) return;
    const off = document.createElement('canvas');
    renderSign(off, design, { scale: 2, watermark: true });
    off.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(design.businessName || 'review-sign').replace(/[^a-z0-9]/gi, '-').toLowerCase()}-preview.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
    showToast('Preview downloaded — the paid file has no watermark');
  };

  const openModal = () => {
    if (!design.reviewUrl) { showToast('Pick your business (or paste a link) first'); return; }
    if (qrScanCheck(design).level === 'bad') { showToast("Fix the QR contrast first — we won't sell you a sign that can't scan"); return; }
    setModalOpen(true);
  };

  const checkout = async (tier: 'digital' | 'print' | 'engraved') => {
    try {
      sessionStorage.setItem('qrSignDesign', JSON.stringify(design));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(design));
    } catch { /* private mode */ }
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier,
          businessName: design.businessName,
          placeId: placeIdRef.current,
          engraveMaterial: tier === 'engraved' ? (design.engraveMaterial ?? 'white-black') : undefined,
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else throw new Error(data.error || 'no url');
    } catch {
      showToast('Checkout is not available right now — your design is saved, try again shortly');
    }
  };

  const scan = qrScanCheck(design);
  const seg = (active: boolean) => `seg-btn${active ? ' active' : ''}`;
  const set = <K extends keyof Design>(k: K) => (v: Design[K]) => patch({ [k]: v } as Partial<Design>);

  return (
    <div className="designer-body">
      <header className="designer-topbar">
        <Link className="brand" to="/">
          <span className="brand-mark"><BrandMark size={16} /></span>
          <span>ReviewSign</span>
        </Link>
        <div className="topbar-status">
          {design.businessName
            ? `${design.businessName} — ${SHAPE_CONFIGS[design.shape].label}`
            : 'Untitled sign — pick your business to activate the QR'}
        </div>
        <div className="topbar-actions">
          <button className="btn btn-ghost btn-sm" onClick={freeDownload}>Free preview PNG</button>
          <button className="btn btn-accent btn-sm" onClick={openModal}>Get the clean file</button>
        </div>
      </header>

      <div className="designer-main">
        <aside className="panel">

          <Section title="Your business" defaultOpen icon={<span>📍</span>}>
            <div className="ctl-label">Search Google</div>
            <div className="biz-search-wrap">
              <input type="text" className="text-input" placeholder={placesReady ? 'Type your business name…' : 'Search unavailable — paste a link below'}
                value={searchText} onChange={(e) => searchPlaces(e.target.value)} spellCheck={false} autoComplete="off" />
              {predictions.length > 0 && (
                <div className="biz-results">
                  {predictions.map((p) => (
                    <div className="biz-item" key={p.place_id} onClick={() => selectPlace(p.place_id)}>
                      <strong>{p.structured_formatting.main_text}</strong>
                      <span>{p.structured_formatting.secondary_text ?? ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {design.reviewUrl && (
              <div className="biz-selected">
                <span className="ok">✓</span>
                <div><strong>{design.businessName || 'Custom link'}</strong><small>{design.reviewUrl}</small></div>
              </div>
            )}
            <p className="hint">
              Not showing up, or no internet search?{' '}
              <a href="#manual" onClick={(e) => { e.preventDefault(); setManualOpen((v) => !v); }}>Paste a link instead</a>
            </p>
            {manualOpen && (
              <input type="text" className="text-input" style={{ marginTop: 8 }} placeholder="https://g.page/r/…  or any URL"
                onChange={(e) => {
                  const v = e.target.value.trim();
                  if (v.length > 8 && /^https?:\/\//i.test(v)) { placeIdRef.current = null; patch({ reviewUrl: v }); }
                }} />
            )}
            <div className="ctl-label">Business name on the sign</div>
            <input type="text" className="text-input" placeholder="Your Business Name" maxLength={48}
              value={design.businessName} onChange={(e) => patch({ businessName: e.target.value })} />
          </Section>

          <Section title="Templates" defaultOpen icon={<span>▦</span>}>
            <div className="tpl-strip">
              {TEMPLATES.map((tpl) => (
                <button key={tpl.id} className={`tpl-chip${design.template === tpl.id ? ' active' : ''}`}
                  onClick={() => setDesign((d) => applyTemplateCore(d, tpl.id))}>
                  <div className="tc-wrap"><SignCanvas design={demoDesign(tpl.id, tpl.name)} scale={0.5} /></div>
                  <div className="tc-name">{tpl.name}</div>
                </button>
              ))}
            </div>
          </Section>

          <Section title="Shape" icon={<span>△</span>}>
            <div className="shape-grid">
              {(Object.keys(SHAPE_CONFIGS) as ShapeId[]).map((key) => (
                <button key={key} className={`shape-cell${design.shape === key ? ' active' : ''}`}
                  onClick={() => { setShape(key); setSelected(null); }}>
                  <svg viewBox="0 0 34 34" fill="currentColor" fillOpacity={0.12} stroke="currentColor" strokeWidth={1.8}
                    dangerouslySetInnerHTML={{ __html: SHAPE_ICONS[key] }} />
                  <span>{SHAPE_CONFIGS[key].label}</span>
                </button>
              ))}
            </div>
          </Section>

          <Section title="Material" defaultOpen icon={<span>◈</span>}>
            <p className="hint" style={{ marginTop: 0 }}>
              Every sign is cut from 2-ply engraving acrylic — the laser reveals the core colour
              through the face. What you see is what gets made.
            </p>
            <div className="mat-grid">
              {ENGRAVE_MATERIALS.filter((m) => m.main || showAllMats).map((m) => (
                <button key={m.id} title={m.name}
                  className={`mat-chip${design.engraveMaterial === m.id ? ' selected' : ''}`}
                  onClick={() => patch({ engraveMaterial: m.id })}>
                  <span className={`mat-cap${m.brushed ? ' brushed' : ''}`} style={{ background: m.cap }}>
                    <span className="mat-core" style={{ background: m.core }} />
                  </span>
                  <span className="mat-name">{m.name.replace('Brushed ', '')}</span>
                </button>
              ))}
            </div>
            <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: 10 }}
              onClick={() => setShowAllMats((v) => !v)}>
              {showAllMats ? 'Show main materials' : `All ${ENGRAVE_MATERIALS.length} materials`}
            </button>
          </Section>

          <Section title="QR code style" defaultOpen icon={<span>▩</span>}>
            <div className="ctl-label">Module shape</div>
            <div className="seg-row">
              {(['square', 'rounded', 'dots'] as const).map((s) => (
                <button key={s} className={seg(design.qrStyle === s)} onClick={() => set('qrStyle')(s)}>
                  {s[0].toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
            <div className="ctl-label">Corner eyes</div>
            <div className="seg-row">
              {(['square', 'rounded'] as const).map((s) => (
                <button key={s} className={seg(design.qrEyeStyle === s)} onClick={() => set('qrEyeStyle')(s)}>
                  {s[0].toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
            <div className="ctl-label">Size</div>
            <div className="range-row">
              <input type="range" min={0.7} max={1.35} step={0.05} value={design.qrScale}
                onChange={(e) => patch({ qrScale: +e.target.value })} />
              <output>{Math.round(design.qrScale * 100)}%</output>
            </div>
            <div className={`scan-pill ${scan.level}`}>
              <span className="si">●</span><span>{scan.msg}</span>
            </div>
          </Section>

          <Section title="Wording & fonts" icon={<span>Aa</span>}>
            <div className="ctl-label">Call to action</div>
            <div className="chip-row">
              {CTA_PRESETS.map((c) => (
                <button key={c} className={`chip${design.ctaText === c ? ' active' : ''}`} onClick={() => patch({ ctaText: c })}>
                  {c}
                </button>
              ))}
            </div>
            <input type="text" className="text-input" placeholder="Or write your own…" maxLength={70} style={{ marginTop: 9 }}
              onChange={(e) => { const v = e.target.value.trim(); if (v) patch({ ctaText: v }); }} />
            <div className="ctl-label">Small print line</div>
            <input type="text" className="text-input" placeholder="Point your phone camera at the code" maxLength={70}
              onChange={(e) => patch({ instructionText: e.target.value.trim() || 'Point your phone camera at the code' })} />
            <div className="ctl-label">Heading font</div>
            <select className="select-input" value={design.headingFont} onChange={(e) => patch({ headingFont: e.target.value })}>
              {SIGN_FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            <div className="ctl-label">Body font</div>
            <select className="select-input" value={design.bodyFont} onChange={(e) => patch({ bodyFont: e.target.value })}>
              {SIGN_FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </Section>

          <Section title="Social handles" icon={<span>@</span>}>
            <div className="ctl-label">Instagram</div>
            <input type="text" className="text-input" placeholder="@yourhandle" maxLength={40}
              value={design.instagram} onChange={(e) => patch({ instagram: e.target.value.replace(/^@/, '').trim() })} />
            <div className="ctl-label">Facebook</div>
            <input type="text" className="text-input" placeholder="facebook.com/yourpage" maxLength={60}
              value={design.facebook} onChange={(e) => patch({ facebook: e.target.value.trim() })} />
            <div className="ctl-label">Distance from bottom</div>
            <div className="range-row">
              <input type="range" min={10} max={200} step={2} value={design.socialPad}
                onChange={(e) => patch({ socialPad: +e.target.value })} />
              <output>{design.socialPad}</output>
            </div>
          </Section>

          <Section title="Show / hide elements" icon={<span>👁</span>}>
            {(Object.keys(EL_NAMES) as ElementKey[]).map((key) => (
              <div className="el-row" key={key}>
                <span>{EL_NAMES[key]}</span>
                <button className={`el-toggle${design.visible[key] ? '' : ' el-off'}`}
                  onClick={() => {
                    setDesign((d) => ({ ...d, visible: { ...d.visible, [key]: !d.visible[key] } }));
                    if (selected === key) setSelected(null);
                  }}>
                  {design.visible[key] ? 'Hide' : 'Show'}
                </button>
              </div>
            ))}
            <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: 12 }}
              onClick={() => { resetLayout(); showToast('Layout reset'); }}>
              ↺ Reset positions
            </button>
          </Section>

        </aside>

        <div className="stage">
          <div className="stage-toolbar">
            <div className="seg-row" style={{ padding: 2 }}>
              <button className={seg(!view3D)} style={{ padding: '5px 14px' }} onClick={() => setView3D(false)}>Design</button>
              <button className={seg(view3D)} style={{ padding: '5px 14px' }} onClick={() => { setView3D(true); setSelected(null); }}>3D preview</button>
            </div>
            <div className="align-sep" />
            <span className="tlabel">{view3D ? 'Drag to rotate · scroll to zoom' : selected ? EL_NAMES[selected] : 'Click an element to select it'}</span>
            {['left', 'hcenter', 'right', 'top', 'vcenter', 'bottom'].map((dir) => (
              <button key={dir} className="align-btn" title={dir} disabled={!selected} onClick={() => alignSelected(dir)}>
                {{ left: '⇤', hcenter: '⇹', right: '⇥', top: '⤒', vcenter: '⇳', bottom: '⤓' }[dir]}
              </button>
            ))}
            <div className="align-sep" />
            <button className="align-btn" title="Hide element" disabled={!selected}
              onClick={() => {
                if (!selected) return;
                setDesign((d) => ({ ...d, visible: { ...d.visible, [selected]: false } }));
                setSelected(null);
              }}>✕</button>
          </div>

          {view3D ? (
            <div className="sign3d-holder">
              <Suspense fallback={<div className="sign3d-loading">Loading 3D preview…</div>}>
                <Sign3D design={design} />
              </Suspense>
            </div>
          ) : (
            <div className="sign-holder"
              onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
              <SignCanvas design={design} scale={3} selection={selected} canvasRef={canvasRef}
                onBounds={(b) => { boundsRef.current = b; }} />
            </div>
          )}
          <p className="drag-hint">
            {view3D
              ? 'This is the engraved sign as it ships — rotate it to check every angle'
              : 'Drag any element on the sign to reposition it · changes save automatically in this browser'}
          </p>

          <div className="stage-cta">
            <button className="btn btn-ghost" onClick={freeDownload}>Download free preview (watermarked)</button>
            <button className="btn btn-accent btn-lg" onClick={openModal}>Get the clean file →</button>
          </div>
        </div>
      </div>

      <div className={`modal-backdrop${modalOpen ? ' open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
        <div className="modal">
          <button className="modal-close" onClick={() => setModalOpen(false)}>✕</button>
          <div className="kicker">One-time purchase · AUD · GST inc.</div>
          <h2>Take your sign home.</h2>
          <p className="section-sub">Your design is saved in this browser — it'll be waiting on the download page right after payment.</p>
          <PricingRow onBuy={checkout} />
        </div>
      </div>

      <div className={`toast${toast ? ' show' : ''}`}>{toast}</div>
    </div>
  );
}
