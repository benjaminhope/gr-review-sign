import Stripe from 'stripe';

export async function onRequestGet(context) {
  const { request, env } = context;
  const id = new URL(request.url).searchParams.get('id');

  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing session id' }), {
      status: 400,
      headers: { 'content-type': 'application/json' }
    });
  }

  try {
    const stripe = new Stripe(env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(id);
    return new Response(JSON.stringify({
      paid: session.payment_status === 'paid',
      tier: session.metadata?.tier,
      businessName: session.metadata?.businessName
    }), {
      headers: { 'content-type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
}
