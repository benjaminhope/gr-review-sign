// Template gallery tiles painted by the real render engine — the marketing
// can't drift from the product.
import { Link } from 'react-router-dom';
import { TEMPLATES, applyTemplate, defaultDesign, getDefaultLayout } from '../lib/render-core';
import SignCanvas from './SignCanvas';

const DEMO_URL = 'https://search.google.com/local/writereview?placeid=demo';

export const DEMO_NAMES: Record<string, string> = {
  classic: 'Harvest Lane Deli', chalk: 'Marigold Espresso', goldblack: 'Velvet & Co. Hair',
  mint: 'Riverside Physio', trade: 'Brightline Electrical', blush: 'Petal Beauty Bar',
  ocean: 'Anchor Dental', timber: 'The Woodshed Cafe', midnight: 'Studio North', pop: 'Scoop! Gelato',
  smile: 'Sunny Deli', thumbsup: 'Corner Store Cafe', scanhere: 'Fix-It Plumbing',
  minimal: 'Studio M', bigqr: 'Quick Cuts Barber', goldarch: 'The Grand Salon',
  copperround: 'Copper & Oak Bar', bluecircle: 'City Dental', redpin: 'Pronto Pizza',
  homehouse: 'Hearth Realty', noirspeech: 'Noir Wine Bar', sunny: 'Sunny Side Brunch',
  euroline: 'Maison Beauté', aluminium: 'Torque Auto', rosecircle: 'Rose Lane Bridal',
  greentick: 'Greengrocer Co.', navypro: 'Harbour Legal', redalert: 'Blaze BBQ',
  silverarch: 'Bright Smiles Dental', happyhour: 'The Local Taphouse', scriptwhite: 'Willow & Thread',
  thumbgold: 'Prestige Detailing', smilewhite: 'Happy Days Cafe', arrowgold: 'Luxe Nail Studio',
};

export function demoDesign(tplId: string, name?: string, cta?: string) {
  const d = applyTemplate(defaultDesign(), tplId);
  d.businessName = name ?? DEMO_NAMES[tplId] ?? 'Your Business';
  if (cta) d.ctaText = cta;
  d.reviewUrl = DEMO_URL;
  d.layout = getDefaultLayout(d.shape);
  return d;
}

interface Item { id: string; name?: string; cta?: string }

export default function TemplateGallery({ items }: { items?: Item[] }) {
  const list: Item[] = items ?? TEMPLATES.map((t) => ({ id: t.id }));
  return (
    <div className="tpl-gallery">
      {list.map((item) => {
        const tpl = TEMPLATES.find((t) => t.id === item.id);
        if (!tpl) return null;
        return (
          <Link key={tpl.id} className="tpl-tile" to={`/design?template=${tpl.id}`}>
            <div className="tpl-canvas-wrap">
              <SignCanvas design={demoDesign(tpl.id, item.name, item.cta)} scale={1} />
            </div>
            <div className="tpl-name">{item.name ?? tpl.name}</div>
            <div className="tpl-tag">{tpl.tag}</div>
          </Link>
        );
      })}
    </div>
  );
}
