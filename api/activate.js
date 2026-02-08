import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Generate random code
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET - Verify code (public, no auth)
  if (req.method === 'GET') {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({ error: 'Missing code' });
    }

    try {
      const { data, error } = await supabase
        .from('activation_codes')
        .select('*')
        .eq('code', code.toUpperCase())
        .single();

      if (error || !data) {
        return res.status(404).json({ error: 'Invalid code' });
      }

      if (data.used) {
        return res.status(400).json({ error: 'Code already used', used: true });
      }

      return res.status(200).json({
        product: data.product,
        platform: data.platform || 'MT5',
        license_type: data.license_type,
        trial_days: data.trial_days
      });

    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  // POST - Activate code (public, no auth)
  if (req.method === 'POST') {
    const { code, client_name, account_number } = req.body;

    if (!code || !client_name || !account_number) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      // Get code
      const { data: codeData, error: codeError } = await supabase
        .from('activation_codes')
        .select('*')
        .eq('code', code.toUpperCase())
        .single();

      if (codeError || !codeData) {
        return res.status(404).json({ error: 'Invalid code' });
      }

      if (codeData.used) {
        return res.status(400).json({ error: 'Code already used' });
      }

      // Check if license already exists for this account+product
      const { data: existingLicense } = await supabase
        .from('licenses')
        .select('*')
        .eq('account_number', account_number)
        .eq('ea_product', codeData.product)
        .single();

      if (existingLicense) {
        return res.status(400).json({ error: 'License already exists for this account' });
      }

      // Calculate expires_at for trial
      let expiresAt = null;
      if (codeData.license_type === 'trial' && codeData.trial_days) {
        const expires = new Date();
        expires.setDate(expires.getDate() + codeData.trial_days);
        expiresAt = expires.toISOString();
      }

      // Create license
      const { data: license, error: licenseError } = await supabase
        .from('licenses')
        .insert([{
          account_number: account_number,
          client_name: client_name,
          ea_product: codeData.product,
          license_type: codeData.license_type,
          expires_at: expiresAt
        }])
        .select()
        .single();

      if (licenseError) {
        throw licenseError;
      }

      // Mark code as used
      await supabase
        .from('activation_codes')
        .update({ 
          used: true, 
          used_at: new Date().toISOString(),
          used_by_account: account_number,
          used_by_name: client_name
        })
        .eq('id', codeData.id);

      return res.status(200).json({
        success: true,
        account_number: account_number,
        expires_at: expiresAt,
        product: codeData.product,
        platform: codeData.platform || 'MT5'
      });

    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Activation failed' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
