// ReviewSign — sign renderer. Framework-agnostic: pure functions over a
// Design object and a canvas. Consumed by the designer, landing hero,
// industry galleries and the post-purchase download page.
import qrcode from 'qrcode-generator';

export type ShapeId =
  | 'portrait' | 'landscape' | 'rounded' | 'arch' | 'circle'
  | 'speech' | 'pin' | 'house';

export interface ShapeConfig {
  W: number; H: number; label: string; desc: string;
  style: 'centered' | 'split'; qrSize: number; maxW: number;
}

export const SHAPE_CONFIGS: Record<ShapeId, ShapeConfig> = {
  portrait:  { W: 480, H: 680, label: 'Portrait',      desc: 'Counter sign · most common',     style: 'centered', qrSize: 190, maxW: 400 },
  landscape: { W: 800, H: 520, label: 'Landscape',     desc: 'Wide format · extra text space', style: 'split',    qrSize: 195, maxW: 455 },
  rounded:   { W: 760, H: 500, label: 'Rounded',       desc: 'Premium feel · cafés & salons',  style: 'split',    qrSize: 190, maxW: 445 },
  arch:      { W: 520, H: 700, label: 'Arch',          desc: 'Boutique & hospitality',         style: 'centered', qrSize: 190, maxW: 420 },
  circle:    { W: 560, H: 560, label: 'Circle',        desc: 'Clean & minimal',                style: 'centered', qrSize: 170, maxW: 300 },
  speech:    { W: 800, H: 600, label: 'Speech Bubble', desc: 'Playful · says "review"',        style: 'split',    qrSize: 190, maxW: 450 },
  pin:       { W: 480, H: 700, label: 'Location Pin',  desc: 'Local services',                 style: 'centered', qrSize: 150, maxW: 260 },
  house:     { W: 540, H: 700, label: 'House',         desc: 'Homey local businesses',         style: 'centered', qrSize: 170, maxW: 400 },
};

export const SIGN_FONTS = [
  'Montserrat', 'Inter', 'Playfair Display', 'Oswald',
  'Lato', 'Dancing Script', 'Fraunces', 'Caveat',
] as const;

/* ── engraving materials ──
   RowMAX 2-ply laser laminate (Koenig Machinery, 1.6mm): engraving the cap
   reveals the core. QR modules are engraved, so modules render in core colour
   on a cap-colour face. Combos with a light cap + dark core scan directly;
   dark-cap/light-core is inverted and sold as "reverse engrave" (we clear the
   background field instead) — the preview and scan check model the direct
   engrave, so inverted combos surface as warnings by design. */
export interface EngraveMaterial {
  id: string;
  name: string;
  cap: string;    // face colour (background of the sign)
  core: string;   // revealed colour (all engraved marks: text, QR, stars)
  brushed?: boolean;
  /** shown in the primary picker; the rest sit behind "more materials" */
  main?: boolean;
  sku?: string;
}

export const ENGRAVE_MATERIALS: EngraveMaterial[] = [
  // light cap / dark core — QR engraves dark-on-light, scans directly
  { id: 'white-black',  name: 'White on Black',            cap: '#F4F3F0', core: '#1A1A1A', main: true },
  { id: 'gold-black',   name: 'Brushed Gold on Black',     cap: '#C9A24B', core: '#1A1A1A', brushed: true, main: true },
  { id: 'silver-black', name: 'Brushed Silver on Black',   cap: '#C0C1C3', core: '#1A1A1A', brushed: true, main: true },
  { id: 'copper-black', name: 'Brushed Copper on Black',   cap: '#B0714D', core: '#1A1A1A', brushed: true },
  { id: 'eurogold-black', name: 'Brushed Euro Gold on Black', cap: '#D3B573', core: '#1A1A1A', brushed: true },
  { id: 'alum-black',   name: 'Brushed Aluminium on Black', cap: '#AFB2B5', core: '#1A1A1A', brushed: true },
  { id: 'yellow-black', name: 'Yellow on Black',           cap: '#F2C400', core: '#1A1A1A' },
  { id: 'white-blue',   name: 'White on Blue',             cap: '#F4F3F0', core: '#1B4F9C' },
  { id: 'white-red',    name: 'White on Red',              cap: '#F4F3F0', core: '#C42127' },
  { id: 'white-green',  name: 'White on Green',            cap: '#F4F3F0', core: '#1E7A3C' },
  // dark cap / light core — premium looks, produced as reverse engrave
  { id: 'black-white',  name: 'Black on White',            cap: '#1A1A1A', core: '#F7F6F3', main: true },
  { id: 'gold-white',   name: 'Brushed Gold on White',     cap: '#C9A24B', core: '#F7F6F3', brushed: true },
  { id: 'rosegold-white', name: 'Brushed Rose Gold on White', cap: '#C98D6F', core: '#F7F6F3', brushed: true, main: true },
  { id: 'silver-white', name: 'Brushed Silver on White',   cap: '#C0C1C3', core: '#F7F6F3', brushed: true, main: true },
  { id: 'blue-white',   name: 'Blue on White',             cap: '#1B4F9C', core: '#F7F6F3' },
  { id: 'red-white',    name: 'Red on White',              cap: '#C42127', core: '#F7F6F3' },
  { id: 'green-white',  name: 'Green on White',            cap: '#1E7A3C', core: '#F7F6F3' },
];

export const DEFAULT_MATERIAL = 'white-black';

export type ElementKey = 'qr' | 'businessName' | 'reviewLabel' | 'stars' | 'cta' | 'instruction';
export type Point = { x: number; y: number };
export type Layout = Record<ElementKey, Point>;
export type Bounds = Partial<Record<ElementKey, { x: number; y: number; w: number; h: number }>>;

export interface Design {
  shape: ShapeId;
  template: string;
  bgType: 'solid' | 'gradient' | 'chalk' | 'wood';
  bgColor: string;
  bgColor2: string;
  bgAngle: number;
  textColor: string;      // 'auto' or hex
  starColor: string;
  headingFont: string;
  bodyFont: string;
  qrStyle: 'square' | 'rounded' | 'dots';
  qrEyeStyle: 'square' | 'rounded';
  qrColor: string;
  qrPanel: boolean;
  qrPanelColor: string;
  qrScale: number;
  businessName: string;
  ctaText: string;
  instructionText: string;
  reviewUrl: string;
  instagram: string;
  facebook: string;
  socialPad: number;
  layout: Layout | null;
  visible: Record<ElementKey, boolean>;
  /** Engraved-tier preview: id from ENGRAVE_MATERIALS, or null for print/digital. */
  engraveMaterial: string | null;
}

export function engraveMaterialFor(d: Design): EngraveMaterial | null {
  if (!d.engraveMaterial) return null;
  return ENGRAVE_MATERIALS.find((m) => m.id === d.engraveMaterial)
    ?? ENGRAVE_MATERIALS.find((m) => m.id === DEFAULT_MATERIAL)!;
}

/** Two-tone view of a design as the laser will actually produce it. */
export function engraveDesign(d: Design, mat: EngraveMaterial): Design {
  return {
    ...d,
    bgType: 'solid',
    bgColor: mat.cap,
    textColor: mat.core,
    starColor: mat.core,
    qrColor: mat.core,
    qrPanel: false,
    engraveMaterial: d.engraveMaterial,
  };
}

/** Engraving is always core-on-cap; scan checks and previews rely on this. */
export function materialSwatch(mat: EngraveMaterial): { face: string; mark: string } {
  return { face: mat.cap, mark: mat.core };
}

/* ── colour helpers ── */
function relLum(hex: string): number {
  const c = (s: string) => {
    const v = parseInt(s, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * c(hex.slice(1, 3)) + 0.7152 * c(hex.slice(3, 5)) + 0.0722 * c(hex.slice(5, 7));
}
export function contrastRatio(a: string, b: string): number {
  const la = relLum(a), lb = relLum(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
export function isDark(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}
function mixHex(a: string, b: string, t: number): string {
  const p = (h: string, i: number) => parseInt(h.slice(i, i + 2), 16);
  const m = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${m(p(a, 1), p(b, 1))}${m(p(a, 3), p(b, 3))}${m(p(a, 5), p(b, 5))}`;
}

function qrBackingColor(d: Design): string {
  if (d.qrPanel) return d.qrPanelColor;
  if (d.bgType === 'gradient') return mixHex(d.bgColor, d.bgColor2, 0.5);
  if (d.bgType === 'chalk') return '#2B2B28';
  return d.bgColor;
}

export type ScanLevel = 'ok' | 'warn' | 'bad';
export function qrScanCheck(d: Design): { level: ScanLevel; msg: string } {
  const mat = engraveMaterialFor(d);
  if (mat) {
    // Engraving physics: modules take the core colour on the cap face.
    const inverted = relLum(mat.core) > relLum(mat.cap);
    if (inverted) return { level: 'warn', msg: `${mat.name} engraves a light QR on a dark face — we produce this as a reverse engrave (background cleared) so it scans. The preview shows the direct engrave.` };
    return { level: 'ok', msg: `${mat.name}: engraves dark-on-light. Scans reliably.` };
  }
  const back = qrBackingColor(d);
  const ratio = contrastRatio(d.qrColor, back);
  const inverted = relLum(d.qrColor) > relLum(back);
  if (ratio < 2) return { level: 'bad', msg: 'QR contrast is too low — phones will not scan this. Change the QR colour or turn on the backing panel.' };
  if (inverted) return { level: 'warn', msg: 'Light QR on a dark backing — many phones struggle with inverted codes. A backing panel fixes it.' };
  if (ratio < 3.5) return { level: 'warn', msg: 'QR contrast is marginal — it may fail in low light or behind laminate.' };
  return { level: 'ok', msg: 'Scans reliably.' };
}

/* ── layout ── */
export function getDefaultLayout(shape: ShapeId): Layout {
  const cfg = SHAPE_CONFIGS[shape] ?? SHAPE_CONFIGS.portrait;
  const { W, H, qrSize, style } = cfg;
  if (style === 'split') {
    return {
      qr:           { x: Math.round(W * 0.645), y: Math.round((H - qrSize) / 2 - H * 0.06) },
      businessName: { x: Math.round(W * 0.055), y: Math.round(H * 0.10) },
      reviewLabel:  { x: Math.round(W * 0.055), y: Math.round(H * 0.335) },
      stars:        { x: Math.round(W * 0.055), y: Math.round(H * 0.40) },
      cta:          { x: Math.round(W * 0.055), y: Math.round(H * 0.50) },
      instruction:  { x: Math.round(W * 0.055), y: Math.round(H * 0.74) },
    };
  }
  const qx = Math.round((W - qrSize) / 2);
  // Positions must respect each shape's clip path — pin narrows below y≈409,
  // house's roof peaks above y≈245. Verified by the selftest (QR must decode).
  const specs: Record<string, { qy: number; bnY: number; rlY: number; stY: number; ctY: number; inY: number }> = {
    portrait: { qy: 64,  bnY: 290, rlY: 398, stY: 428, ctY: 478, inY: 584 },
    arch:     { qy: 48,  bnY: 286, rlY: 394, stY: 424, ctY: 474, inY: 600 },
    circle:   { qy: 66,  bnY: 268, rlY: 368, stY: 398, ctY: 440, inY: 492 },
    pin:      { qy: 34,  bnY: 196, rlY: 254, stY: 282, ctY: 322, inY: 398 },
    house:    { qy: 310, bnY: 250, rlY: 496, stY: 526, ctY: 566, inY: 662 },
  };
  const s = specs[shape] ?? specs.portrait;
  return {
    qr:           { x: qx,    y: s.qy },
    businessName: { x: W / 2, y: s.bnY },
    reviewLabel:  { x: W / 2, y: s.rlY },
    stars:        { x: W / 2, y: s.stY },
    cta:          { x: W / 2, y: s.ctY },
    instruction:  { x: W / 2, y: s.inY },
  };
}

export function defaultDesign(): Design {
  return {
    shape: 'portrait', template: 'classic',
    bgType: 'solid', bgColor: '#FFFFFF', bgColor2: '#E8E1D5', bgAngle: 135,
    textColor: 'auto', starColor: '#FBBC04',
    headingFont: 'Montserrat', bodyFont: 'Inter',
    qrStyle: 'square', qrEyeStyle: 'square', qrColor: '#141414',
    qrPanel: false, qrPanelColor: '#FFFFFF', qrScale: 1,
    businessName: '', ctaText: 'Leave us a Google review!',
    instructionText: 'Point your phone camera at the code',
    reviewUrl: '', instagram: '', facebook: '', socialPad: 40,
    layout: null,
    visible: { qr: true, businessName: true, reviewLabel: true, stars: true, cta: true, instruction: true },
    engraveMaterial: DEFAULT_MATERIAL,
  };
}

/* ── templates ── */
export interface Template { id: string; name: string; tag: string; d: Partial<Design> }

/* Templates are shape + typography + wording + material. Colour comes only
   from the engraving material — what we sell is what the laser makes. */
export const TEMPLATES: Template[] = [
  { id: 'classic', name: 'Classic Counter', tag: 'Clean & universal',
    d: { shape: 'portrait', engraveMaterial: 'white-black', qrStyle: 'square',
         headingFont: 'Montserrat', bodyFont: 'Inter', ctaText: 'Leave us a Google review!' } },
  { id: 'chalk', name: 'Espresso', tag: 'Cafés & bakeries',
    d: { shape: 'portrait', engraveMaterial: 'copper-black', qrStyle: 'rounded', qrEyeStyle: 'rounded',
         headingFont: 'Caveat', bodyFont: 'Lato', ctaText: 'Enjoyed your coffee? Tell Google!' } },
  { id: 'goldblack', name: 'Gold Standard', tag: 'Salons & bars',
    d: { shape: 'rounded', engraveMaterial: 'gold-black', qrStyle: 'rounded', qrEyeStyle: 'rounded',
         headingFont: 'Playfair Display', bodyFont: 'Lato', ctaText: 'Loved your visit? Share it.' } },
  { id: 'mint', name: 'Clinic Arch', tag: 'Clinics & studios',
    d: { shape: 'arch', engraveMaterial: 'white-green', qrStyle: 'dots', qrEyeStyle: 'rounded',
         headingFont: 'Fraunces', bodyFont: 'Inter', ctaText: 'How was your appointment?' } },
  { id: 'trade', name: 'Bold Trade', tag: 'Trades & services',
    d: { shape: 'landscape', engraveMaterial: 'yellow-black', qrStyle: 'square',
         headingFont: 'Oswald', bodyFont: 'Inter', ctaText: 'Happy with the job? Review us!' } },
  { id: 'blush', name: 'Rose Arch', tag: 'Beauty & boutique',
    d: { shape: 'arch', engraveMaterial: 'rosegold-white', qrStyle: 'rounded', qrEyeStyle: 'rounded',
         headingFont: 'Playfair Display', bodyFont: 'Lato', ctaText: 'Loved it? Leave us a review ♡' } },
  { id: 'ocean', name: 'Navy', tag: 'Bold & trustworthy',
    d: { shape: 'rounded', engraveMaterial: 'white-blue', qrStyle: 'rounded',
         headingFont: 'Montserrat', bodyFont: 'Inter', ctaText: 'Scan to share your experience' } },
  { id: 'timber', name: 'Silverline', tag: 'Modern professional',
    d: { shape: 'portrait', engraveMaterial: 'silver-black', qrStyle: 'square',
         headingFont: 'Fraunces', bodyFont: 'Lato', ctaText: 'Leave us a Google review!' } },
  { id: 'midnight', name: 'Midnight', tag: 'Modern & minimal',
    d: { shape: 'portrait', engraveMaterial: 'black-white', qrStyle: 'dots', qrEyeStyle: 'rounded',
         headingFont: 'Inter', bodyFont: 'Inter', ctaText: '30 seconds. Means the world.' } },
  { id: 'pop', name: 'Speech Pop', tag: 'Playful & friendly',
    d: { shape: 'speech', engraveMaterial: 'white-red', qrStyle: 'rounded', qrEyeStyle: 'rounded',
         headingFont: 'Montserrat', bodyFont: 'Inter', ctaText: 'Tell us what you think!' } },
];

export function applyTemplate(design: Design, tplId: string): Design {
  const tpl = TEMPLATES.find((t) => t.id === tplId);
  if (!tpl) return design;
  const next: Design = {
    ...defaultDesign(),
    ...tpl.d,
    businessName: design.businessName,
    reviewUrl: design.reviewUrl,
    instagram: design.instagram,
    facebook: design.facebook,
    template: tplId,
    layout: null,
  };
  next.layout = getDefaultLayout(next.shape);
  return next;
}

/* ── shape path ── */
function buildShapePath(ctx: CanvasRenderingContext2D, W: number, H: number, shape: ShapeId) {
  ctx.beginPath();
  switch (shape) {
    case 'portrait': case 'landscape': ctx.rect(0, 0, W, H); break;
    case 'rounded': {
      const r = 40;
      ctx.moveTo(r, 0); ctx.lineTo(W - r, 0); ctx.quadraticCurveTo(W, 0, W, r);
      ctx.lineTo(W, H - r); ctx.quadraticCurveTo(W, H, W - r, H);
      ctx.lineTo(r, H); ctx.quadraticCurveTo(0, H, 0, H - r);
      ctx.lineTo(0, r); ctx.quadraticCurveTo(0, 0, r, 0); break;
    }
    case 'arch': {
      const r = W / 2;
      ctx.moveTo(0, H); ctx.lineTo(0, r);
      ctx.arc(W / 2, r, r, Math.PI, 0, false);
      ctx.lineTo(W, H); break;
    }
    case 'circle': {
      const r = Math.min(W, H) / 2;
      ctx.ellipse(W / 2, H / 2, r, r, 0, 0, Math.PI * 2); break;
    }
    case 'speech': {
      const r = 40, tailH = 80, tailX = W * 0.28, tailW = 64, bodyH = H - tailH;
      ctx.moveTo(r, 0); ctx.lineTo(W - r, 0); ctx.quadraticCurveTo(W, 0, W, r);
      ctx.lineTo(W, bodyH - r); ctx.quadraticCurveTo(W, bodyH, W - r, bodyH);
      ctx.lineTo(tailX + tailW, bodyH); ctx.lineTo(tailX + tailW / 2, H); ctx.lineTo(tailX, bodyH);
      ctx.lineTo(r, bodyH); ctx.quadraticCurveTo(0, bodyH, 0, bodyH - r);
      ctx.lineTo(0, r); ctx.quadraticCurveTo(0, 0, r, 0); break;
    }
    case 'pin': {
      const cx = W / 2, r = W * 0.45, cy = r;
      const tA = Math.asin(Math.min(0.999, r / (H - cy)));
      const sA = Math.PI / 2 + tA, eA = Math.PI / 2 - tA;
      ctx.moveTo(cx + r * Math.cos(sA), cy + r * Math.sin(sA));
      ctx.arc(cx, cy, r, sA, eA, false);
      ctx.lineTo(cx, H); break;
    }
    case 'house': {
      const rH = H * 0.35;
      ctx.moveTo(0, rH); ctx.lineTo(W / 2, 0); ctx.lineTo(W, rH);
      ctx.lineTo(W, H); ctx.lineTo(0, H); break;
    }
  }
  ctx.closePath();
}

/* ── backgrounds ── */
function grainFromBg(hex: string) {
  const r = parseInt(hex.slice(1, 3) || 'c8', 16), g = parseInt(hex.slice(3, 5) || '85', 16), b = parseInt(hex.slice(5, 7) || '3a', 16);
  const lum = (r * 299 + g * 587 + b * 114) / 1000, dark = lum < 128;
  const v1 = dark ? Math.min(255, lum + 30) : Math.max(0, lum - 26);
  const v2 = dark ? Math.min(255, lum + 15) : Math.max(0, lum - 12);
  const h = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  return { grain1: `#${h(v1)}${h(v1)}${h(v1)}`, grain2: `#${h(v2)}${h(v2)}${h(v2)}` };
}
function drawWood(ctx: CanvasRenderingContext2D, W: number, H: number, woodColor: string) {
  ctx.fillStyle = woodColor; ctx.fillRect(0, 0, W, H);
  const { grain1, grain2 } = grainFromBg(woodColor);
  for (let i = 0; i < 44; i++) {
    const y0 = (H / 44) * i, color = (i % 3 === 0) ? grain2 : grain1;
    const alpha = 0.06 + (i % 5) * 0.02, f1 = 0.006 + (i % 7) * 0.001, amp = 1.5 + (i % 4) * 0.5;
    ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(0, y0);
    for (let x = 0; x <= W; x += 4) ctx.lineTo(x, y0 + Math.sin(x * f1 + i * 1.31) * amp);
    ctx.stroke(); ctx.restore();
  }
}
function drawChalk(ctx: CanvasRenderingContext2D, W: number, H: number, base: string) {
  ctx.fillStyle = base || '#2B2B28'; ctx.fillRect(0, 0, W, H);
  // deterministic chalk dust — stable across re-renders
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  ctx.save();
  for (let i = 0; i < 900; i++) {
    const x = rnd() * W, y = rnd() * H, a = rnd() * 0.05;
    ctx.globalAlpha = a;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x, y, rnd() < 0.5 ? 1 : 2, 1);
  }
  ctx.restore();
}
/**
 * Anisotropic brushed-metal cap: dense fine horizontal streaks in light and
 * dark, broken into segments (real brushing isn't continuous), plus two soft
 * diagonal sheen bands. Deterministic PRNG so re-renders are stable.
 */
function drawBrushedCap(ctx: CanvasRenderingContext2D, W: number, H: number, cap: string) {
  let seed = 42;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  ctx.save();

  // fine streaks — alternating lighter/darker than the cap
  for (let i = 0; i < H * 1.6; i++) {
    const y = rnd() * H;
    const light = rnd() < 0.5;
    ctx.globalAlpha = 0.02 + rnd() * 0.055;
    ctx.strokeStyle = light ? '#FFFFFF' : '#000000';
    ctx.lineWidth = 0.5 + rnd() * 0.5;
    // broken segments along the stroke
    let x = -rnd() * 60;
    ctx.beginPath();
    while (x < W) {
      const len = 30 + rnd() * 140;
      ctx.moveTo(x, y);
      ctx.lineTo(x + len, y + (rnd() - 0.5) * 0.8);
      x += len + rnd() * 40;
    }
    ctx.stroke();
  }

  // soft diagonal sheen bands (what makes metal read as metal)
  const sheen = ctx.createLinearGradient(0, 0, W, H);
  sheen.addColorStop(0.0, 'rgba(255,255,255,0)');
  sheen.addColorStop(0.28, 'rgba(255,255,255,0.13)');
  sheen.addColorStop(0.42, 'rgba(255,255,255,0)');
  sheen.addColorStop(0.62, 'rgba(0,0,0,0.06)');
  sheen.addColorStop(0.78, 'rgba(255,255,255,0.09)');
  sheen.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.globalAlpha = 1;
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, W, H);

  // vignette so edges read like a solid slab
  const edge = ctx.createLinearGradient(0, 0, 0, H);
  edge.addColorStop(0, 'rgba(255,255,255,0.07)');
  edge.addColorStop(0.08, 'rgba(255,255,255,0)');
  edge.addColorStop(0.92, 'rgba(0,0,0,0)');
  edge.addColorStop(1, 'rgba(0,0,0,0.08)');
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  void cap;
}

function drawBackground(ctx: CanvasRenderingContext2D, W: number, H: number, d: Design) {
  if (d.bgType === 'wood') return drawWood(ctx, W, H, d.bgColor);
  if (d.bgType === 'chalk') return drawChalk(ctx, W, H, d.bgColor);
  if (d.bgType === 'gradient') {
    const a = (d.bgAngle || 135) * Math.PI / 180;
    const cx = W / 2, cy = H / 2, len = Math.abs(W * Math.cos(a)) + Math.abs(H * Math.sin(a));
    const dx = Math.cos(a) * len / 2, dy = Math.sin(a) * len / 2;
    const g = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
    g.addColorStop(0, d.bgColor); g.addColorStop(1, d.bgColor2);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    return;
  }
  ctx.fillStyle = d.bgColor; ctx.fillRect(0, 0, W, H);
}

/* ── QR from the raw matrix ── */
type QRModel = ReturnType<typeof qrcode>;
const qrModelCache = new Map<string, QRModel | null>();
function qrModel(url: string): QRModel | null {
  if (!url) return null;
  if (qrModelCache.has(url)) return qrModelCache.get(url)!;
  let model: QRModel | null = null;
  try {
    const qr = qrcode(0, 'H');
    qr.addData(url); qr.make();
    model = qr;
  } catch { model = null; }
  qrModelCache.set(url, model);
  return model;
}

function inFinder(r: number, c: number, n: number): boolean {
  return (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

function drawQRStyled(ctx: CanvasRenderingContext2D, model: QRModel, x: number, y: number, size: number, d: Design) {
  const n = model.getModuleCount();
  const quiet = d.qrPanel ? 2.4 : 1.2;
  const m = size / (n + quiet * 2);
  const ox = x + quiet * m, oy = y + quiet * m;

  if (d.qrPanel) {
    ctx.save();
    ctx.beginPath();
    roundRectPath(ctx, x, y, size, size, Math.max(8, size * 0.055));
    ctx.fillStyle = d.qrPanelColor;
    ctx.shadowColor = 'rgba(0,0,0,0.18)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 2;
    ctx.fill();
    ctx.restore();
  }

  ctx.fillStyle = d.qrColor;

  ctx.beginPath();
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!model.isDark(r, c) || inFinder(r, c, n)) continue;
      const mx = ox + c * m, my = oy + r * m;
      if (d.qrStyle === 'dots') {
        ctx.moveTo(mx + m / 2 + m * 0.42, my + m / 2);
        ctx.arc(mx + m / 2, my + m / 2, m * 0.42, 0, Math.PI * 2);
      } else if (d.qrStyle === 'rounded') {
        roundRectPath(ctx, mx + m * 0.06, my + m * 0.06, m * 0.88, m * 0.88, m * 0.28);
      } else {
        ctx.rect(mx, my, m + 0.35, m + 0.35); // slight overlap kills hairline gaps
      }
    }
  }
  ctx.fill();

  const eye = (ex: number, ey: number) => {
    const s7 = 7 * m, s5 = 5 * m, s3 = 3 * m;
    const rr = d.qrEyeStyle === 'rounded' ? 0.32 : 0.02;
    ctx.beginPath();
    roundRectPath(ctx, ex, ey, s7, s7, s7 * rr);
    roundRectPath(ctx, ex + m, ey + m, s5, s5, s5 * rr);
    ctx.fill('evenodd');
    ctx.beginPath();
    roundRectPath(ctx, ex + 2 * m, ey + 2 * m, s3, s3, s3 * rr);
    ctx.fill();
  };
  eye(ox, oy); eye(ox + (n - 7) * m, oy); eye(ox, oy + (n - 7) * m);
}

/* ── text helpers ── */
function countLines(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number): number {
  const words = text.split(' ');
  let line = '', c = 1;
  for (const w of words) {
    const t = line + w + ' ';
    if (ctx.measureText(t).width > maxW && line !== '') { c++; if (c >= maxLines) return maxLines; line = w + ' '; }
    else line = t;
  }
  return c;
}
function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number, maxLines = 3) {
  const words = text.split(' ');
  let line = '', drawn = 0;
  for (const w of words) {
    const t = line + w + ' ';
    if (ctx.measureText(t).width > maxW && line !== '') {
      if (drawn >= maxLines - 1) {
        let tr = line.trim();
        while (ctx.measureText(tr + '…').width > maxW && tr.length > 0) tr = tr.slice(0, -1);
        ctx.fillText(tr + '…', x, y);
        return;
      }
      ctx.fillText(line.trim(), x, y); line = w + ' '; y += lineH; drawn++;
    } else line = t;
  }
  ctx.fillText(line.trim(), x, y);
}

/* ── social icons ── */
const IG_PATHS = [
  'm510.949219 150.5c-1.199219-27.199219-5.597657-45.898438-11.898438-62.101562-6.5-17.199219-16.5-32.597657-29.601562-45.398438-12.800781-13-28.300781-23.101562-45.300781-29.5-16.296876-6.300781-34.898438-10.699219-62.097657-11.898438-27.402343-1.300781-36.101562-1.601562-105.601562-1.601562s-78.199219.300781-105.5 1.5c-27.199219 1.199219-45.898438 5.601562-62.097657 11.898438-17.203124 6.5-32.601562 16.5-45.402343 29.601562-13 12.800781-23.097657 28.300781-29.5 45.300781-6.300781 16.300781-10.699219 34.898438-11.898438 62.097657-1.300781 27.402343-1.601562 36.101562-1.601562 105.601562s.300781 78.199219 1.5 105.5c1.199219 27.199219 5.601562 45.898438 11.902343 62.101562 6.5 17.199219 16.597657 32.597657 29.597657 45.398438 12.800781 13 28.300781 23.101562 45.300781 29.5 16.300781 6.300781 34.898438 10.699219 62.101562 11.898438 27.296876 1.203124 36 1.5 105.5 1.5s78.199219-.296876 105.5-1.5c27.199219-1.199219 45.898438-5.597657 62.097657-11.898438 34.402343-13.300781 61.601562-40.5 74.902343-74.898438 6.296876-16.300781 10.699219-34.902343 11.898438-62.101562 1.199219-27.300781 1.5-36 1.5-105.5s-.101562-78.199219-1.300781-105.5zm-46.097657 209c-1.101562 25-5.300781 38.5-8.800781 47.5-8.601562 22.300781-26.300781 40-48.601562 48.601562-9 3.5-22.597657 7.699219-47.5 8.796876-27 1.203124-35.097657 1.5-103.398438 1.5s-76.5-.296876-103.402343-1.5c-25-1.097657-38.5-5.296876-47.5-8.796876-11.097657-4.101562-21.199219-10.601562-29.398438-19.101562-8.5-8.300781-15-18.300781-19.101562-29.398438-3.5-9-7.699219-22.601562-8.796876-47.5-1.203124-27-1.5-35.101562-1.5-103.402343s.296876-76.5 1.5-103.398438c1.097657-25 5.296876-38.5 8.796876-47.5 4.101562-11.101562 10.601562-21.199219 19.203124-29.402343 8.296876-8.5 18.296876-15 29.398438-19.097657 9-3.5 22.601562-7.699219 47.5-8.800781 27-1.199219 35.101562-1.5 103.398438-1.5 68.402343 0 76.5.300781 103.402343 1.5 25 1.101562 38.5 5.300781 47.5 8.800781 11.097657 4.097657 21.199219 10.597657 29.398438 19.097657 8.5 8.300781 15 18.300781 19.101562 29.402343 3.5 9 7.699219 22.597657 8.800781 47.5 1.199219 27 1.5 35.097657 1.5 103.398438s-.300781 76.300781-1.5 103.300781zm0 0',
  'm256.449219 124.5c-72.597657 0-131.5 58.898438-131.5 131.5s58.902343 131.5 131.5 131.5c72.601562 0 131.5-58.898438 131.5-131.5s-58.898438-131.5-131.5-131.5zm0 216.800781c-47.097657 0-85.300781-38.199219-85.300781-85.300781s38.203124-85.300781 85.300781-85.300781c47.101562 0 85.300781 38.199219 85.300781 85.300781s-38.199219 85.300781-85.300781 85.300781zm0 0',
  'm423.851562 119.300781c0 16.953125-13.746093 30.699219-30.703124 30.699219-16.953126 0-30.699219-13.746094-30.699219-30.699219 0-16.957031 13.746093-30.699219 30.699219-30.699219 16.957031 0 30.703124 13.742188 30.703124 30.699219zm0 0',
];
const FB_PATH = 'M452,0H60C26.916,0,0,26.916,0,60v392c0,33.084,26.916,60,60,60h392c33.084,0,60-26.916,60-60V60C512,26.916,485.084,0,452,0z M472,452c0,11.028-8.972,20-20,20H338V309h61.79L410,247h-72v-43c0-16.975,13.025-30,30-30h41v-62h-41c-50.923,0-91.978,41.25-91.978,92.174V247H216v62h60.022v163H60c-11.028,0-20-8.972-20-20V60c0-11.028,8.972-20,20-20h392c11.028,0,20,8.972,20,20V452z';

function drawIGIcon(ctx: CanvasRenderingContext2D, x: number, y: number, sz: number, color: string) {
  ctx.save(); ctx.translate(x, y); ctx.scale(sz / 511.9, sz / 511.9); ctx.fillStyle = color;
  IG_PATHS.forEach((p) => ctx.fill(new Path2D(p))); ctx.restore();
}
function drawFBIcon(ctx: CanvasRenderingContext2D, x: number, y: number, sz: number, color: string) {
  ctx.save(); ctx.translate(x, y); ctx.scale(sz / 512, sz / 512); ctx.fillStyle = color;
  ctx.fill(new Path2D(FB_PATH)); ctx.restore();
}

/* ── the renderer ── */
export interface RenderOpts {
  scale?: number;
  watermark?: boolean;
  selection?: ElementKey | null;
}

export function renderSign(canvas: HTMLCanvasElement, dIn: Design, opts: RenderOpts = {}): Bounds {
  // Engraved preview: collapse the design to the two-tone the laser produces.
  const mat = engraveMaterialFor(dIn);
  const d = mat ? engraveDesign(dIn, mat) : dIn;
  const scale = opts.scale ?? 3;
  const cfg = SHAPE_CONFIGS[d.shape] ?? SHAPE_CONFIGS.portrait;
  const { W, H } = cfg;
  if (canvas.width !== W * scale || canvas.height !== H * scale) {
    canvas.width = W * scale; canvas.height = H * scale;
  }
  const ctx = canvas.getContext('2d')!;
  const lay = d.layout ?? getDefaultLayout(d.shape);
  const isCentered = cfg.style === 'centered';
  const QR_SIZE = Math.round(cfg.qrSize * (d.qrScale || 1));
  const MAX_W = cfg.maxW;

  const bgRef = d.bgType === 'gradient' ? mixHex(d.bgColor, d.bgColor2, 0.5)
    : d.bgType === 'chalk' ? '#2B2B28' : d.bgColor;
  const autoText = isDark(bgRef) ? '#FFFFFF' : '#141414';
  const textColor = (d.textColor && d.textColor !== 'auto') ? d.textColor : autoText;
  // Engraving is binary — the laser makes solid core-coloured marks only, so
  // "dim" text must be core too. Translucency exists only in digital designs.
  const dimColor = mat ? mat.core : (isDark(bgRef) ? 'rgba(255,255,255,0.60)' : 'rgba(0,0,0,0.52)');

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(scale, scale);
  buildShapePath(ctx, W, H, d.shape);
  ctx.clip();
  drawBackground(ctx, W, H, d);
  if (mat?.brushed) drawBrushedCap(ctx, W, H, mat.cap);
  // Border: skipped in engrave mode — a laser doesn't engrave a soft outline,
  // and the 3D slab's bevel provides the edge definition instead.
  if (!mat) {
    ctx.strokeStyle = isDark(bgRef) ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.14)';
    ctx.lineWidth = 5;
    buildShapePath(ctx, W, H, d.shape);
    ctx.stroke();
  }

  const bounds: Bounds = {};
  const align: CanvasTextAlign = isCentered ? 'center' : 'left';

  if (d.visible.qr) {
    const { x, y } = lay.qr;
    const model = d.reviewUrl ? qrModel(d.reviewUrl) : null;
    if (model) drawQRStyled(ctx, model, x, y, QR_SIZE, d);
    else {
      ctx.save();
      ctx.strokeStyle = dimColor; ctx.setLineDash([6, 5]); ctx.lineWidth = 2;
      ctx.strokeRect(x, y, QR_SIZE, QR_SIZE);
      ctx.setLineDash([]);
      ctx.fillStyle = dimColor; ctx.font = '600 13px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('QR appears here', x + QR_SIZE / 2, y + QR_SIZE / 2);
      ctx.restore();
    }
    bounds.qr = { x: x - 8, y: y - 8, w: QR_SIZE + 16, h: QR_SIZE + 16 };
  }

  if (d.visible.businessName) {
    const { x, y } = lay.businessName;
    const name = d.businessName || 'Your Business Name';
    ctx.font = `bold 36px '${d.headingFont}'`; ctx.fillStyle = textColor;
    ctx.textAlign = align; ctx.textBaseline = 'top';
    const nl = countLines(ctx, name, MAX_W, 2);
    wrapText(ctx, name, x, y, MAX_W, 46, 2);
    bounds.businessName = { x: isCentered ? x - MAX_W / 2 : x, y, w: MAX_W, h: nl * 46 };
  }

  if (d.visible.reviewLabel) {
    const { x, y } = lay.reviewLabel;
    ctx.font = `700 14px '${d.bodyFont}'`; ctx.fillStyle = textColor;
    ctx.textAlign = align; ctx.textBaseline = 'top';
    ctx.fillText('Google Reviews', x, y + 4);
    bounds.reviewLabel = { x: isCentered ? x - 110 : x, y, w: isCentered ? 220 : 180, h: 22 };
  }

  if (d.visible.stars) {
    const { x, y } = lay.stars;
    ctx.font = '26px Arial'; ctx.fillStyle = d.starColor || '#FBBC04';
    ctx.textAlign = align; ctx.textBaseline = 'top';
    ctx.fillText('★★★★★', x, y);
    bounds.stars = { x: isCentered ? x - 72 : x, y, w: 144, h: 30 };
  }

  if (d.visible.cta) {
    const { x, y } = lay.cta;
    ctx.font = `bold 25px '${d.headingFont}'`; ctx.fillStyle = textColor;
    ctx.textAlign = align; ctx.textBaseline = 'top';
    const nl = countLines(ctx, d.ctaText, MAX_W, 3);
    wrapText(ctx, d.ctaText, x, y, MAX_W, 33, 3);
    bounds.cta = { x: isCentered ? x - MAX_W / 2 : x, y, w: MAX_W, h: nl * 33 };
  }

  if (d.visible.instruction) {
    const { x, y } = lay.instruction;
    ctx.font = `400 13px '${d.bodyFont}'`; ctx.fillStyle = dimColor;
    ctx.textAlign = align; ctx.textBaseline = 'top';
    wrapText(ctx, d.instructionText || 'Point your phone camera at the code', x, y, MAX_W, 18, 2);
    bounds.instruction = { x: isCentered ? x - MAX_W / 2 : x, y, w: MAX_W, h: 36 };
  }

  const iconSz = 17;
  const socialY = H - (d.socialPad || 40) - (d.shape === 'speech' ? 50 : 0);
  if (d.instagram || d.facebook) {
    ctx.font = `500 12px '${d.bodyFont}'`; ctx.textBaseline = 'middle'; ctx.fillStyle = dimColor;
    const parts: { type: 'ig' | 'fb'; text: string }[] = [];
    if (d.instagram) parts.push({ type: 'ig', text: '@' + d.instagram });
    if (d.facebook) parts.push({ type: 'fb', text: d.facebook });
    let totalW = 0;
    parts.forEach((p, i) => { totalW += iconSz + 4 + ctx.measureText(p.text).width + (i < parts.length - 1 ? 24 : 0); });
    let sx = isCentered ? W / 2 - totalW / 2 : Math.round(W * 0.055);
    parts.forEach((p) => {
      if (p.type === 'ig') drawIGIcon(ctx, sx, socialY - iconSz / 2, iconSz, dimColor);
      else drawFBIcon(ctx, sx, socialY - iconSz / 2, iconSz, dimColor);
      ctx.fillStyle = dimColor; ctx.textAlign = 'left';
      ctx.fillText(p.text, sx + iconSz + 4, socialY);
      sx += iconSz + 4 + ctx.measureText(p.text).width + 24;
    });
  }

  if (opts.watermark) {
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = isDark(bgRef) ? '#FFFFFF' : '#141414';
    ctx.font = 'bold 26px Inter';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.translate(W / 2, H / 2); ctx.rotate(-Math.PI / 8);
    for (let ty = -H; ty <= H; ty += 110) {
      for (let tx = -W; tx <= W; tx += 340) {
        ctx.fillText('PREVIEW · reviewsign', tx, ty);
      }
    }
    ctx.restore();
  }

  ctx.restore();

  if (opts.selection && bounds[opts.selection]) {
    const b = bounds[opts.selection]!;
    ctx.save(); ctx.scale(scale, scale);
    ctx.strokeStyle = '#E8630A'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
    ctx.strokeRect(b.x - 5, b.y - 5, b.w + 10, b.h + 10);
    ctx.setLineDash([]); ctx.restore();
  }

  return bounds;
}
