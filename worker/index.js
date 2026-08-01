import Stripe from 'stripe';

// AUD, GST-inclusive, one-time (runbook sa02/sa04). Amounts in cents.
const TIERS = {
  digital: {
    amount: 1900,
    name: 'Digital Download – Google Review QR Sign',
    description: 'High-resolution PNG of your exact design, no watermark. Instant download.',
  },
  print: {
    amount: 3900,
    name: 'Print Pack – Google Review QR Sign',
    description: '300 DPI files sized A5, A4 and 5×7″ plus the master PNG. Printer-ready.',
  },
  engraved: {
    amount: 7900,
    name: 'Engraved Acrylic Sign – Google Review QR',
    description: 'Your design laser-engraved on ~150×100mm acrylic with stand. Ships from Brisbane in 5 business days, AU postage included. Digital files included.',
    shipping: true,
  },
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // The SPA loads Google Places via this stub so the API key never ships in
    // the bundle and can rotate without a rebuild.
    if (url.pathname === '/api/places-script') {
      const key = env.GOOGLE_PLACES_API_KEY || '';
      const body = key
        ? `(function(){var s=document.createElement('script');s.src='https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&callback=initPlacesAPI';s.async=true;document.head.appendChild(s);})();`
        : `if(window.initPlacesAPI)try{window.initPlacesAPI()}catch(e){} /* no key configured */`;
      return new Response(body, { headers: { 'content-type': 'application/javascript' } });
    }

    // POST /api/create-checkout-session
    if (url.pathname === '/api/create-checkout-session' && request.method === 'POST') {
      let body;
      try { body = await request.json(); } catch { return json({ error: 'Bad request' }, 400); }
      const { tier, businessName, placeId } = body;

      const product = TIERS[tier];
      if (!product) return json({ error: 'Invalid tier' }, 400);
      if (!env.STRIPE_SECRET_KEY) return json({ error: 'Checkout not configured' }, 500);

      try {
        const stripe = new Stripe(env.STRIPE_SECRET_KEY);
        const baseUrl = env.BASE_URL || url.origin;

        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [{
            price_data: {
              currency: 'aud',
              product_data: { name: product.name, description: product.description },
              unit_amount: product.amount,
            },
            quantity: 1,
          }],
          mode: 'payment',
          // Physical tier needs a postal address for fulfilment
          ...(product.shipping ? {
            shipping_address_collection: { allowed_countries: ['AU'] },
            phone_number_collection: { enabled: true },
          } : {}),
          success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}&tier=${tier}`,
          cancel_url: `${baseUrl}/cancel`,
          metadata: {
            businessName: businessName || '',
            placeId: placeId || '',
            tier,
          },
        });

        return json({ url: session.url });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    // GET /api/verify-session
    if (url.pathname === '/api/verify-session' && request.method === 'GET') {
      const id = url.searchParams.get('id');
      if (!id) return json({ error: 'Missing session id' }, 400);
      if (!env.STRIPE_SECRET_KEY) return json({ error: 'Checkout not configured' }, 500);

      try {
        const stripe = new Stripe(env.STRIPE_SECRET_KEY);
        const session = await stripe.checkout.sessions.retrieve(id);
        return json({
          paid: session.payment_status === 'paid',
          tier: session.metadata?.tier,
          businessName: session.metadata?.businessName,
        });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    return env.ASSETS.fetch(request);
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
