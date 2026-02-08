import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export const config = {
  api: {
    bodyParser: false,
  },
};

async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    const { product, customer_name, account_number } = session.metadata;
    const customer_email = session.customer_email;
    const amount_eur = session.amount_total / 100;

    console.log('Payment completed:', { product, customer_name, account_number, amount_eur });

    try {
      // 1. Create license
      const { data: existingLic } = await supabase
        .from('licenses')
        .select('*')
        .eq('account_number', account_number)
        .eq('ea_product', product)
        .single();

      if (!existingLic) {
        await supabase
          .from('licenses')
          .insert([{
            account_number: account_number,
            client_name: customer_name,
            ea_product: product,
            license_type: 'paid'
          }]);
        console.log('License created for account:', account_number);
      } else {
        console.log('License already exists for account:', account_number);
      }

      // 2. Record sale
      // Get current EUR/USD rate (approximate, use 1 for private sales in EUR)
      const exchange_rate = 1.0; // Since we charge in EUR directly
      
      await supabase
        .from('sales')
        .insert([{
          sale_date: new Date().toISOString().split('T')[0],
          ea_product: product,
          source: 'private',
          amount_usd: amount_eur * exchange_rate, // Store as equivalent
          exchange_rate: exchange_rate,
          amount_eur_gross: amount_eur,
          amount_eur_net: amount_eur * 0.98, // ~2% Stripe fee
          client_name: customer_name,
          account_number: account_number,
          notes: `Stripe payment - ${customer_email}`
        }]);
      
      console.log('Sale recorded:', amount_eur, 'EUR');

    } catch (err) {
      console.error('Error processing payment:', err);
      // Don't return error - we received the payment, just log it
    }
  }

  return res.status(200).json({ received: true });
}
