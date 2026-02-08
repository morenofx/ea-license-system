import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { product, customer_name, customer_email, account_number } = req.body;

  if (!product || !customer_name || !customer_email || !account_number) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Get prices from settings
    const { data: settings } = await supabase
      .from('settings')
      .select('*')
      .eq('key', 'prices')
      .single();

    let price = 499; // default
    if (settings && settings.value) {
      const prices = JSON.parse(settings.value);
      if (product === 'XAU_AutoTrader') {
        price = prices.price_xau || 499;
      } else if (product === 'BTC_AutoTrader') {
        price = prices.price_btc || 499;
      }
    }

    // Create Stripe Checkout Session
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: product.replace('_', ' ') + ' - Lifetime License',
              description: `License for MT4/MT5 Account: ${account_number}`,
            },
            unit_amount: price * 100, // Stripe uses cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/buy.html?success=true&product=${encodeURIComponent(product)}&account=${encodeURIComponent(account_number)}`,
      cancel_url: `${baseUrl}/buy.html?canceled=true`,
      customer_email: customer_email,
      metadata: {
        product: product,
        customer_name: customer_name,
        account_number: account_number,
      },
    });

    return res.status(200).json({ url: session.url });

  } catch (err) {
    console.error('Checkout error:', err);
    return res.status(500).json({ error: err.message || 'Checkout failed' });
  }
}
