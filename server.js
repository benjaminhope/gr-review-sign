require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const PORT = process.env.PORT || 3000;

// Serve index.html with Google API key injected
app.get('/', (req, res) => {
  const html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
  const injected = html.replace('{{GOOGLE_API_KEY}}', process.env.GOOGLE_PLACES_API_KEY || '');
  res.send(injected);
});

// Static files (css, js, images)
app.use(express.static(path.join(__dirname, 'public')));

// Create Stripe checkout session
app.post('/api/create-checkout-session', async (req, res) => {
  const { tier, businessName, placeId } = req.body;

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
  if (!product) return res.status(400).json({ error: 'Invalid tier' });

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: product.name,
            description: product.description
          },
          unit_amount: product.amount
        },
        quantity: 1
      }],
      mode: 'payment',
      success_url: `${BASE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}&tier=${tier}`,
      cancel_url: `${BASE_URL}/cancel.html`,
      metadata: { businessName, placeId, tier }
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Verify payment session (called by success page)
app.get('/api/verify-session', async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing session id' });

  try {
    const session = await stripe.checkout.sessions.retrieve(id);
    res.json({
      paid: session.payment_status === 'paid',
      tier: session.metadata?.tier,
      businessName: session.metadata?.businessName
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n🎉 QR Review Sign Builder running at http://localhost:${PORT}`);
  console.log('   Copy .env.example to .env and add your API keys to get started.\n');
});
