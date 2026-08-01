/* Shared renderer for industry landing pages.
   Page declares window.INDUSTRY = { templates: [{id, name}], demoName } and
   this paints the tiles with the real sign engine. */
(async function(){
  try { await Promise.all(['Inter','Fraunces','Montserrat','Playfair Display','Oswald','Lato','Dancing Script','Caveat']
    .map(f=>document.fonts.load(`bold 36px '${f}'`))); } catch(e){}

  const spec = window.INDUSTRY || { templates: [] };
  const grid = document.getElementById('ind-gallery');
  if (!grid) return;
  spec.templates.forEach(t=>{
    const tpl = TEMPLATES.find(x=>x.id===t.id);
    if (!tpl) return;
    const a = document.createElement('a');
    a.className='tpl-tile';
    a.href='/design.html?template='+tpl.id;
    a.innerHTML = `<div class="tpl-canvas-wrap"><canvas></canvas></div>
      <div class="tpl-name">${t.name||tpl.name}</div><div class="tpl-tag">${tpl.tag}</div>`;
    grid.appendChild(a);
    const d = applyTemplate(defaultDesign(), tpl.id);
    d.businessName = t.demoName || spec.demoName || 'Your Business';
    if (t.cta) d.ctaText = t.cta;
    d.reviewUrl = 'https://search.google.com/local/writereview?placeid=demo';
    d.layout = getDefaultLayout(d.shape);
    renderSign(a.querySelector('canvas'), d, { scale: 1 });
  });
})();
