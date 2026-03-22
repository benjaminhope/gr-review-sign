/* ===================================================
   Google Review QR Sign Builder — Frontend Logic
   =================================================== */

// ── Shape Configs ────────────────────────────────────
const SHAPE_CONFIGS = {
  portrait:  { W:480, H:680, label:'Portrait',       desc:'Counter sign · most common',      style:'centered', qrSize:190, maxW:400 },
  landscape: { W:800, H:520, label:'Landscape',       desc:'Wide format · extra text space',  style:'split',    qrSize:195, maxW:455 },
  rounded:   { W:760, H:500, label:'Rounded',         desc:'Premium feel · cafés & salons',   style:'split',    qrSize:190, maxW:445 },
  arch:      { W:520, H:700, label:'Arch',            desc:'Boutique & hospitality',          style:'centered', qrSize:190, maxW:420 },
  circle:    { W:560, H:560, label:'Circle',          desc:'Clean & minimal',                 style:'centered', qrSize:170, maxW:300 },
  speech:    { W:800, H:600, label:'Speech Bubble',   desc:'Playful · reinforces "review"',   style:'split',    qrSize:190, maxW:450 },
  star:      { W:600, H:600, label:'Star',            desc:'Tied to ratings & reviews',       style:'centered', qrSize:168, maxW:265 },
  pin:       { W:480, H:700, label:'Location Pin',    desc:'Great for local services',        style:'centered', qrSize:178, maxW:380 },
  house:     { W:540, H:700, label:'House',           desc:'Homey local businesses',          style:'centered', qrSize:170, maxW:400 },
};

const ACRYLIC_COLORS = [
  { name:'White',      hex:'#FAFAFA' }, { name:'Silver',     hex:'#9E9E9E' },
  { name:'Sky Blue',   hex:'#29B6F6' }, { name:'Royal Blue', hex:'#1565C0' },
  { name:'Purple',     hex:'#7B2D8B' }, { name:'Hot Pink',   hex:'#E91E8C' },
  { name:'Red',        hex:'#C62828' }, { name:'Amber',      hex:'#FF8F00' },
  { name:'Yellow',     hex:'#FDD835' }, { name:'Lime',       hex:'#8BC34A' },
  { name:'Green',      hex:'#2E7D32' }, { name:'Teal',       hex:'#00897B' },
  { name:'Chocolate',  hex:'#5D4037' }, { name:'Black',      hex:'#212121' },
];

function getDefaultLayout(shape) {
  const cfg = SHAPE_CONFIGS[shape] || SHAPE_CONFIGS.landscape;
  const { W, H, qrSize, style } = cfg;

  if (style === 'split') {
    return {
      qr:           { x:Math.round(W*0.665), y:Math.round((H-qrSize)/2 - H*0.05) },
      businessName: { x:Math.round(W*0.055), y:Math.round(H*0.098) },
      reviewLabel:  { x:Math.round(W*0.055), y:Math.round(H*0.34)  },
      stars:        { x:Math.round(W*0.055), y:Math.round(H*0.40)  },
      cta:          { x:Math.round(W*0.055), y:Math.round(H*0.48)  },
      instruction:  { x:Math.round(W*0.055), y:Math.round(H*0.73)  },
    };
  }

  // Centered layouts – x is the horizontal centre for text, left-edge for QR
  const qx = Math.round((W - qrSize) / 2);
  const specs = {
    portrait: { qy:50,  bnY:278, rlY:388, stY:420, ctY:468, inY:574 },
    arch:     { qy:32,  bnY:272, rlY:385, stY:417, ctY:466, inY:594 },
    circle:   { qy:60,  bnY:263, rlY:365, stY:396, ctY:437, inY:490 },
    star:     { qy:85,  bnY:294, rlY:386, stY:416, ctY:454, inY:500 },
    pin:      { qy:30,  bnY:252, rlY:362, stY:393, ctY:436, inY:498 },
    house:    { qy:275, bnY:255, rlY:482, stY:514, ctY:554, inY:625 },
  };
  const s = specs[shape] || specs.portrait;
  return {
    qr:           { x:qx,   y:s.qy  },
    businessName: { x:W/2,  y:s.bnY },
    reviewLabel:  { x:W/2,  y:s.rlY },
    stars:        { x:W/2,  y:s.stY },
    cta:          { x:W/2,  y:s.ctY },
    instruction:  { x:W/2,  y:s.inY },
  };
}

// ── State ────────────────────────────────────────────
const state = {
  placeId:null, businessName:null, businessAddress:null, reviewUrl:null,
  shape:        'portrait',
  material:     'acrylic',
  acrylicColor: '#1565C0',
  woodColor:    '#C8853A',
  font:         'Montserrat',
  ctaText:      'Leave Us a Google Review!',
  qrColor:      '#000000',
  instagram:    '',
  facebook:     '',
  socialPad:    40,
  layout:       getDefaultLayout('portrait'),
  bounds:       {},
  dragging:null, dragOffset:{x:0,y:0}, selected:null,
  qrDataUrl:null, renderCounter:0,
  visible:{qr:true,businessName:true,reviewLabel:true,stars:true,cta:true,instruction:true},
};

let qrImgCache = null, controlsWired = false;

// ── Helpers ──────────────────────────────────────────
function isDark(hex) {
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  return (r*299+g*587+b*114)/1000 < 128;
}
function grainFromBg(hex) {
  const r=parseInt(hex.slice(1,3)||'c8',16),g=parseInt(hex.slice(3,5)||'85',16),b=parseInt(hex.slice(5,7)||'3a',16);
  const lum=(r*299+g*587+b*114)/1000, dark=lum<128;
  const v1=dark?Math.min(255,lum+30):Math.max(0,lum-26);
  const v2=dark?Math.min(255,lum+15):Math.max(0,lum-12);
  const h=n=>Math.round(n).toString(16).padStart(2,'0');
  return { grain1:`#${h(v1)}${h(v1)}${h(v1)}`, grain2:`#${h(v2)}${h(v2)}${h(v2)}` };
}
function escHtml(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function countLines(ctx,text,maxW,maxLines){ const words=text.split(' ');let line='',c=1;for(const w of words){const t=line+w+' ';if(ctx.measureText(t).width>maxW&&line!==''){c++;if(c>=maxLines)return maxLines;line=w+' ';}else line=t;}return c; }
function wrapText(ctx,text,x,y,maxW,lineH,maxLines=3){ const words=text.split(' ');let line='',drawn=0;for(const w of words){const t=line+w+' ';if(ctx.measureText(t).width>maxW&&line!==''){if(drawn>=maxLines-1){let tr=line.trim();while(ctx.measureText(tr+'…').width>maxW&&tr.length>0)tr=tr.slice(0,-1);ctx.fillText(tr+'…',x,y);return;}ctx.fillText(line.trim(),x,y);line=w+' ';y+=lineH;drawn++;}else line=t;}ctx.fillText(line.trim(),x,y); }

// ── Shape Paths ──────────────────────────────────────
function buildShapePath(ctx, W, H, shape) {
  ctx.beginPath();
  switch(shape) {
    case 'portrait':
    case 'landscape':
      ctx.rect(0,0,W,H); break;
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
    case 'star': {
      const cx=W/2,cy=H/2,oR=Math.min(W,H)*0.47,iR=oR*0.42;
      for(let i=0;i<10;i++){
        const a=(Math.PI/5)*i-Math.PI/2, r=i%2===0?oR:iR;
        i===0?ctx.moveTo(cx+r*Math.cos(a),cy+r*Math.sin(a)):ctx.lineTo(cx+r*Math.cos(a),cy+r*Math.sin(a));
      } break;
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

// ── Flat Wood ────────────────────────────────────────
function drawFlatWood(ctx, W, H, woodColor) {
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

// ── Social Media Icons (official SVG paths) ──────────
function drawIGIcon(ctx, x, y, sz, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sz / 511.9, sz / 511.9);
  ctx.fillStyle = color;
  [
    'm510.949219 150.5c-1.199219-27.199219-5.597657-45.898438-11.898438-62.101562-6.5-17.199219-16.5-32.597657-29.601562-45.398438-12.800781-13-28.300781-23.101562-45.300781-29.5-16.296876-6.300781-34.898438-10.699219-62.097657-11.898438-27.402343-1.300781-36.101562-1.601562-105.601562-1.601562s-78.199219.300781-105.5 1.5c-27.199219 1.199219-45.898438 5.601562-62.097657 11.898438-17.203124 6.5-32.601562 16.5-45.402343 29.601562-13 12.800781-23.097657 28.300781-29.5 45.300781-6.300781 16.300781-10.699219 34.898438-11.898438 62.097657-1.300781 27.402343-1.601562 36.101562-1.601562 105.601562s.300781 78.199219 1.5 105.5c1.199219 27.199219 5.601562 45.898438 11.902343 62.101562 6.5 17.199219 16.597657 32.597657 29.597657 45.398438 12.800781 13 28.300781 23.101562 45.300781 29.5 16.300781 6.300781 34.898438 10.699219 62.101562 11.898438 27.296876 1.203124 36 1.5 105.5 1.5s78.199219-.296876 105.5-1.5c27.199219-1.199219 45.898438-5.597657 62.097657-11.898438 34.402343-13.300781 61.601562-40.5 74.902343-74.898438 6.296876-16.300781 10.699219-34.902343 11.898438-62.101562 1.199219-27.300781 1.5-36 1.5-105.5s-.101562-78.199219-1.300781-105.5zm-46.097657 209c-1.101562 25-5.300781 38.5-8.800781 47.5-8.601562 22.300781-26.300781 40-48.601562 48.601562-9 3.5-22.597657 7.699219-47.5 8.796876-27 1.203124-35.097657 1.5-103.398438 1.5s-76.5-.296876-103.402343-1.5c-25-1.097657-38.5-5.296876-47.5-8.796876-11.097657-4.101562-21.199219-10.601562-29.398438-19.101562-8.5-8.300781-15-18.300781-19.101562-29.398438-3.5-9-7.699219-22.601562-8.796876-47.5-1.203124-27-1.5-35.101562-1.5-103.402343s.296876-76.5 1.5-103.398438c1.097657-25 5.296876-38.5 8.796876-47.5 4.101562-11.101562 10.601562-21.199219 19.203124-29.402343 8.296876-8.5 18.296876-15 29.398438-19.097657 9-3.5 22.601562-7.699219 47.5-8.800781 27-1.199219 35.101562-1.5 103.398438-1.5 68.402343 0 76.5.300781 103.402343 1.5 25 1.101562 38.5 5.300781 47.5 8.800781 11.097657 4.097657 21.199219 10.597657 29.398438 19.097657 8.5 8.300781 15 18.300781 19.101562 29.402343 3.5 9 7.699219 22.597657 8.800781 47.5 1.199219 27 1.5 35.097657 1.5 103.398438s-.300781 76.300781-1.5 103.300781zm0 0',
    'm256.449219 124.5c-72.597657 0-131.5 58.898438-131.5 131.5s58.902343 131.5 131.5 131.5c72.601562 0 131.5-58.898438 131.5-131.5s-58.898438-131.5-131.5-131.5zm0 216.800781c-47.097657 0-85.300781-38.199219-85.300781-85.300781s38.203124-85.300781 85.300781-85.300781c47.101562 0 85.300781 38.199219 85.300781 85.300781s-38.199219 85.300781-85.300781 85.300781zm0 0',
    'm423.851562 119.300781c0 16.953125-13.746093 30.699219-30.703124 30.699219-16.953126 0-30.699219-13.746094-30.699219-30.699219 0-16.957031 13.746093-30.699219 30.699219-30.699219 16.957031 0 30.703124 13.742188 30.703124 30.699219zm0 0',
  ].forEach(d => ctx.fill(new Path2D(d)));
  ctx.restore();
}

function drawFBIcon(ctx, x, y, sz, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sz / 512, sz / 512);
  ctx.fillStyle = color;
  ctx.fill(new Path2D('M452,0H60C26.916,0,0,26.916,0,60v392c0,33.084,26.916,60,60,60h392c33.084,0,60-26.916,60-60V60C512,26.916,485.084,0,452,0z M472,452c0,11.028-8.972,20-20,20H338V309h61.79L410,247h-72v-43c0-16.975,13.025-30,30-30h41v-62h-41c-50.923,0-91.978,41.25-91.978,92.174V247H216v62h60.022v163H60c-11.028,0-20-8.972-20-20V60c0-11.028,8.972-20,20-20h392c11.028,0,20,8.972,20,20V452z'));
  ctx.restore();
}

// ── Canvas Renderer ──────────────────────────────────
const RENDER_SCALE = 3;
const signCanvas = document.getElementById('sign-canvas');
const ctx = signCanvas.getContext('2d');

function drawSign(qrImg) {
  const cfg = SHAPE_CONFIGS[state.shape] || SHAPE_CONFIGS.landscape;
  const W = cfg.W, H = cfg.H; // logical units — canvas pixels are W*RENDER_SCALE × H*RENDER_SCALE
  const bg        = state.material==='acrylic' ? state.acrylicColor : state.woodColor;
  const textColor = isDark(bg) ? '#FFFFFF' : '#0A0A0A';
  const dimColor  = isDark(bg) ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.50)';
  const isCentered = cfg.style === 'centered';
  const QR_SIZE   = cfg.qrSize;
  const MAX_TEXT_W = cfg.maxW;
  const QR_PAD    = 10;
  const lay       = state.layout;

  ctx.clearRect(0,0,signCanvas.width,signCanvas.height);

  // Background + border
  ctx.save();
  ctx.scale(RENDER_SCALE, RENDER_SCALE);
  buildShapePath(ctx,W,H,state.shape);
  ctx.clip();
  if(state.material==='wood') drawFlatWood(ctx,W,H,state.woodColor);
  else { ctx.fillStyle=bg; ctx.fillRect(0,0,W,H); }
  ctx.strokeStyle=isDark(bg)?'rgba(255,255,255,0.20)':'rgba(0,0,0,0.16)';
  ctx.lineWidth=5;
  buildShapePath(ctx,W,H,state.shape);
  ctx.stroke();

  state.bounds = {};

  const setTextStyle = (font, fillStyle, align, baseline) => {
    ctx.font=font; ctx.fillStyle=fillStyle;
    ctx.textAlign=align||(isCentered?'center':'left');
    ctx.textBaseline=baseline||'top';
  };

  // QR Code
  if(state.visible.qr) {
    const {x,y}=lay.qr;
    // No white box for either material — QR floats on the background
    if(qrImg) ctx.drawImage(qrImg,x,y,QR_SIZE,QR_SIZE);
    else { ctx.fillStyle='rgba(255,255,255,0.15)';ctx.fillRect(x,y,QR_SIZE,QR_SIZE); }
    ctx.fillStyle=dimColor;ctx.font='600 11px Inter';
    ctx.textAlign='center';ctx.textBaseline='top';
    ctx.fillText('▲ SCAN TO REVIEW ▲',x+QR_SIZE/2,y+QR_SIZE+QR_PAD+4);
    state.bounds.qr={x:x-QR_PAD,y:y-QR_PAD,w:QR_SIZE+QR_PAD*2,h:QR_SIZE+QR_PAD*2+22};
  }

  // Business Name
  if(state.visible.businessName) {
    const {x,y}=lay.businessName;
    const name=state.businessName||'Your Business Name';
    setTextStyle(`bold 36px '${state.font}'`,textColor);
    const nl=countLines(ctx,name,MAX_TEXT_W,2);
    wrapText(ctx,name,x,y,MAX_TEXT_W,46,2);
    state.bounds.businessName={x:isCentered?x-MAX_TEXT_W/2:x,y,w:MAX_TEXT_W,h:nl*46};
  }

  // Google Reviews label
  if(state.visible.reviewLabel) {
    const {x,y}=lay.reviewLabel;
    setTextStyle('700 13px Inter',textColor,isCentered?'center':'left');
    ctx.textBaseline='top';
    ctx.fillText('Google Reviews',x,y+4);
    state.bounds.reviewLabel={x:isCentered?x-110:x,y,w:isCentered?220:180,h:22};
  }

  // Stars
  if(state.visible.stars) {
    const {x,y}=lay.stars;
    setTextStyle('24px Arial',textColor,isCentered?'center':'left');
    ctx.textBaseline='top';
    ctx.fillText('★★★★★',x,y);
    state.bounds.stars={x:isCentered?x-66:x,y,w:132,h:28};
  }

  // CTA
  if(state.visible.cta) {
    const {x,y}=lay.cta;
    setTextStyle(`bold 24px '${state.font}'`,textColor);
    const nl=countLines(ctx,state.ctaText,MAX_TEXT_W,3);
    wrapText(ctx,state.ctaText,x,y,MAX_TEXT_W,32,3);
    state.bounds.cta={x:isCentered?x-MAX_TEXT_W/2:x,y,w:MAX_TEXT_W,h:nl*32};
  }

  // Instruction
  if(state.visible.instruction) {
    const {x,y}=lay.instruction;
    setTextStyle('400 12px Inter',dimColor);
    ctx.textBaseline='top';
    wrapText(ctx,'Point your phone camera at the QR code',x,y,MAX_TEXT_W,17,2);
    state.bounds.instruction={x:isCentered?x-MAX_TEXT_W/2:x,y,w:MAX_TEXT_W,h:34};
  }

  // Social Media
  const iconSz = 17;
  const socialPadExtra = state.shape==='speech' ? 50 : 0;
  const socialY = H - state.socialPad - socialPadExtra;
  if(state.instagram || state.facebook) {
    ctx.font='500 12px Inter'; ctx.textBaseline='middle'; ctx.fillStyle=dimColor;
    if(isCentered) {
      let parts=[];
      if(state.instagram) parts.push({type:'ig',text:'@'+state.instagram});
      if(state.facebook)  parts.push({type:'fb',text:state.facebook});
      let totalW=0;
      parts.forEach(p=>{totalW+=iconSz+4+ctx.measureText(p.text).width+(parts.length>1?24:0);});
      let sx=W/2-totalW/2;
      parts.forEach(p=>{
        if(p.type==='ig') drawIGIcon(ctx,sx,socialY-iconSz/2,iconSz,dimColor);
        else drawFBIcon(ctx,sx,socialY-iconSz/2,iconSz,dimColor);
        ctx.fillText(p.text,sx+iconSz+4,socialY);
        sx+=iconSz+4+ctx.measureText(p.text).width+24;
      });
    } else {
      let sx=Math.round(W*0.055);
      if(state.instagram){drawIGIcon(ctx,sx,socialY-iconSz/2,iconSz,dimColor);ctx.fillText('@'+state.instagram,sx+iconSz+4,socialY);sx+=iconSz+4+ctx.measureText('@'+state.instagram).width+20;}
      if(state.facebook) {drawFBIcon(ctx,sx,socialY-iconSz/2,iconSz,dimColor);ctx.fillText(state.facebook,sx+iconSz+4,socialY);}
    }
  }

  ctx.restore();

  // Selection / drag indicator
  const _sel=state.dragging||state.selected;
  if(_sel && state.bounds[_sel]) {
    const b=state.bounds[_sel];
    ctx.save();ctx.scale(RENDER_SCALE,RENDER_SCALE);
    ctx.strokeStyle='#1a73e8';ctx.lineWidth=2;ctx.setLineDash([6,4]);
    ctx.strokeRect(b.x-5,b.y-5,b.w+10,b.h+10);ctx.setLineDash([]);ctx.restore();
  }
}

function renderSync() { drawSign(qrImgCache); }

async function renderCanvas() {
  const rid=++state.renderCounter;
  document.getElementById('canvas-loading').classList.remove('hidden');
  try{await document.fonts.load(`bold 32px '${state.font}'`);}catch{}
  if(rid!==state.renderCounter)return;
  if(state.reviewUrl && !state.qrDataUrl){
    const isAcrylic = state.material==='acrylic';
    const qrDark  = isAcrylic ? '#FFFFFF' : state.qrColor;
    const qrLight = isAcrylic ? state.acrylicColor : '#ffffff';
    const burn    = !isAcrylic; // wood burn effect: transparent bg, 90% opaque dark
    state.qrDataUrl=await generateQRDataUrl(state.reviewUrl, qrDark, qrLight, burn);
    qrImgCache=null;
  }
  if(state.qrDataUrl && !qrImgCache){
    qrImgCache=new Image();qrImgCache.src=state.qrDataUrl;
    await new Promise(r=>{qrImgCache.onload=r;qrImgCache.onerror=r;});
  }
  if(rid!==state.renderCounter)return;
  renderSync();
  document.getElementById('canvas-loading').classList.add('hidden');
}

// ── QR Generation ────────────────────────────────────
async function generateQRDataUrl(url, color, colorLight='#ffffff', burnEffect=false) {
  return new Promise(resolve=>{
    const div=document.getElementById('qr-offscreen');
    div.innerHTML='';
    new QRCode(div,{text:url,width:768,height:768,colorDark:color,colorLight:colorLight,correctLevel:QRCode.CorrectLevel.H});
    setTimeout(async()=>{
      try{
        const c=await html2canvas(div,{scale:1,backgroundColor:null,logging:false});
        if(burnEffect){
          const ictx=c.getContext('2d');
          const imgData=ictx.getImageData(0,0,c.width,c.height);
          const d=imgData.data;
          for(let i=0;i<d.length;i+=4){
            if((d[i]+d[i+1]+d[i+2])/3 > 128){
              d[i+3]=0; // light module → fully transparent
            } else {
              d[i]=0;d[i+1]=0;d[i+2]=0;d[i+3]=230; // dark module → 90% opaque black
            }
          }
          ictx.putImageData(imgData,0,0);
        }
        resolve(c.toDataURL('image/png'));
      }
      catch{const qc=div.querySelector('canvas');resolve(qc?qc.toDataURL('image/png'):null);}
    },100);
  });
}

// ── Google Places ────────────────────────────────────
let autocompleteService=null,placesService=null,searchDebounce=null;

window.initPlacesAPI=function(){
  autocompleteService=new google.maps.places.AutocompleteService();
  placesService=new google.maps.places.PlacesService(document.getElementById('places-attribution'));
};

const searchInput=document.getElementById('business-search');
searchInput.addEventListener('input',()=>{
  clearTimeout(searchDebounce);
  const q=searchInput.value.trim();
  document.getElementById('places-results').innerHTML='';
  if(q.length<2)return;
  document.getElementById('search-spinner').classList.remove('hidden');
  searchDebounce=setTimeout(()=>fetchPredictions(q),350);
});

function fetchPredictions(query){
  if(!autocompleteService){document.getElementById('search-spinner').classList.add('hidden');showSearchError('Google Maps loading…');return;}
  autocompleteService.getPlacePredictions({input:query,types:['establishment']},(predictions,status)=>{
    document.getElementById('search-spinner').classList.add('hidden');
    const c=document.getElementById('places-results');
    if(status!==google.maps.places.PlacesServiceStatus.OK||!predictions?.length){c.innerHTML='<div class="prediction-item"><span>No results found.</span></div>';return;}
    c.innerHTML='';
    predictions.slice(0,6).forEach(p=>{
      const d=document.createElement('div');d.className='prediction-item';d.setAttribute('role','option');
      d.innerHTML=`<strong>${escHtml(p.structured_formatting.main_text)}</strong><span>${escHtml(p.structured_formatting.secondary_text||'')}</span>`;
      d.addEventListener('click',()=>selectPlace(p.place_id));
      c.appendChild(d);
    });
  });
}

function selectPlace(placeId){
  document.getElementById('places-results').innerHTML='';
  document.getElementById('search-spinner').classList.remove('hidden');
  placesService.getDetails({placeId,fields:['name','place_id','formatted_address']},(place,status)=>{
    document.getElementById('search-spinner').classList.add('hidden');
    if(status!==google.maps.places.PlacesServiceStatus.OK){showSearchError('Could not load details. Please try again.');return;}
    state.placeId=place.place_id;state.businessName=place.name;
    state.businessAddress=place.formatted_address||'';
    state.reviewUrl=`https://search.google.com/local/writereview?placeid=${place.place_id}`;
    state.qrDataUrl=null;qrImgCache=null;
    searchInput.value=place.name;
    showSelectedBusiness(place);
    document.getElementById('to-step-3').disabled=false;
  });
}

function showSelectedBusiness(place){
  document.getElementById('selected-name').textContent=place.name;
  document.getElementById('selected-address').textContent=place.formatted_address||'';
  const u=document.getElementById('selected-url');u.textContent=state.reviewUrl;u.href=state.reviewUrl;
  document.getElementById('selected-business').classList.remove('hidden');
}

document.getElementById('change-business').addEventListener('click',()=>{
  document.getElementById('selected-business').classList.add('hidden');
  document.getElementById('to-step-3').disabled=true;
  state.placeId=state.businessName=state.reviewUrl=state.qrDataUrl=null;
  qrImgCache=null;searchInput.value='';searchInput.focus();
});

function showSearchError(msg){
  document.getElementById('places-results').innerHTML=`<div class="prediction-item" style="color:#ea4335"><span>${msg}</span></div>`;
}

// ── Step Navigation ──────────────────────────────────
function goToStep(n){
  document.querySelectorAll('.step-panel').forEach(p=>p.classList.remove('active'));
  document.getElementById(`step-${n}`).classList.add('active');
  for(let i=1;i<=4;i++){
    const el=document.getElementById(`nav-step-${i}`);
    if(!el)continue;
    el.classList.remove('active','completed');
    if(i===n)el.classList.add('active');
    else if(i<n)el.classList.add('completed');
  }
  window.scrollTo({top:0,behavior:'smooth'});
  if(n===3) initDesigner();
}

document.getElementById('shape-to-step-2').addEventListener('click',()=>goToStep(2));
document.getElementById('to-step-3').addEventListener('click',()=>goToStep(3));
document.getElementById('to-step-4').addEventListener('click',()=>goToStep(4));
document.getElementById('back-to-step-1').addEventListener('click',()=>goToStep(1));
document.getElementById('back-to-step-2').addEventListener('click',()=>goToStep(2));
document.getElementById('back-to-step-3').addEventListener('click',()=>goToStep(3));

// Shape cards in Step 1
document.querySelectorAll('.shape-picker-card').forEach(card=>{
  card.addEventListener('click',()=>{
    document.querySelectorAll('.shape-picker-card').forEach(c=>c.classList.remove('active'));
    card.classList.add('active');
    state.shape=card.dataset.shape;
    state.layout=getDefaultLayout(state.shape);
    qrImgCache=null;
  });
});

// ── Designer ─────────────────────────────────────────
function initDesigner(){
  // Resize canvas to match shape at high resolution
  const cfg=SHAPE_CONFIGS[state.shape]||SHAPE_CONFIGS.landscape;
  signCanvas.width=cfg.W*RENDER_SCALE;
  signCanvas.height=cfg.H*RENDER_SCALE;
  // Re-apply default layout if shape changed
  state.layout=getDefaultLayout(state.shape);
  renderCanvas();
  if(!controlsWired){wireControls();controlsWired=true;}
}

function wireControls(){
  // Material toggle
  document.querySelectorAll('[data-material]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      state.material=btn.dataset.material;
      document.querySelectorAll('[data-material]').forEach(b=>b.classList.toggle('active',b===btn));
      document.getElementById('acrylic-colors-group').style.display=state.material==='acrylic'?'':'none';
      document.getElementById('wood-color-group').style.display=state.material==='wood'?'':'none';
      // Regenerate QR with correct colours for new material
      state.qrDataUrl=null; qrImgCache=null;
      renderCanvas();
    });
  });

  // Acrylic swatches
  document.querySelectorAll('.acrylic-swatch').forEach(btn=>{
    btn.addEventListener('click',()=>{
      state.acrylicColor=btn.dataset.color;
      document.querySelectorAll('.acrylic-swatch').forEach(b=>b.classList.remove('selected'));
      btn.classList.add('selected');
      // colorLight must match new background colour
      state.qrDataUrl=null; qrImgCache=null;
      renderCanvas();
    });
  });

  // Wood color
  document.getElementById('wood-color')?.addEventListener('input',e=>{state.woodColor=e.target.value;state.qrDataUrl=null;qrImgCache=null;renderCanvas();});

  // Font
  document.querySelectorAll('input[name="font"]').forEach(r=>r.addEventListener('change',()=>{state.font=r.value;renderCanvas();}));

  // CTA presets
  document.querySelectorAll('.cta-preset').forEach(btn=>{
    btn.addEventListener('click',()=>{
      state.ctaText=btn.dataset.text;
      document.querySelectorAll('.cta-preset').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('cta-custom').value='';renderCanvas();
    });
  });

  // CTA custom
  let ctaTimer;
  document.getElementById('cta-custom').addEventListener('input',e=>{
    const v=e.target.value.trim();if(v){state.ctaText=v;document.querySelectorAll('.cta-preset').forEach(b=>b.classList.remove('active'));clearTimeout(ctaTimer);ctaTimer=setTimeout(renderCanvas,300);}
  });

  // QR color
  document.getElementById('color-qr')?.addEventListener('change',e=>{state.qrColor=e.target.value;state.qrDataUrl=null;qrImgCache=null;renderCanvas();});

  // Social media
  document.getElementById('input-instagram')?.addEventListener('input',e=>{state.instagram=e.target.value.replace(/^@/,'').trim();clearTimeout(ctaTimer);ctaTimer=setTimeout(renderSync,300);});
  document.getElementById('input-facebook')?.addEventListener('input',e=>{state.facebook=e.target.value.trim();clearTimeout(ctaTimer);ctaTimer=setTimeout(renderSync,300);});
  const socialPadSlider=document.getElementById('social-pad');
  const socialPadVal=document.getElementById('social-pad-val');
  socialPadSlider?.addEventListener('input',e=>{
    state.socialPad=Number(e.target.value);
    if(socialPadVal) socialPadVal.textContent=e.target.value+'px';
    renderSync();
  });

  // Reset layout
  document.getElementById('reset-layout')?.addEventListener('click',()=>{state.layout=getDefaultLayout(state.shape);renderCanvas();});

  wireElementToggles();
  document.querySelectorAll('[data-align]').forEach(btn=>btn.addEventListener('click',()=>alignSelected(btn.dataset.align)));
  document.getElementById('delete-selected')?.addEventListener('click',()=>{
    if(!state.selected)return;
    const key=state.selected;
    state.visible[key]=false;
    const tog=document.querySelector(`[data-element-key="${key}"]`);
    if(tog){tog.textContent='Show';tog.classList.add('el-off');}
    state.selected=null;updateAlignToolbar();renderSync();
  });
  updateAlignToolbar();

  wireDragDrop();
}

// ── Drag & Drop ──────────────────────────────────────
function canvasPos(clientX,clientY){
  const rect=signCanvas.getBoundingClientRect();
  const cfg=SHAPE_CONFIGS[state.shape]||SHAPE_CONFIGS.portrait;
  // Return logical coords (0..W, 0..H) so they match state.bounds and state.layout
  return{x:(clientX-rect.left)*cfg.W/rect.width,y:(clientY-rect.top)*cfg.H/rect.height};
}
function hitTest(x,y){
  for(const key of ['instruction','cta','stars','reviewLabel','businessName','qr']){
    const b=state.bounds[key];if(b&&x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h)return key;
  }return null;
}
function wireDragDrop(){
  signCanvas.addEventListener('mousedown',e=>{
    const pos=canvasPos(e.clientX,e.clientY),key=hitTest(pos.x,pos.y);
    if(key){state.dragging=key;state.selected=key;state.dragOffset={x:pos.x-state.layout[key].x,y:pos.y-state.layout[key].y};signCanvas.style.cursor='grabbing';updateAlignToolbar();e.preventDefault();}
    else{state.selected=null;updateAlignToolbar();renderSync();}
  });
  window.addEventListener('mousemove',e=>{
    if(state.dragging){const pos=canvasPos(e.clientX,e.clientY);state.layout[state.dragging].x=Math.round(pos.x-state.dragOffset.x);state.layout[state.dragging].y=Math.round(pos.y-state.dragOffset.y);renderSync();}
    else{const pos=canvasPos(e.clientX,e.clientY);signCanvas.style.cursor=hitTest(pos.x,pos.y)?'grab':'default';}
  });
  window.addEventListener('mouseup',()=>{if(state.dragging){state.dragging=null;signCanvas.style.cursor='default';}});
  signCanvas.addEventListener('touchstart',e=>{const t=e.touches[0],pos=canvasPos(t.clientX,t.clientY),key=hitTest(pos.x,pos.y);if(key){state.dragging=key;state.selected=key;state.dragOffset={x:pos.x-state.layout[key].x,y:pos.y-state.layout[key].y};updateAlignToolbar();e.preventDefault();}},{passive:false});
  window.addEventListener('touchmove',e=>{if(!state.dragging)return;const t=e.touches[0],pos=canvasPos(t.clientX,t.clientY);state.layout[state.dragging].x=Math.round(pos.x-state.dragOffset.x);state.layout[state.dragging].y=Math.round(pos.y-state.dragOffset.y);renderSync();e.preventDefault();},{passive:false});
  window.addEventListener('touchend',()=>{state.dragging=null;});
}

// ── Element Visibility & Alignment ───────────────────
function wireElementToggles(){
  document.querySelectorAll('[data-element-key]').forEach(btn=>{
    const key=btn.dataset.elementKey;
    btn.addEventListener('click',()=>{
      state.visible[key]=!state.visible[key];
      btn.textContent=state.visible[key]?'Hide':'Show';
      btn.classList.toggle('el-off',!state.visible[key]);
      if(!state.visible[key]&&state.selected===key){state.selected=null;updateAlignToolbar();}
      renderSync();
    });
  });
}

function updateAlignToolbar(){
  const names={qr:'QR Code',businessName:'Business Name',reviewLabel:'Google Reviews',stars:'Stars',cta:'Call to Action',instruction:'Instruction'};
  document.getElementById('align-label').textContent=state.selected?(names[state.selected]||state.selected):'Select an element';
  const on=!!state.selected;
  document.querySelectorAll('.align-btn').forEach(b=>b.disabled=!on);
}

function alignSelected(dir){
  const key=state.selected;
  if(!key||!state.bounds[key])return;
  const cfg=SHAPE_CONFIGS[state.shape];
  const W=cfg.W,H=cfg.H,b=state.bounds[key];
  if(dir==='left')        state.layout[key].x+=-b.x;
  else if(dir==='hcenter')state.layout[key].x+=(W/2)-(b.x+b.w/2);
  else if(dir==='right')  state.layout[key].x+=W-(b.x+b.w);
  else if(dir==='top')    state.layout[key].y+=-b.y;
  else if(dir==='vcenter')state.layout[key].y+=(H/2)-(b.y+b.h/2);
  else if(dir==='bottom') state.layout[key].y+=H-(b.y+b.h);
  renderSync();
}

// ── Checkout ─────────────────────────────────────────
document.querySelectorAll('.checkout-btn').forEach(btn=>{
  btn.addEventListener('click',async()=>{
    const tier=btn.closest('[data-tier]')?.dataset.tier;if(!tier||!state.reviewUrl)return;
    btn.disabled=true;btn.textContent='Processing…';
    sessionStorage.setItem('qrSignDesign',JSON.stringify({
      businessName:state.businessName,reviewUrl:state.reviewUrl,
      material:state.material,acrylicColor:state.acrylicColor,woodColor:state.woodColor,
      shape:state.shape,font:state.font,ctaText:state.ctaText,qrColor:state.qrColor,
      instagram:state.instagram,facebook:state.facebook,socialPad:state.socialPad,layout:state.layout,qrDataUrl:state.qrDataUrl,
    }));
    try{
      const res=await fetch('/api/create-checkout-session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tier})});
      const data=await res.json();if(data.url)window.location.href=data.url;else throw new Error();
    }catch{btn.disabled=false;btn.textContent=tier==='digital'?'Buy Digital – $14.99':'Buy Print-Ready – $29.99';alert('Could not start checkout. Please try again.');}
  });
});
