import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme123';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check admin password
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${ADMIN_PASSWORD}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // GET - List all licenses
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('licenses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.status(200).json({ licenses: data });
    }

    // POST - Add new license
    if (req.method === 'POST') {
      const { account_number, client_name, ea_product } = req.body;

      if (!account_number || !client_name || !ea_product) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Check if account already exists for this product
      const { data: existing } = await supabase
        .from('licenses')
        .select('*')
        .eq('account_number', account_number)
        .eq('ea_product', ea_product)
        .single();

      if (existing) {
        return res.status(400).json({ error: 'License already exists for this account' });
      }

      const { data, error } = await supabase
        .from('licenses')
        .insert([{ account_number, client_name, ea_product }])
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json({ success: true, license: data });
    }

    // DELETE - Remove license
    if (req.method === 'DELETE') {
      const { id } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Missing license ID' });
      }

      const { error } = await supabase
        .from('licenses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}
