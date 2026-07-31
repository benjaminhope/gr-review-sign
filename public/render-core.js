/* ============================================================
   ReviewSign — shared sign renderer
   Used by the designer (design.html), the landing page hero
   (index.html) and the post-purchase page (success.html).
   Depends on vendor/qrcode.js (qrcode-generator).
   ============================================================ */

const SHAPE_CONFIGS = {
  portrait:  { W:480, H:680, label:'Portrait',     desc:'Counter sign · most common',     style:'centered', qrSize:190, maxW:400 },
  landscape: { W:800, H:520, label:'Landscape',    desc:'Wide format · extra text space', style:'split',    qrSize:195, maxW:455 },
  rounded:   { W:760, H:500, label:'Rounded',      desc:'Premium feel · cafés & salons',  style:'split',    qrSize:190, maxW:445 },
  arch:      { W:520, H:700, label:'Arch',         desc:'Boutique & hospitality',         style:'centered', qrSize:190, maxW:420 },
  circle:    { W:560, H:560, label:'Circle',       desc:'Clean & minimal',                style:'centered', qrSize:170, maxW:300 },
  speech:    { W:800, H:600, label:'Speech Bubble',desc:'Playful · says "review"',        style:'split',    qrSize:190, maxW:450 },
  pin:       { W:480, H:700, label:'Location Pin', desc:'Local services',                 style:'centered', qrSize:150, maxW:260 },
  house:     { W:540, H:700, label:'House',        desc:'Homey local businesses',         style:'centered', qrSize:170, maxW:400 },
};

const SIGN_FONTS = ['Montserrat','Inter','Playfair Display','Oswald','Lato','Dancing Script','Fraunces','Caveat'];

/* ── colour helpers ── */
function relLum(hex){
  const c = s => { const v = parseInt(s,16)/255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4); };
  return 0.2126*c(hex.slice(1,3))+0.7152*c(hex.slice(3,5))+0.0722*c(hex.slice(5,7));
}
function contrastRatio(a,b){ const la=relLum(a),lb=relLum(b); return (Math.max(la,lb)+0.05)/(Math.min(la,lb)+0.05); }
function isDark(hex){
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  return (r*299+g*587+b*114)/1000 < 128;
}
function mixHex(a,b,t){
  const p=(h,i)=>parseInt(h.slice(i,i+2),16);
  const m=(x,y)=>Math.round(x+(y-x)*t).toString(16).padStart(2,'0');
  return `#${m(p(a,1),p(b,1))}${m(p(a,3),p(b,3))}${m(p(a,5),p(b,5))}`;
}

/* Effective colour sitting behind the QR modules (panel, or the sign bg). */
function qrBackingColor(d){
  if (d.qrPanel) return d.qrPanelColor;
  if (d.bgType==='gradient') return mixHex(d.bgColor, d.bgColor2, 0.5);
  if (d.bgType==='chalk') return '#2B2B28';
  return d.bgColor;
}

/* Scannability verdict: { level: 'ok'|'warn'|'bad', msg } */
function qrScanCheck(d){
  const back = qrBackingColor(d);
  const ratio = contrastRatio(d.qrColor, back);
  const inverted = relLum(d.qrColor) > relLum(back);
  if (ratio < 2)   return { level:'bad',  msg:'QR contrast is too low — phones will not scan this. Change the QR colour or turn on the backing panel.' };
  if (inverted)    return { level:'warn', msg:'Light QR on a dark backing — many phones struggle with inverted codes. A backing panel fixes it.' };
  if (ratio < 3.5) return { level:'warn', msg:'QR contrast is marginal — it may fail in low light or behind laminate.' };
  return { level:'ok', msg:'Scans reliably.' };
}

/* ── default layout per shape (logical units) ── */
function getDefaultLayout(shape){
  const cfg = SHAPE_CONFIGS[shape] || SHAPE_CONFIGS.portrait;
  const { W, H, qrSize, style } = cfg;
  if (style === 'split') {
    return {
      qr:           { x:Math.round(W*0.645), y:Math.round((H-qrSize)/2 - H*0.06) },
      businessName: { x:Math.round(W*0.055), y:Math.round(H*0.10) },
      reviewLabel:  { x:Math.round(W*0.055), y:Math.round(H*0.335) },
      stars:        { x:Math.round(W*0.055), y:Math.round(H*0.40) },
      cta:          { x:Math.round(W*0.055), y:Math.round(H*0.50) },
      instruction:  { x:Math.round(W*0.055), y:Math.round(H*0.74) },
    };
  }
  const qx = Math.round((W - qrSize) / 2);
  // Positions must respect each shape's clip path — pin narrows below y≈409,
  // house's roof peaks above y≈245. Verified by selftest.html (QR must decode).
  const specs = {
    portrait: { qy:64,  bnY:290, rlY:398, stY:428, ctY:478, inY:584 },
    arch:     { qy:48,  bnY:286, rlY:394, stY:424, ctY:474, inY:600 },
    circle:   { qy:66,  bnY:268, rlY:368, stY:398, ctY:440, inY:492 },
    pin:      { qy:34,  bnY:196, rlY:254, stY:282, ctY:322, inY:398 },
    house:    { qy:310, bnY:250, rlY:496, stY:526, ctY:566, inY:662 },
  };
  const s = specs[shape] || specs.portrait;
  return {
    qr:           { x:qx,  y:s.qy  },
    businessName: { x:W/2, y:s.bnY },
    reviewLabel:  { x:W/2, y:s.rlY },
    stars:        { x:W/2, y:s.stY },
    cta:          { x:W/2, y:s.ctY },
    instruction:  { x:W/2, y:s.inY },
  };
}

function defaultDesign(){
  return {
    shape:'portrait', template:'classic',
    bgType:'solid', bgColor:'#FFFFFF', bgColor2:'#E8E1D5', bgAngle:135,
    textColor:'auto', starColor:'#FBBC04',
    headingFont:'Montserrat', bodyFont:'Inter',
    qrStyle:'square', qrEyeStyle:'square', qrColor:'#141414',
    qrPanel:false, qrPanelColor:'#FFFFFF', qrScale:1,
    businessName:'', ctaText:'Leave us a Google review!',
    instructionText:'Point your phone camera at the code',
    reviewUrl:'', instagram:'', facebook:'', socialPad:40,
    layout:null,
    visible:{ qr:true, businessName:true, reviewLabel:true, stars:true, cta:true, instruction:true },
  };
}

/* ── templates: partial designs applied over defaultDesign ── */
const TEMPLATES = [
  { id:'classic',  name:'Classic Counter', tag:'Clean & universal',
    d:{ shape:'portrait', bgType:'solid', bgColor:'#FFFFFF', qrColor:'#141414', qrStyle:'square',
        headingFont:'Montserrat', bodyFont:'Inter', ctaText:'Leave us a Google review!' } },
  { id:'chalk',    name:'Espresso Chalk', tag:'Cafés & bakeries',
    d:{ shape:'portrait', bgType:'chalk', bgColor:'#2B2B28', qrColor:'#232320', qrStyle:'rounded', qrEyeStyle:'rounded',
        qrPanel:true, qrPanelColor:'#F5F1E8', headingFont:'Caveat', bodyFont:'Lato',
        ctaText:'Enjoyed your coffee? Tell Google!' } },
  { id:'goldblack', name:'Gold on Black', tag:'Salons & bars',
    d:{ shape:'rounded', bgType:'solid', bgColor:'#161513', textColor:'#D4AF37', starColor:'#D4AF37',
        qrColor:'#161513', qrPanel:true, qrPanelColor:'#F3EAD3', qrStyle:'rounded', qrEyeStyle:'rounded',
        headingFont:'Playfair Display', bodyFont:'Lato', ctaText:'Loved your visit? Share it.' } },
  { id:'mint',     name:'Fresh Mint', tag:'Clinics & studios',
    d:{ shape:'arch', bgType:'gradient', bgColor:'#DFF5EC', bgColor2:'#B8E6D3', bgAngle:160,
        qrColor:'#0E5C45', qrStyle:'dots', qrEyeStyle:'rounded', textColor:'#0E5C45', starColor:'#0E9B72',
        headingFont:'Fraunces', bodyFont:'Inter', ctaText:'How was your appointment?' } },
  { id:'trade',    name:'Bold Trade', tag:'Trades & services',
    d:{ shape:'landscape', bgType:'solid', bgColor:'#FFC821', qrColor:'#141414', qrStyle:'square',
        headingFont:'Oswald', bodyFont:'Inter', textColor:'#141414',
        ctaText:'Happy with the job? Review us!' } },
  { id:'blush',    name:'Soft Blush', tag:'Beauty & boutique',
    d:{ shape:'arch', bgType:'gradient', bgColor:'#FBE6E3', bgColor2:'#F5C8C2', bgAngle:200,
        qrColor:'#7A3B34', qrStyle:'rounded', qrEyeStyle:'rounded', textColor:'#7A3B34', starColor:'#C9705F',
        headingFont:'Playfair Display', bodyFont:'Lato', ctaText:'Loved it? Leave us a review ♡' } },
  { id:'ocean',    name:'Ocean', tag:'Bold & trustworthy',
    d:{ shape:'rounded', bgType:'gradient', bgColor:'#1565C0', bgColor2:'#0D3D77', bgAngle:145,
        qrColor:'#0D3D77', qrPanel:true, qrPanelColor:'#FFFFFF', qrStyle:'rounded',
        headingFont:'Montserrat', bodyFont:'Inter', ctaText:'Scan to share your experience' } },
  { id:'timber',   name:'Timber', tag:'Engraved look',
    d:{ shape:'portrait', bgType:'wood', bgColor:'#C8853A', qrColor:'#2A1A08', qrStyle:'square',
        textColor:'#2A1A08', starColor:'#2A1A08',
        headingFont:'Fraunces', bodyFont:'Lato', ctaText:'Leave us a Google review!' } },
  { id:'midnight', name:'Midnight Dots', tag:'Modern & minimal',
    d:{ shape:'portrait', bgType:'gradient', bgColor:'#1B2240', bgColor2:'#0D1226', bgAngle:170,
        qrColor:'#1B2240', qrPanel:true, qrPanelColor:'#FFFFFF', qrStyle:'dots', qrEyeStyle:'rounded',
        headingFont:'Inter', bodyFont:'Inter', ctaText:'30 seconds. Means the world.' } },
  { id:'pop',      name:'Speech Pop', tag:'Playful & friendly',
    d:{ shape:'speech', bgType:'solid', bgColor:'#FFFFFF', qrColor:'#D93025', qrStyle:'rounded', qrEyeStyle:'rounded',
        textColor:'#202124', starColor:'#FBBC04',
        headingFont:'Montserrat', bodyFont:'Inter', ctaText:'Tell us what you think!' } },
];

function applyTemplate(design, tplId){
  const tpl = TEMPLATES.find(t=>t.id===tplId);
  if (!tpl) return design;
  const base = defaultDesign();
  const keep = {
    businessName:design.businessName, reviewUrl:design.reviewUrl,
    instagram:design.instagram, facebook:design.facebook,
  };
  const next = Object.assign(base, tpl.d, keep, { template:tplId });
  next.layout = getDefaultLayout(next.shape);
  return next;
}

/* ── shape path ── */
function buildShapePath(ctx, W, H, shape){
  ctx.beginPath();
  switch(shape){
    case 'portrait': case 'landscape': ctx.rect(0,0,W,H); break;
    case 'rounded': {
      const r=40;
      ctx.moveTo(r,0);ctx.lineTo(W-r,0);ctx.quadraticCurveTo(W,0,W,r);
      ctx.lineTo(W,H-r);ctx.quadraticCurveTo(W,H,W-r,H);
      ctx.lineTo(r,H);ctx.quadraticCurveTo(0,H,0,H-r);
      ctx.lineTo(0,r);ctx.quadraticCurveTo(0,0,r,0); break;
    }
    case 'arch': {
      const r=W/2;
      ctx.moveTo(0,H);ctx.lineTo(0,r);
      ctx.arc(W/2,r,r,Math.PI,0,false);
      ctx.lineTo(W,H); break;
    }
    case 'circle': {
      const r=Math.min(W,H)/2;
      ctx.ellipse(W/2,H/2,r,r,0,0,Math.PI*2); break;
    }
    case 'speech': {
      const r=40,tailH=80,tailX=W*0.28,tailW=64,bodyH=H-tailH;
      ctx.moveTo(r,0);ctx.lineTo(W-r,0);ctx.quadraticCurveTo(W,0,W,r);
      ctx.lineTo(W,bodyH-r);ctx.quadraticCurveTo(W,bodyH,W-r,bodyH);
      ctx.lineTo(tailX+tailW,bodyH);ctx.lineTo(tailX+tailW/2,H);ctx.lineTo(tailX,bodyH);
      ctx.lineTo(r,bodyH);ctx.quadraticCurveTo(0,bodyH,0,bodyH-r);
      ctx.lineTo(0,r);ctx.quadraticCurveTo(0,0,r,0); break;
    }
    case 'pin': {
      const cx=W/2,r=W*0.45,cy=r;
      const tA=Math.asin(Math.min(0.999,r/(H-cy)));
      const sA=Math.PI/2+tA, eA=Math.PI/2-tA;
      ctx.moveTo(cx+r*Math.cos(sA),cy+r*Math.sin(sA));
      ctx.arc(cx,cy,r,sA,eA,false);
      ctx.lineTo(cx,H); break;
    }
    case 'house': {
      const rH=H*0.35;
      ctx.moveTo(0,rH);ctx.lineTo(W/2,0);ctx.lineTo(W,rH);
      ctx.lineTo(W,H);ctx.lineTo(0,H); break;
    }
    default: ctx.rect(0,0,W,H);
  }
  ctx.closePath();
}

/* ── backgrounds ── */
function grainFromBg(hex){
  const r=parseInt(hex.slice(1,3)||'c8',16),g=parseInt(hex.slice(3,5)||'85',16),b=parseInt(hex.slice(5,7)||'3a',16);
  const lum=(r*299+g*587+b*114)/1000, dark=lum<128;
  const v1=dark?Math.min(255,lum+30):Math.max(0,lum-26);
  const v2=dark?Math.min(255,lum+15):Math.max(0,lum-12);
  const h=n=>Math.round(n).toString(16).padStart(2,'0');
  return { grain1:`#${h(v1)}${h(v1)}${h(v1)}`, grain2:`#${h(v2)}${h(v2)}${h(v2)}` };
}
function drawWood(ctx,W,H,woodColor){
  ctx.fillStyle=woodColor; ctx.fillRect(0,0,W,H);
  const {grain1,grain2}=grainFromBg(woodColor);
  for(let i=0;i<44;i++){
    const y0=(H/44)*i,color=(i%3===0)?grain2:grain1,alpha=0.06+(i%5)*0.02,f1=0.006+(i%7)*0.001,amp=1.5+(i%4)*0.5;
    ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=0.6;
    ctx.beginPath();ctx.moveTo(0,y0);
    for(let x=0;x<=W;x+=4)ctx.lineTo(x,y0+Math.sin(x*f1+i*1.31)*amp);
    ctx.stroke();ctx.restore();
  }
}
function drawChalk(ctx,W,H,base){
  ctx.fillStyle=base||'#2B2B28'; ctx.fillRect(0,0,W,H);
  // deterministic chalk dust — no Math.random so re-renders are stable
  let seed=7;
  const rnd=()=>{ seed=(seed*16807)%2147483647; return seed/2147483647; };
  ctx.save();
  for(let i=0;i<900;i++){
    const x=rnd()*W, y=rnd()*H, a=rnd()*0.05;
    ctx.globalAlpha=a;
    ctx.fillStyle='#FFFFFF';
    ctx.fillRect(x,y,rnd()<0.5?1:2,1);
  }
  ctx.restore();
}
function drawBackground(ctx, W, H, d){
  if (d.bgType==='wood')  return drawWood(ctx,W,H,d.bgColor);
  if (d.bgType==='chalk') return drawChalk(ctx,W,H,d.bgColor);
  if (d.bgType==='gradient'){
    const a=(d.bgAngle||135)*Math.PI/180;
    const cx=W/2, cy=H/2, len=Math.abs(W*Math.cos(a))+Math.abs(H*Math.sin(a));
    const dx=Math.cos(a)*len/2, dy=Math.sin(a)*len/2;
    const g=ctx.createLinearGradient(cx-dx,cy-dy,cx+dx,cy+dy);
    g.addColorStop(0,d.bgColor); g.addColorStop(1,d.bgColor2);
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    return;
  }
  ctx.fillStyle=d.bgColor; ctx.fillRect(0,0,W,H);
}

/* ── QR drawing from the raw matrix ── */
const qrModelCache = new Map();
function qrModel(url){
  if (!url) return null;
  if (qrModelCache.has(url)) return qrModelCache.get(url);
  let model = null;
  try {
    const qr = qrcode(0,'H'); // auto type, high error correction
    qr.addData(url); qr.make();
    model = qr;
  } catch(e){ model = null; }
  qrModelCache.set(url, model);
  return model;
}

function inFinder(r,c,n){
  return (r<7&&c<7) || (r<7&&c>=n-7) || (r>=n-7&&c<7);
}

function roundRectPath(ctx,x,y,w,h,r){
  ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
}

function drawQRStyled(ctx, model, x, y, size, d){
  const n = model.getModuleCount();
  const quiet = d.qrPanel ? 2.4 : 1.2;     // quiet zone in modules
  const m = size/(n + quiet*2);            // module px
  const ox = x + quiet*m, oy = y + quiet*m;

  if (d.qrPanel){
    ctx.save();
    ctx.beginPath();
    roundRectPath(ctx, x, y, size, size, Math.max(8, size*0.055));
    ctx.fillStyle = d.qrPanelColor;
    ctx.shadowColor='rgba(0,0,0,0.18)'; ctx.shadowBlur=10; ctx.shadowOffsetY=2;
    ctx.fill();
    ctx.restore();
  }

  ctx.fillStyle = d.qrColor;

  // data modules
  ctx.beginPath();
  for(let r=0;r<n;r++){
    for(let c=0;c<n;c++){
      if (!model.isDark(r,c) || inFinder(r,c,n)) continue;
      const mx=ox+c*m, my=oy+r*m;
      if (d.qrStyle==='dots'){
        ctx.moveTo(mx+m/2+m*0.42, my+m/2);
        ctx.arc(mx+m/2,my+m/2,m*0.42,0,Math.PI*2);
      } else if (d.qrStyle==='rounded'){
        roundRectPath(ctx,mx+m*0.06,my+m*0.06,m*0.88,m*0.88,m*0.28);
      } else {
        ctx.rect(mx,my,m+0.35,m+0.35); // slight overlap kills hairline gaps
      }
    }
  }
  ctx.fill();

  // finder patterns (eyes)
  const eye = (ex,ey)=>{
    const s7=7*m, s5=5*m, s3=3*m;
    const rr = d.qrEyeStyle==='rounded' ? 0.32 : 0.02;
    ctx.beginPath();
    roundRectPath(ctx,ex,ey,s7,s7,s7*rr);
    roundRectPath(ctx,ex+m,ey+m,s5,s5,s5*rr);
    ctx.fill('evenodd');
    ctx.beginPath();
    roundRectPath(ctx,ex+2*m,ey+2*m,s3,s3,s3*rr);
    ctx.fill();
  };
  eye(ox,oy); eye(ox+(n-7)*m,oy); eye(ox,oy+(n-7)*m);
}

/* ── text helpers ── */
function countLines(ctx,text,maxW,maxLines){
  const words=text.split(' ');let line='',c=1;
  for(const w of words){const t=line+w+' ';
    if(ctx.measureText(t).width>maxW&&line!==''){c++;if(c>=maxLines)return maxLines;line=w+' ';}else line=t;}
  return c;
}
function wrapText(ctx,text,x,y,maxW,lineH,maxLines=3){
  const words=text.split(' ');let line='',drawn=0;
  for(const w of words){const t=line+w+' ';
    if(ctx.measureText(t).width>maxW&&line!==''){
      if(drawn>=maxLines-1){let tr=line.trim();while(ctx.measureText(tr+'…').width>maxW&&tr.length>0)tr=tr.slice(0,-1);ctx.fillText(tr+'…',x,y);return;}
      ctx.fillText(line.trim(),x,y);line=w+' ';y+=lineH;drawn++;
    } else line=t;
  }
  ctx.fillText(line.trim(),x,y);
}

/* ── social icons ── */
const IG_PATHS = [
  'm510.949219 150.5c-1.199219-27.199219-5.597657-45.898438-11.898438-62.101562-6.5-17.199219-16.5-32.597657-29.601562-45.398438-12.800781-13-28.300781-23.101562-45.300781-29.5-16.296876-6.300781-34.898438-10.699219-62.097657-11.898438-27.402343-1.300781-36.101562-1.601562-105.601562-1.601562s-78.199219.300781-105.5 1.5c-27.199219 1.199219-45.898438 5.601562-62.097657 11.898438-17.203124 6.5-32.601562 16.5-45.402343 29.601562-13 12.800781-23.097657 28.300781-29.5 45.300781-6.300781 16.300781-10.699219 34.898438-11.898438 62.097657-1.300781 27.402343-1.601562 36.101562-1.601562 105.601562s.300781 78.199219 1.5 105.5c1.199219 27.199219 5.601562 45.898438 11.902343 62.101562 6.5 17.199219 16.597657 32.597657 29.597657 45.398438 12.800781 13 28.300781 23.101562 45.300781 29.5 16.300781 6.300781 34.898438 10.699219 62.101562 11.898438 27.296876 1.203124 36 1.5 105.5 1.5s78.199219-.296876 105.5-1.5c27.199219-1.199219 45.898438-5.597657 62.097657-11.898438 34.402343-13.300781 61.601562-40.5 74.902343-74.898438 6.296876-16.300781 10.699219-34.902343 11.898438-62.101562 1.199219-27.300781 1.5-36 1.5-105.5s-.101562-78.199219-1.300781-105.5zm-46.097657 209c-1.101562 25-5.300781 38.5-8.800781 47.5-8.601562 22.300781-26.300781 40-48.601562 48.601562-9 3.5-22.597657 7.699219-47.5 8.796876-27 1.203124-35.097657 1.5-103.398438 1.5s-76.5-.296876-103.402343-1.5c-25-1.097657-38.5-5.296876-47.5-8.796876-11.097657-4.101562-21.199219-10.601562-29.398438-19.101562-8.5-8.300781-15-18.300781-19.101562-29.398438-3.5-9-7.699219-22.601562-8.796876-47.5-1.203124-27-1.5-35.101562-1.5-103.402343s.296876-76.5 1.5-103.398438c1.097657-25 5.296876-38.5 8.796876-47.5 4.101562-11.101562 10.601562-21.199219 19.203124-29.402343 8.296876-8.5 18.296876-15 29.398438-19.097657 9-3.5 22.601562-7.699219 47.5-8.800781 27-1.199219 35.101562-1.5 103.398438-1.5 68.402343 0 76.5.300781 103.402343 1.5 25 1.101562 38.5 5.300781 47.5 8.800781 11.097657 4.097657 21.199219 10.597657 29.398438 19.097657 8.5 8.300781 15 18.300781 19.101562 29.402343 3.5 9 7.699219 22.597657 8.800781 47.5 1.199219 27 1.5 35.097657 1.5 103.398438s-.300781 76.300781-1.5 103.300781zm0 0',
  'm256.449219 124.5c-72.597657 0-131.5 58.898438-131.5 131.5s58.902343 131.5 131.5 131.5c72.601562 0 131.5-58.898438 131.5-131.5s-58.898438-131.5-131.5-131.5zm0 216.800781c-47.097657 0-85.300781-38.199219-85.300781-85.300781s38.203124-85.300781 85.300781-85.300781c47.101562 0 85.300781 38.199219 85.300781 85.300781s-38.199219 85.300781-85.300781 85.300781zm0 0',
  'm423.851562 119.300781c0 16.953125-13.746093 30.699219-30.703124 30.699219-16.953126 0-30.699219-13.746094-30.699219-30.699219 0-16.957031 13.746093-30.699219 30.699219-30.699219 16.957031 0 30.703124 13.742188 30.703124 30.699219zm0 0',
];
const FB_PATH = 'M452,0H60C26.916,0,0,26.916,0,60v392c0,33.084,26.916,60,60,60h392c33.084,0,60-26.916,60-60V60C512,26.916,485.084,0,452,0z M472,452c0,11.028-8.972,20-20,20H338V309h61.79L410,247h-72v-43c0-16.975,13.025-30,30-30h41v-62h-41c-50.923,0-91.978,41.25-91.978,92.174V247H216v62h60.022v163H60c-11.028,0-20-8.972-20-20V60c0-11.028,8.972-20,20-20h392c11.028,0,20,8.972,20,20V452z';

function drawIGIcon(ctx,x,y,sz,color){
  ctx.save();ctx.translate(x,y);ctx.scale(sz/511.9,sz/511.9);ctx.fillStyle=color;
  IG_PATHS.forEach(p=>ctx.fill(new Path2D(p)));ctx.restore();
}
function drawFBIcon(ctx,x,y,sz,color){
  ctx.save();ctx.translate(x,y);ctx.scale(sz/512,sz/512);ctx.fillStyle=color;
  ctx.fill(new Path2D(FB_PATH));ctx.restore();
}

/* ── the renderer ──
   opts: { scale=3, watermark=false, selection=null }
   Returns bounds map (logical units) for hit-testing. */
function renderSign(canvas, d, opts={}){
  const scale = opts.scale ?? 3;
  const cfg = SHAPE_CONFIGS[d.shape] || SHAPE_CONFIGS.portrait;
  const { W, H } = cfg;
  if (canvas.width !== W*scale || canvas.height !== H*scale){
    canvas.width = W*scale; canvas.height = H*scale;
  }
  const ctx = canvas.getContext('2d');
  const lay = d.layout || getDefaultLayout(d.shape);
  const isCentered = cfg.style === 'centered';
  const QR_SIZE = Math.round(cfg.qrSize * (d.qrScale||1));
  const MAX_W = cfg.maxW;

  const bgRef = d.bgType==='gradient' ? mixHex(d.bgColor,d.bgColor2,0.5)
              : d.bgType==='chalk' ? '#2B2B28' : d.bgColor;
  const autoText = isDark(bgRef) ? '#FFFFFF' : '#141414';
  const textColor = (d.textColor && d.textColor!=='auto') ? d.textColor : autoText;
  const dimColor = isDark(bgRef) ? 'rgba(255,255,255,0.60)' : 'rgba(0,0,0,0.52)';

  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.save();
  ctx.scale(scale,scale);
  buildShapePath(ctx,W,H,d.shape);
  ctx.clip();
  drawBackground(ctx,W,H,d);
  ctx.strokeStyle = isDark(bgRef)?'rgba(255,255,255,0.20)':'rgba(0,0,0,0.14)';
  ctx.lineWidth=5;
  buildShapePath(ctx,W,H,d.shape);
  ctx.stroke();

  const bounds = {};
  const align = isCentered ? 'center' : 'left';

  // QR
  if (d.visible.qr){
    const {x,y}=lay.qr;
    const model = d.reviewUrl ? qrModel(d.reviewUrl) : null;
    if (model) drawQRStyled(ctx,model,x,y,QR_SIZE,d);
    else {
      ctx.save();
      ctx.strokeStyle=dimColor; ctx.setLineDash([6,5]); ctx.lineWidth=2;
      ctx.strokeRect(x,y,QR_SIZE,QR_SIZE);
      ctx.setLineDash([]);
      ctx.fillStyle=dimColor; ctx.font='600 13px Inter'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('QR appears here', x+QR_SIZE/2, y+QR_SIZE/2);
      ctx.restore();
    }
    bounds.qr={x:x-8,y:y-8,w:QR_SIZE+16,h:QR_SIZE+16};
  }

  // Business name
  if (d.visible.businessName){
    const {x,y}=lay.businessName;
    const name=d.businessName||'Your Business Name';
    ctx.font=`bold 36px '${d.headingFont}'`; ctx.fillStyle=textColor;
    ctx.textAlign=align; ctx.textBaseline='top';
    const nl=countLines(ctx,name,MAX_W,2);
    wrapText(ctx,name,x,y,MAX_W,46,2);
    bounds.businessName={x:isCentered?x-MAX_W/2:x,y,w:MAX_W,h:nl*46};
  }

  // "Google Reviews" label
  if (d.visible.reviewLabel){
    const {x,y}=lay.reviewLabel;
    ctx.font=`700 14px '${d.bodyFont}'`; ctx.fillStyle=textColor;
    ctx.textAlign=align; ctx.textBaseline='top';
    ctx.fillText('Google Reviews',x,y+4);
    bounds.reviewLabel={x:isCentered?x-110:x,y,w:isCentered?220:180,h:22};
  }

  // Stars
  if (d.visible.stars){
    const {x,y}=lay.stars;
    ctx.font='26px Arial'; ctx.fillStyle=d.starColor||'#FBBC04';
    ctx.textAlign=align; ctx.textBaseline='top';
    ctx.fillText('★★★★★',x,y);
    bounds.stars={x:isCentered?x-72:x,y,w:144,h:30};
  }

  // CTA
  if (d.visible.cta){
    const {x,y}=lay.cta;
    ctx.font=`bold 25px '${d.headingFont}'`; ctx.fillStyle=textColor;
    ctx.textAlign=align; ctx.textBaseline='top';
    const nl=countLines(ctx,d.ctaText,MAX_W,3);
    wrapText(ctx,d.ctaText,x,y,MAX_W,33,3);
    bounds.cta={x:isCentered?x-MAX_W/2:x,y,w:MAX_W,h:nl*33};
  }

  // Instruction
  if (d.visible.instruction){
    const {x,y}=lay.instruction;
    ctx.font=`400 13px '${d.bodyFont}'`; ctx.fillStyle=dimColor;
    ctx.textAlign=align; ctx.textBaseline='top';
    wrapText(ctx,d.instructionText||'Point your phone camera at the code',x,y,MAX_W,18,2);
    bounds.instruction={x:isCentered?x-MAX_W/2:x,y,w:MAX_W,h:36};
  }

  // Socials — anchored above bottom edge
  const iconSz=17;
  const socialY = H - (d.socialPad||40) - (d.shape==='speech'?50:0);
  if (d.instagram || d.facebook){
    ctx.font=`500 12px '${d.bodyFont}'`; ctx.textBaseline='middle'; ctx.fillStyle=dimColor;
    const parts=[];
    if(d.instagram) parts.push({type:'ig',text:'@'+d.instagram});
    if(d.facebook)  parts.push({type:'fb',text:d.facebook});
    let totalW=0;
    parts.forEach((p,i)=>{ totalW+=iconSz+4+ctx.measureText(p.text).width+(i<parts.length-1?24:0); });
    let sx = isCentered ? W/2-totalW/2 : Math.round(W*0.055);
    parts.forEach(p=>{
      if(p.type==='ig') drawIGIcon(ctx,sx,socialY-iconSz/2,iconSz,dimColor);
      else drawFBIcon(ctx,sx,socialY-iconSz/2,iconSz,dimColor);
      ctx.fillStyle=dimColor; ctx.textAlign='left';
      ctx.fillText(p.text,sx+iconSz+4,socialY);
      sx+=iconSz+4+ctx.measureText(p.text).width+24;
    });
  }

  // Watermark for free preview exports
  if (opts.watermark){
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = isDark(bgRef) ? '#FFFFFF' : '#141414';
    ctx.font = 'bold 26px Inter';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.translate(W/2,H/2); ctx.rotate(-Math.PI/8);
    for(let ty=-H; ty<=H; ty+=110){
      for(let tx=-W; tx<=W; tx+=340){
        ctx.fillText('PREVIEW · reviewsign', tx, ty);
      }
    }
    ctx.restore();
  }

  ctx.restore();

  // Selection ring (drawn unclipped, over everything)
  if (opts.selection && bounds[opts.selection]){
    const b=bounds[opts.selection];
    ctx.save(); ctx.scale(scale,scale);
    ctx.strokeStyle='#E8630A'; ctx.lineWidth=2; ctx.setLineDash([6,4]);
    ctx.strokeRect(b.x-5,b.y-5,b.w+10,b.h+10);
    ctx.setLineDash([]); ctx.restore();
  }

  return bounds;
}
