import Stripe from 'stripe';

export async function onRequestPost(context) {
  const { request, env } = context;
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
    return new Response(JSON.stringify({ error: 'Invalid tier' }), {
      status: 400,
      headers: { 'content-type': 'application/json' }
    });
  }

  try {
    const stripe = new Stripe(env.STRIPE_SECRET_KEY);
    const baseUrl = env.BASE_URL || new URL(request.url).origin;

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

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { 'content-type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
}
