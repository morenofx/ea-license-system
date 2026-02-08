import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('key', 'prices')
      .single();

    if (error || !data) {
      // Return defaults
      return res.status(200).json({
        price_xau: 499,
        price_btc: 499
      });
    }

    const prices = JSON.parse(data.value);
    return res.status(200).json(prices);

  } catch (err) {
    console.error(err);
    return res.status(200).json({
      price_xau: 499,
      price_btc: 499
    });
  }
}
