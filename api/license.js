import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET request from EA: /api/license?account=123456&product=XAU_AutoTrader
  if (req.method === 'GET') {
    const { account, product } = req.query;

    if (!account || !product) {
      return res.status(400).json({ valid: false, error: 'Missing account or product' });
    }

    try {
      const { data, error } = await supabase
        .from('licenses')
        .select('*')
        .eq('account_number', account)
        .eq('ea_product', product)
        .single();

      if (error || !data) {
        return res.status(200).json({ valid: false });
      }

      return res.status(200).json({ 
        valid: true, 
        name: data.client_name 
      });

    } catch (err) {
      console.error(err);
      return res.status(500).json({ valid: false, error: 'Server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
