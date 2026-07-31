# ReviewSign — product & positioning

*Brainstorm written 2026-08-01 during the rebuild. This is the thinking behind what got built.*

## What it is

A browser-based designer that turns any business's Google Reviews link into a
sign customers actually scan — sold as a digital download, a print-ready pack,
or (uniquely) a laser-engraved acrylic sign shipped from the EtchWonders
workshop.

## Who buys it

Cafés, salons, trades, clinics, market stallholders — anyone whose Google
rating drives local search ranking. They know they need more reviews; asking
verbally is awkward; a counter sign does the asking for them. Buyer is
time-poor, non-technical, on a phone or shop laptop.

## Main selling points

### 1. Try the whole product before paying (functionality)
- The designer is 100% usable pre-purchase: full customisation, live preview,
  **free watermarked PNG download**. You can print the watermarked one and
  test it on your counter tonight. Payment removes the watermark and unlocks
  print/engrave formats.
- No signup, no email gate, no trial timer. Friction kills tools like this.
- Works with a pasted Google review link even if business search is down —
  the tool never dead-ends.

### 2. Designer QR codes that still scan (aesthetic + trust)
- QR styling (rounded modules, dots, custom colours, coloured eyes) is drawn
  from the raw QR matrix — not a filter over an image — so styling never
  corrupts the code.
- Live **scannability guard**: contrast is checked as you design; the app
  warns before it lets you export a QR a phone can't read.
- High error correction so the sign survives glare, laminate and distance.

### 3. Real templates, not a blank canvas (aesthetic)
- ~10 opinionated templates (café chalkboard, gold-on-black salon, fresh
  clinic, bold tradie, minimal counter card…) that look finished in one click.
- Every template remains fully editable: shape, palette, gradient, font
  pairing, wording, layout drag-and-drop, element show/hide.
- Templates are the marketing: each one is a screenshot-able ad.

### 4. From pixels to physical (the moat)
- Everyone else sells a PDF. EtchWonders owns a laser: the **engraved acrylic
  tier** ships the actual sign, designed by the customer themselves. The
  design file is already the cut/engrave file. No software competitor can
  follow without buying a laser.
- Tiers ladder naturally: $19 digital → $39 print pack → $79 engraved sign.

### 5. Honest local pricing
- AUD, GST-inclusive, one-time purchase — not a subscription for a static
  sign. "Own it forever" is a selling point against SaaS-ified competitors.

## Pricing (AUD, GST-inc, per runbook sa02/sa04)

| Tier | Price | Delivers |
|---|---|---|
| Digital | $19 | Clean high-res PNG (screen + home printing) |
| Print pack | $39 | 300-DPI PNG set sized A5/A4/5×7 + PDF, bleed-safe |
| Engraved acrylic | $79 | 150×100 mm engraved acrylic sign on stand, posted (5 business days) |

## Deliberate non-features
- No accounts/saved designs server-side (v1) — sessionStorage is enough.
- No subscription. One-time only.
- No AI-generated review responses etc. — stay a sharp single-purpose tool.

## Where it funnels
Lives at reviewsign.etchwonders.com (runbook sa03) and feeds the EtchWonders
/tools SEO strategy (sa14). Cafe signage variants (wifi/hours, sa13) reuse
this designer later — the code keeps sign "kind" pluggable.

## Marketing thoughts (also pushed to TRMNL)
- Walk-in sales with a pre-made sign for 10 local cafés (sa05) — the free
  preview makes pre-making samples free.
- Each template gets its own OG image + landing anchor for Pinterest/IG.
- SEO: "google review qr code sign", "review sign for cafe", "qr sticker
  reviews" — the free tool is the ranking asset.
- Comparison content vs. Etsy PDF sellers: theirs is static, this one is
  self-designed + engraved option.
