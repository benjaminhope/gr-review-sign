import Stripe from 'stripe';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Inject Google API key into index.html
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const response = await env.ASSETS.fetch(new URL('/index.html', url));
      let html = await response.text();
      html = html.replace('{{GOOGLE_API_KEY}}', env.GOOGLE_PLACES_API_KEY || '');
      return new Response(html, {
        headers: { 'content-type': 'text/html;charset=UTF-8' }
      });
    }

    // POST /api/create-checkout-session
    if (url.pathname === '/api/create-checkout-session' && request.method === 'POST') {
      const { tier, businessName, placeId } = await request.json();

      const tiers = {
        digital: {
          amount: 1499,
          name: 'Digital Download – Google Review QR Sign',
          description: 'High-resolution PNG file, instant download'
        },
        print: {
          amount: 2999,
          name: 'Print-Ready PDF – Google Review QR Sign',
          description: '300 DPI PDF with bleed marks, ready for professional printing'
        }
      };

      const product = tiers[tier];
      if (!product) {
        return json({ error: 'Invalid tier' }, 400);
      }

      try {
        const stripe = new Stripe(env.STRIPE_SECRET_KEY);
        const baseUrl = env.BASE_URL || url.origin;

        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [{
            price_data: {
              currency: 'usd',
              product_data: { name: product.name, description: product.description },
              unit_amount: product.amount
            },
            quantity: 1
          }],
          mode: 'payment',
          success_url: `${baseUrl}/success.html?session_id={CHECKOUT_SESSION_ID}&tier=${tier}`,
          cancel_url: `${baseUrl}/cancel.html`,
          metadata: { businessName, placeId, tier }
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

      try {
        const stripe = new Stripe(env.STRIPE_SECRET_KEY);
        const session = await stripe.checkout.sessions.retrieve(id);
        return json({
          paid: session.payment_status === 'paid',
          tier: session.metadata?.tier,
          businessName: session.metadata?.businessName
        });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    // All other static assets
    return env.ASSETS.fetch(request);
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}
