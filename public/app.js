/* ============================================================
   ReviewSign — designer page logic
   Requires vendor/qrcode.js + render-core.js loaded first.
   ============================================================ */

const STORAGE_KEY = 'reviewsign.design.v2';

/* ── state ── */
let design = loadDesign();
let selected = null, dragging = null, dragOffset = {x:0,y:0};
let bounds = {};
let placeMeta = { placeId:null, address:null };

const canvas = document.getElementById('sign-canvas');

function loadDesign(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw){
      const saved = JSON.parse(raw);
      const d = Object.assign(defaultDesign(), saved);
      d.visible = Object.assign(defaultDesign().visible, saved.visible||{});
      if (!SHAPE_CONFIGS[d.shape]){ d.shape='portrait'; d.layout=getDefaultLayout('portrait'); }
      return d;
    }
  } catch(e){}
  const d = defaultDesign();
  d.layout = getDefaultLayout(d.shape);
  return d;
}
let saveTimer;
function persist(){
  clearTimeout(saveTimer);
  saveTimer = setTimeout(()=>{
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(design)); } catch(e){}
  }, 250);
}

/* ── render loop ── */
function paint(){
  bounds = renderSign(canvas, design, { scale: 3, selection: selected });
  updateScanPill();
  updateStatus();
  persist();
}

function updateScanPill(){
  const pill = document.getElementById('scan-pill');
  const res = qrScanCheck(design);
  pill.className = 'scan-pill ' + res.level;
  document.getElementById('scan-msg').textContent = res.msg;
}

function updateStatus(){
  const el = document.getElementById('topbar-status');
  el.textContent = design.businessName
    ? `${design.businessName} — ${SHAPE_CONFIGS[design.shape].label}`
    : 'Untitled sign — pick your business to activate the QR';
}

function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(()=>t.classList.remove('show'), 2600);
}

/* ══════════════ CONTROL WIRING ══════════════ */

/* templates strip */
const tplStrip = document.getElementById('tpl-strip');
TEMPLATES.forEach(tpl=>{
  const b = document.createElement('button');
  b.className = 'tpl-chip' + (design.template===tpl.id?' active':'');
  b.dataset.tpl = tpl.id;
  b.innerHTML = `<div class="tc-wrap"><canvas></canvas></div><div class="tc-name">${tpl.name}</div>`;
  b.addEventListener('click', ()=>{
    design = applyTemplate(design, tpl.id);
    document.querySelectorAll('.tpl-chip').forEach(c=>c.classList.toggle('active', c===b));
    syncControlsFromDesign();
    paint();
  });
  tplStrip.appendChild(b);
  const td = applyTemplate(defaultDesign(), tpl.id);
  td.businessName = tpl.name; td.reviewUrl = 'https://example.com/demo';
  renderSign(b.querySelector('canvas'), td, { scale: 0.5 });
});

/* shapes */
const SHAPE_ICONS = {
  portrait:'<rect x="8" y="3" width="18" height="28" rx="2"/>', landscape:'<rect x="3" y="8" width="28" height="18" rx="2"/>',
  rounded:'<rect x="3" y="8" width="28" height="18" rx="7"/>', arch:'<path d="M7,31 L7,15 A10,10 0,0,1 27,15 L27,31 Z"/>',
  circle:'<circle cx="17" cy="17" r="13"/>', speech:'<path d="M7,5 L27,5 Q31,5 31,9 L31,20 Q31,24 27,24 L17,24 L13,30 L11,24 L7,24 Q3,24 3,20 L3,9 Q3,5 7,5 Z"/>',
  pin:'<path d="M17,31 C10,22 6,17 6,11.5 A11,11 0,0,1 28,11.5 C28,17 24,22 17,31 Z"/>',
  house:'<polygon points="3,15 17,3 31,15 31,31 3,31"/>',
};
const shapeGrid = document.getElementById('shape-grid');
Object.entries(SHAPE_CONFIGS).forEach(([key,cfg])=>{
  const b = document.createElement('button');
  b.className = 'shape-cell' + (design.shape===key?' active':'');
  b.dataset.shape = key;
  b.innerHTML = `<svg viewBox="0 0 34 34" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.8">${SHAPE_ICONS[key]}</svg><span>${cfg.label}</span>`;
  b.addEventListener('click', ()=>{
    design.shape = key;
    design.layout = getDefaultLayout(key);
    document.querySelectorAll('.shape-cell').forEach(c=>c.classList.toggle('active', c===b));
    selected=null; updateToolbar();
    paint();
  });
  shapeGrid.appendChild(b);
});

/* background type */
document.querySelectorAll('#bg-type-row .seg-btn').forEach(b=>{
  b.addEventListener('click', ()=>{
    design.bgType = b.dataset.bgtype;
    document.querySelectorAll('#bg-type-row .seg-btn').forEach(x=>x.classList.toggle('active', x===b));
    if (design.bgType==='chalk' && design.bgColor==='#FFFFFF') design.bgColor='#2B2B28';
    if (design.bgType==='wood'  && (design.bgColor==='#FFFFFF'||design.bgColor==='#2B2B28')) design.bgColor='#C8853A';
    syncBgRows();
    paint();
  });
});
function syncBgRows(){
  const grad = design.bgType==='gradient';
  document.getElementById('bg2-row').style.display = grad?'':'none';
  document.getElementById('angle-row').style.display = grad?'':'none';
}

/* palette swatches */
const PALETTE = [
  '#FFFFFF','#F5F1E8','#FBE6E3','#DFF5EC','#CDE6F7','#FDF3D0','#EFE6F7',
  '#141414','#2B2B28','#1B2240','#0E5C45','#1565C0','#7B2D8B','#8C1D18',
  '#E8630A','#FFC821','#C8853A','#D4AF37','#E91E8C','#00897B','#5D4037',
];
const bgSwatches = document.getElementById('bg-swatches');
PALETTE.forEach(hex=>{
  const s = document.createElement('button');
  s.className = 'swatch'; s.style.background = hex; s.title = hex;
  s.addEventListener('click', ()=>{
    design.bgColor = hex;
    document.getElementById('bg-color').value = hex;
    document.querySelectorAll('#bg-swatches .swatch').forEach(x=>x.classList.toggle('selected', x===s));
    paint();
  });
  bgSwatches.appendChild(s);
});

document.getElementById('bg-color').addEventListener('input', e=>{ design.bgColor=e.target.value; paint(); });
document.getElementById('bg-color2').addEventListener('input', e=>{ design.bgColor2=e.target.value; paint(); });
document.getElementById('bg-angle').addEventListener('input', e=>{
  design.bgAngle=+e.target.value;
  document.getElementById('bg-angle-out').textContent=e.target.value+'°';
  paint();
});

/* text colour */
document.getElementById('text-auto-btn').addEventListener('click', function(){
  design.textColor='auto';
  this.classList.add('active');
  document.getElementById('text-custom-btn').classList.remove('active');
  document.getElementById('text-color-row').style.display='none';
  paint();
});
document.getElementById('text-custom-btn').addEventListener('click', function(){
  design.textColor=document.getElementById('text-color').value;
  this.classList.add('active');
  document.getElementById('text-auto-btn').classList.remove('active');
  document.getElementById('text-color-row').style.display='';
  paint();
});
document.getElementById('text-color').addEventListener('input', e=>{ design.textColor=e.target.value; paint(); });
document.getElementById('star-color').addEventListener('input', e=>{ design.starColor=e.target.value; paint(); });

/* QR style */
document.querySelectorAll('#qr-style-row .seg-btn').forEach(b=>{
  b.addEventListener('click', ()=>{
    design.qrStyle=b.dataset.qrstyle;
    document.querySelectorAll('#qr-style-row .seg-btn').forEach(x=>x.classList.toggle('active', x===b));
    paint();
  });
});
document.querySelectorAll('#qr-eye-row .seg-btn').forEach(b=>{
  b.addEventListener('click', ()=>{
    design.qrEyeStyle=b.dataset.qreye;
    document.querySelectorAll('#qr-eye-row .seg-btn').forEach(x=>x.classList.toggle('active', x===b));
    paint();
  });
});
document.getElementById('qr-color').addEventListener('input', e=>{ design.qrColor=e.target.value; paint(); });
document.getElementById('qr-panel-toggle').addEventListener('click', function(){
  design.qrPanel=!design.qrPanel;
  this.textContent=design.qrPanel?'On':'Off';
  this.classList.toggle('el-off', !design.qrPanel);
  document.getElementById('qr-panel-color-row').style.display=design.qrPanel?'':'none';
  paint();
});
document.getElementById('qr-panel-color').addEventListener('input', e=>{ design.qrPanelColor=e.target.value; paint(); });
document.getElementById('qr-scale').addEventListener('input', e=>{
  design.qrScale=+e.target.value;
  document.getElementById('qr-scale-out').textContent=Math.round(design.qrScale*100)+'%';
  paint();
});

/* wording & fonts */
document.querySelectorAll('#cta-presets .chip').forEach(b=>{
  b.addEventListener('click', ()=>{
    design.ctaText=b.dataset.cta;
    document.querySelectorAll('#cta-presets .chip').forEach(x=>x.classList.toggle('active', x===b));
    document.getElementById('cta-custom').value='';
    paint();
  });
});
document.getElementById('cta-custom').addEventListener('input', e=>{
  const v=e.target.value.trim();
  if (v){ design.ctaText=v; document.querySelectorAll('#cta-presets .chip').forEach(x=>x.classList.remove('active')); }
  paint();
});
document.getElementById('in-instruction').addEventListener('input', e=>{
  design.instructionText=e.target.value.trim()||'Point your phone camera at the code';
  paint();
});

const headingSel = document.getElementById('font-heading');
const bodySel = document.getElementById('font-body');
SIGN_FONTS.forEach(f=>{
  headingSel.add(new Option(f,f));
  bodySel.add(new Option(f,f));
});
headingSel.addEventListener('change', async e=>{
  design.headingFont=e.target.value;
  try{ await document.fonts.load(`bold 36px '${design.headingFont}'`); }catch(x){}
  paint();
});
bodySel.addEventListener('change', async e=>{
  design.bodyFont=e.target.value;
  try{ await document.fonts.load(`400 14px '${design.bodyFont}'`); }catch(x){}
  paint();
});

/* business name + socials */
document.getElementById('in-bizname').addEventListener('input', e=>{ design.businessName=e.target.value; paint(); });
document.getElementById('in-instagram').addEventListener('input', e=>{ design.instagram=e.target.value.replace(/^@/,'').trim(); paint(); });
document.getElementById('in-facebook').addEventListener('input', e=>{ design.facebook=e.target.value.trim(); paint(); });
document.getElementById('social-pad').addEventListener('input', e=>{
  design.socialPad=+e.target.value;
  document.getElementById('social-pad-out').textContent=e.target.value;
  paint();
});

/* element toggles */
document.querySelectorAll('#element-toggles .el-toggle').forEach(b=>{
  b.addEventListener('click', ()=>{
    const key=b.dataset.el;
    design.visible[key]=!design.visible[key];
    b.textContent=design.visible[key]?'Hide':'Show';
    b.classList.toggle('el-off', !design.visible[key]);
    if (!design.visible[key] && selected===key){ selected=null; updateToolbar(); }
    paint();
  });
});
document.getElementById('reset-layout').addEventListener('click', ()=>{
  design.layout=getDefaultLayout(design.shape);
  paint();
  toast('Layout reset');
});

/* ── manual link + Google Places ── */
document.getElementById('manual-link-toggle').addEventListener('click', e=>{
  e.preventDefault();
  const row=document.getElementById('manual-link-row');
  row.style.display=row.style.display==='none'?'':'none';
  if (row.style.display!=='none') document.getElementById('manual-url').focus();
});
document.getElementById('manual-url').addEventListener('input', e=>{
  const v=e.target.value.trim();
  if (v.length>8 && /^https?:\/\//i.test(v)){
    design.reviewUrl=v;
    placeMeta={placeId:null,address:null};
    showSelectedBiz(design.businessName||'Custom link', v);
    paint();
  }
});

let autocompleteService=null, placesService=null, searchDebounce=null;
window.initPlacesAPI=function(){
  try{
    autocompleteService=new google.maps.places.AutocompleteService();
    placesService=new google.maps.places.PlacesService(document.getElementById('places-attribution'));
  }catch(e){}
};

const bizSearch=document.getElementById('biz-search');
const bizResults=document.getElementById('biz-results');
bizSearch.addEventListener('input', ()=>{
  clearTimeout(searchDebounce);
  const q=bizSearch.value.trim();
  bizResults.innerHTML='';
  if (q.length<2) return;
  searchDebounce=setTimeout(()=>fetchPredictions(q), 320);
});

function escHtml(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function fetchPredictions(query){
  if (!autocompleteService){
    bizResults.innerHTML='<div class="biz-item"><span>Business search unavailable — paste your review link below instead.</span></div>';
    document.getElementById('manual-link-row').style.display='';
    return;
  }
  autocompleteService.getPlacePredictions({input:query,types:['establishment']},(preds,status)=>{
    if (status!==google.maps.places.PlacesServiceStatus.OK || !preds?.length){
      bizResults.innerHTML='<div class="biz-item"><span>No results — try the link option below.</span></div>';
      return;
    }
    bizResults.innerHTML='';
    preds.slice(0,6).forEach(p=>{
      const d=document.createElement('div');
      d.className='biz-item';
      d.innerHTML=`<strong>${escHtml(p.structured_formatting.main_text)}</strong><span>${escHtml(p.structured_formatting.secondary_text||'')}</span>`;
      d.addEventListener('click',()=>selectPlace(p.place_id));
      bizResults.appendChild(d);
    });
  });
}

function selectPlace(placeId){
  bizResults.innerHTML='';
  placesService.getDetails({placeId,fields:['name','place_id','formatted_address']},(place,status)=>{
    if (status!==google.maps.places.PlacesServiceStatus.OK){ toast('Could not load that business — try again'); return; }
    placeMeta={placeId:place.place_id,address:place.formatted_address||''};
    design.businessName=place.name;
    design.reviewUrl=`https://search.google.com/local/writereview?placeid=${place.place_id}`;
    document.getElementById('in-bizname').value=place.name;
    bizSearch.value=place.name;
    showSelectedBiz(place.name, design.reviewUrl);
    paint();
  });
}

function showSelectedBiz(name, url){
  document.getElementById('biz-selected').style.display='';
  document.getElementById('biz-sel-name').textContent=name;
  document.getElementById('biz-sel-url').textContent=url;
}

/* ── drag & drop / selection ── */
function canvasPos(clientX, clientY){
  const rect=canvas.getBoundingClientRect();
  const cfg=SHAPE_CONFIGS[design.shape];
  return { x:(clientX-rect.left)*cfg.W/rect.width, y:(clientY-rect.top)*cfg.H/rect.height };
}
function hitTest(x,y){
  for (const key of ['instruction','cta','stars','reviewLabel','businessName','qr']){
    const b=bounds[key];
    if (b && design.visible[key] && x>=b.x && x<=b.x+b.w && y>=b.y && y<=b.y+b.h) return key;
  }
  return null;
}
canvas.addEventListener('mousedown', e=>{
  const pos=canvasPos(e.clientX,e.clientY), key=hitTest(pos.x,pos.y);
  if (key){
    dragging=key; selected=key;
    dragOffset={x:pos.x-design.layout[key].x, y:pos.y-design.layout[key].y};
    canvas.style.cursor='grabbing';
    updateToolbar(); paint(); e.preventDefault();
  } else { selected=null; updateToolbar(); paint(); }
});
window.addEventListener('mousemove', e=>{
  if (dragging){
    const pos=canvasPos(e.clientX,e.clientY);
    design.layout[dragging].x=Math.round(pos.x-dragOffset.x);
    design.layout[dragging].y=Math.round(pos.y-dragOffset.y);
    paint();
  } else if (e.target===canvas){
    const pos=canvasPos(e.clientX,e.clientY);
    canvas.style.cursor=hitTest(pos.x,pos.y)?'grab':'default';
  }
});
window.addEventListener('mouseup', ()=>{ if(dragging){dragging=null;canvas.style.cursor='default';} });
canvas.addEventListener('touchstart', e=>{
  const t=e.touches[0], pos=canvasPos(t.clientX,t.clientY), key=hitTest(pos.x,pos.y);
  if (key){
    dragging=key; selected=key;
    dragOffset={x:pos.x-design.layout[key].x,y:pos.y-design.layout[key].y};
    updateToolbar(); e.preventDefault();
  }
},{passive:false});
window.addEventListener('touchmove', e=>{
  if(!dragging)return;
  const t=e.touches[0], pos=canvasPos(t.clientX,t.clientY);
  design.layout[dragging].x=Math.round(pos.x-dragOffset.x);
  design.layout[dragging].y=Math.round(pos.y-dragOffset.y);
  paint(); e.preventDefault();
},{passive:false});
window.addEventListener('touchend', ()=>{dragging=null;});

/* toolbar */
const EL_NAMES={qr:'QR code',businessName:'Business name',reviewLabel:'"Google Reviews"',stars:'Stars',cta:'Call to action',instruction:'Small print'};
function updateToolbar(){
  document.getElementById('sel-label').textContent = selected ? EL_NAMES[selected] : 'Click an element to select it';
  document.querySelectorAll('.align-btn').forEach(b=>b.disabled=!selected);
}
document.querySelectorAll('[data-align]').forEach(b=>b.addEventListener('click',()=>{
  if(!selected||!bounds[selected])return;
  const cfg=SHAPE_CONFIGS[design.shape], W=cfg.W, H=cfg.H, bb=bounds[selected];
  const dir=b.dataset.align;
  if(dir==='left')        design.layout[selected].x+=-bb.x;
  else if(dir==='hcenter')design.layout[selected].x+=(W/2)-(bb.x+bb.w/2);
  else if(dir==='right')  design.layout[selected].x+=W-(bb.x+bb.w);
  else if(dir==='top')    design.layout[selected].y+=-bb.y;
  else if(dir==='vcenter')design.layout[selected].y+=(H/2)-(bb.y+bb.h/2);
  else if(dir==='bottom') design.layout[selected].y+=H-(bb.y+bb.h);
  paint();
}));
document.getElementById('hide-selected').addEventListener('click',()=>{
  if(!selected)return;
  design.visible[selected]=false;
  const t=document.querySelector(`[data-el="${selected}"]`);
  if(t){t.textContent='Show';t.classList.add('el-off');}
  selected=null; updateToolbar(); paint();
});

/* ── free watermarked download ── */
function freeDownload(){
  if (!design.reviewUrl){ toast('Pick your business (or paste a link) first — the QR needs somewhere to point'); openSection('sec-business'); return; }
  const scan=qrScanCheck(design);
  if (scan.level==='bad' && !confirm('Heads up: the scan check says this QR will NOT scan as designed.\n\n'+scan.msg+'\n\nDownload anyway?')) return;
  const off=document.createElement('canvas');
  renderSign(off, design, { scale:2, watermark:true });
  off.toBlob(blob=>{
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=`${(design.businessName||'review-sign').replace(/[^a-z0-9]/gi,'-').toLowerCase()}-preview.png`;
    a.click();
    URL.revokeObjectURL(url);
  },'image/png');
  toast('Preview downloaded — the paid file has no watermark');
}
document.getElementById('btn-free-download').addEventListener('click', freeDownload);
document.getElementById('btn-free-download-2').addEventListener('click', freeDownload);

function openSection(id){
  const el=document.getElementById(id);
  if(el){ el.open=true; el.scrollIntoView({behavior:'smooth'}); }
}

/* ── checkout ── */
const modal=document.getElementById('pricing-modal');
function openModal(){
  if (!design.reviewUrl){ toast('Pick your business (or paste a link) first'); openSection('sec-business'); return; }
  const scan=qrScanCheck(design);
  if (scan.level==='bad'){
    toast('Fix the QR contrast first — we won\'t sell you a sign that can\'t scan');
    return;
  }
  modal.classList.add('open');
}
document.getElementById('btn-buy').addEventListener('click', openModal);
document.getElementById('btn-buy-2').addEventListener('click', openModal);
document.getElementById('modal-close').addEventListener('click', ()=>modal.classList.remove('open'));
modal.addEventListener('click', e=>{ if(e.target===modal) modal.classList.remove('open'); });

const TIER_LABELS={digital:'Buy Digital — $19',print:'Buy Print pack — $39',engraved:'Order engraved — $79'};
document.querySelectorAll('.checkout-btn').forEach(btn=>{
  btn.addEventListener('click', async ()=>{
    const tier=btn.dataset.tier;
    btn.disabled=true; btn.textContent='One moment…';
    // Persist the design for the success page (and same-device recovery)
    try {
      sessionStorage.setItem('qrSignDesign', JSON.stringify(design));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(design));
    } catch(e){}
    try{
      const res=await fetch('/api/create-checkout-session',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ tier, businessName:design.businessName, placeId:placeMeta.placeId }),
      });
      const data=await res.json();
      if (data.url) window.location.href=data.url;
      else throw new Error(data.error||'no url');
    }catch(err){
      btn.disabled=false; btn.textContent=TIER_LABELS[tier]||'Try again';
      toast('Checkout is not available right now — your design is saved, try again shortly');
    }
  });
});

/* ── init ── */
function syncControlsFromDesign(){
  // bg type
  document.querySelectorAll('#bg-type-row .seg-btn').forEach(b=>b.classList.toggle('active', b.dataset.bgtype===design.bgType));
  syncBgRows();
  document.getElementById('bg-color').value=design.bgColor;
  document.getElementById('bg-color2').value=design.bgColor2;
  document.getElementById('bg-angle').value=design.bgAngle;
  document.getElementById('bg-angle-out').textContent=design.bgAngle+'°';
  // text colour mode
  const custom=design.textColor && design.textColor!=='auto';
  document.getElementById('text-auto-btn').classList.toggle('active',!custom);
  document.getElementById('text-custom-btn').classList.toggle('active',custom);
  document.getElementById('text-color-row').style.display=custom?'':'none';
  if (custom) document.getElementById('text-color').value=design.textColor;
  document.getElementById('star-color').value=design.starColor;
  // qr
  document.querySelectorAll('#qr-style-row .seg-btn').forEach(b=>b.classList.toggle('active', b.dataset.qrstyle===design.qrStyle));
  document.querySelectorAll('#qr-eye-row .seg-btn').forEach(b=>b.classList.toggle('active', b.dataset.qreye===design.qrEyeStyle));
  document.getElementById('qr-color').value=design.qrColor;
  const pt=document.getElementById('qr-panel-toggle');
  pt.textContent=design.qrPanel?'On':'Off';
  pt.classList.toggle('el-off', !design.qrPanel);
  document.getElementById('qr-panel-color-row').style.display=design.qrPanel?'':'none';
  document.getElementById('qr-panel-color').value=design.qrPanelColor;
  document.getElementById('qr-scale').value=design.qrScale;
  document.getElementById('qr-scale-out').textContent=Math.round(design.qrScale*100)+'%';
  // wording
  document.querySelectorAll('#cta-presets .chip').forEach(b=>b.classList.toggle('active', b.dataset.cta===design.ctaText));
  document.getElementById('in-instruction').value=design.instructionText==='Point your phone camera at the code'?'':design.instructionText;
  headingSel.value=design.headingFont;
  bodySel.value=design.bodyFont;
  // biz + socials
  document.getElementById('in-bizname').value=design.businessName||'';
  document.getElementById('in-instagram').value=design.instagram||'';
  document.getElementById('in-facebook').value=design.facebook||'';
  document.getElementById('social-pad').value=design.socialPad;
  document.getElementById('social-pad-out').textContent=design.socialPad;
  // shape
  document.querySelectorAll('.shape-cell').forEach(c=>c.classList.toggle('active', c.dataset.shape===design.shape));
  // templates
  document.querySelectorAll('.tpl-chip').forEach(c=>c.classList.toggle('active', c.dataset.tpl===design.template));
  // element toggles
  document.querySelectorAll('#element-toggles .el-toggle').forEach(b=>{
    const key=b.dataset.el;
    b.textContent=design.visible[key]?'Hide':'Show';
    b.classList.toggle('el-off', !design.visible[key]);
  });
  if (design.reviewUrl) showSelectedBiz(design.businessName||'Saved link', design.reviewUrl);
}

(async function init(){
  // ?template= from the landing gallery
  const params=new URLSearchParams(location.search);
  const tplParam=params.get('template');
  if (tplParam && TEMPLATES.some(t=>t.id===tplParam)){
    design=applyTemplate(design, tplParam);
  }
  // Prefill support: /design.html?url=…&name=… (marketing links, demos, tests)
  const urlParam=params.get('url');
  if (urlParam && /^https?:\/\//i.test(urlParam)) design.reviewUrl=urlParam;
  const nameParam=params.get('name');
  if (nameParam) design.businessName=nameParam.slice(0,48);
  if (!design.layout) design.layout=getDefaultLayout(design.shape);

  try {
    await Promise.all([
      document.fonts.load(`bold 36px '${design.headingFont}'`),
      document.fonts.load(`400 14px '${design.bodyFont}'`),
      document.fonts.load("bold 26px Inter"),
    ]);
  } catch(e){}

  syncControlsFromDesign();
  updateToolbar();
  paint();

  // Re-render template thumbs once fonts are in
  document.querySelectorAll('.tpl-chip').forEach(chip=>{
    const tpl=TEMPLATES.find(t=>t.id===chip.dataset.tpl);
    const td=applyTemplate(defaultDesign(), tpl.id);
    td.businessName=tpl.name; td.reviewUrl='https://example.com/demo';
    renderSign(chip.querySelector('canvas'), td, { scale: 0.5 });
  });
})();
