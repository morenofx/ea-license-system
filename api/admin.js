import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme123';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check admin password
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${ADMIN_PASSWORD}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { type } = req.query; // 'licenses' or 'sales'

  try {
    // ==================== LICENSES ====================
    if (type === 'licenses' || !type) {
      
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
        const { account_number, client_name, ea_product, license_type } = req.body;

        if (!account_number || !client_name || !ea_product) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if already exists
        const { data: existing } = await supabase
          .from('licenses')
          .select('*')
          .eq('account_number', account_number)
          .eq('ea_product', ea_product)
          .single();

        if (existing) {
          return res.status(400).json({ error: 'License already exists' });
        }

        const { data, error } = await supabase
          .from('licenses')
          .insert([{ account_number, client_name, ea_product, license_type: license_type || 'paid' }])
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
    }

    // ==================== SALES ====================
    if (type === 'sales') {
      
      // GET - List all sales (with optional year filter)
      if (req.method === 'GET') {
        const { year } = req.query;
        
        let query = supabase
          .from('sales')
          .select('*')
          .order('sale_date', { ascending: false });
        
        if (year) {
          query = query
            .gte('sale_date', `${year}-01-01`)
            .lte('sale_date', `${year}-12-31`);
        }

        const { data, error } = await query;

        if (error) throw error;
        return res.status(200).json({ sales: data });
      }

      // POST - Add new sale
      if (req.method === 'POST') {
        const { 
          sale_date, 
          ea_product, 
          source, 
          sale_type,
          amount_usd, 
          exchange_rate,
          client_name,
          account_number,
          notes,
          create_license  // boolean: auto-create license for private/free sales
        } = req.body;

        // Free requires only date, product, source + client info
        const isFree = (source === 'free');
        
        if (!sale_date || !ea_product || !source) {
          return res.status(400).json({ error: 'Missing required fields' });
        }
        
        if (!isFree && (!amount_usd || !exchange_rate)) {
          return res.status(400).json({ error: 'Missing amount or exchange rate' });
        }
        
        if (isFree && (!client_name || !account_number)) {
          return res.status(400).json({ error: 'Free gifts require client name and account' });
        }

        // Calculate EUR amounts (0 for free)
        const amountUSD = isFree ? 0 : parseFloat(amount_usd);
        const rate = parseFloat(exchange_rate) || 1;
        const amount_eur_gross = amountUSD / rate;
        const amount_eur_net = amount_eur_gross * 0.80; // 20% MQL5 commission

        const saleData = {
          sale_date,
          ea_product,
          source,
          sale_type: sale_type || 'purchase',
          amount_usd: amountUSD,
          exchange_rate: rate,
          amount_eur_gross: Math.round(amount_eur_gross * 100) / 100,
          amount_eur_net: Math.round(amount_eur_net * 100) / 100,
          client_name: client_name || null,
          account_number: account_number || null,
          notes: notes || null
        };

        const { data, error } = await supabase
          .from('sales')
          .insert([saleData])
          .select()
          .single();

        if (error) throw error;

        // Auto-create license for private/free sales
        let licenseCreated = false;
        const shouldCreateLicense = (source === 'private' || source === 'free') && 
                                     (create_license || source === 'free') && // Free always creates license
                                     account_number && client_name;
          if (shouldCreateLicense) {
          // Check if license already exists
          const { data: existingLic } = await supabase
            .from('licenses')
            .select('*')
            .eq('account_number', account_number)
            .eq('ea_product', ea_product)
            .single();

          if (!existingLic) {
            const licenseType = source === 'free' ? 'free' : 'paid';
            await supabase
              .from('licenses')
              .insert([{ account_number, client_name, ea_product, license_type: licenseType }]);
            licenseCreated = true;
          }
        }

        return res.status(201).json({ 
          success: true, 
          sale: data,
          licenseCreated 
        });
      }

      // DELETE - Remove sale
      if (req.method === 'DELETE') {
        const { id } = req.body;

        if (!id) {
          return res.status(400).json({ error: 'Missing sale ID' });
        }

        const { error } = await supabase
          .from('sales')
          .delete()
          .eq('id', id);

        if (error) throw error;
        return res.status(200).json({ success: true });
      }

      // PUT - Edit existing sale
      if (req.method === 'PUT') {
        const { id, sale_date, ea_product, source, sale_type, amount_usd, exchange_rate, notes, client_name, account_number } = req.body;

        if (!id) {
          return res.status(400).json({ error: 'Missing sale ID' });
        }

        const amountUSD = parseFloat(amount_usd) || 0;
        const rate = parseFloat(exchange_rate) || 1;
        const amount_eur_gross = amountUSD / rate;
        const amount_eur_net = amount_eur_gross * 0.80;

        const updateData = {};
        if (sale_date) updateData.sale_date = sale_date;
        if (ea_product) updateData.ea_product = ea_product;
        if (source) updateData.source = source;
        if (sale_type) updateData.sale_type = sale_type;
        if (amount_usd !== undefined) {
          updateData.amount_usd = amountUSD;
          updateData.exchange_rate = rate;
          updateData.amount_eur_gross = Math.round(amount_eur_gross * 100) / 100;
          updateData.amount_eur_net = Math.round(amount_eur_net * 100) / 100;
        }
        if (exchange_rate !== undefined && amount_usd !== undefined) {
          updateData.exchange_rate = rate;
          updateData.amount_eur_gross = Math.round(amount_eur_gross * 100) / 100;
          updateData.amount_eur_net = Math.round(amount_eur_net * 100) / 100;
        }
        if (notes !== undefined) updateData.notes = notes;
        if (client_name !== undefined) updateData.client_name = client_name;
        if (account_number !== undefined) updateData.account_number = account_number;

        const { data, error } = await supabase
          .from('sales')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return res.status(200).json({ success: true, sale: data });
      }
    }

    // ==================== ETSY SALES ====================
    if (type === 'etsy') {
      
      // GET - List Etsy sales (with optional year filter)
      if (req.method === 'GET') {
        const { year } = req.query;
        
        let query = supabase
          .from('etsy_sales')
          .select('*')
          .order('sale_date', { ascending: false });
        
        if (year) {
          query = query
            .gte('sale_date', `${year}-01-01`)
            .lte('sale_date', `${year}-12-31`);
        }

        const { data, error } = await query;
        if (error) throw error;
        return res.status(200).json({ sales: data });
      }

      // POST - Add new Etsy sale
      if (req.method === 'POST') {
        const { sale_date, product_name, quantity, sale_price_eur, etsy_fees_eur, printify_cost_usd, exchange_rate, client_name, notes } = req.body;

        if (!sale_date || !product_name || !sale_price_eur) {
          return res.status(400).json({ error: 'Missing required fields (date, product, price)' });
        }

        const saleData = {
          sale_date,
          product_name,
          quantity: quantity || 1,
          sale_price_eur: parseFloat(sale_price_eur),
          etsy_fees_eur: parseFloat(etsy_fees_eur) || 0,
          printify_cost_usd: parseFloat(printify_cost_usd) || 0,
          exchange_rate: parseFloat(exchange_rate) || 1,
          client_name: client_name || null,
          notes: notes || null
        };

        const { data, error } = await supabase
          .from('etsy_sales')
          .insert([saleData])
          .select()
          .single();

        if (error) throw error;
        return res.status(201).json({ success: true, sale: data });
      }

      // DELETE - Remove Etsy sale
      if (req.method === 'DELETE') {
        const { id } = req.body;
        if (!id) return res.status(400).json({ error: 'Missing sale ID' });

        const { error } = await supabase
          .from('etsy_sales')
          .delete()
          .eq('id', id);

        if (error) throw error;
        return res.status(200).json({ success: true });
      }
    }

    // ==================== EXPORT ====================
    if (type === 'export') {
      if (req.method === 'GET') {
        const { year } = req.query;
        
        // Get licenses
        const { data: licenses } = await supabase
          .from('licenses')
          .select('*')
          .order('created_at', { ascending: false });

        // Get sales
        let salesQuery = supabase
          .from('sales')
          .select('*')
          .order('sale_date', { ascending: false });
        
        if (year) {
          salesQuery = salesQuery
            .gte('sale_date', `${year}-01-01`)
            .lte('sale_date', `${year}-12-31`);
        }

        const { data: sales } = await salesQuery;

        // Get Etsy sales
        let etsyQuery = supabase
          .from('etsy_sales')
          .select('*')
          .order('sale_date', { ascending: false });
        
        if (year) {
          etsyQuery = etsyQuery
            .gte('sale_date', `${year}-01-01`)
            .lte('sale_date', `${year}-12-31`);
        }

        const { data: etsySales } = await etsyQuery;

        return res.status(200).json({
          exportDate: new Date().toISOString(),
          year: year || 'all',
          licenses: licenses || [],
          sales: sales || [],
          etsySales: etsySales || []
        });
      }
    }

    // ==================== SETTINGS ====================
    if (type === 'settings') {
      // GET - Load settings
      if (req.method === 'GET') {
        const { data, error } = await supabase
          .from('settings')
          .select('*')
          .eq('key', 'prices')
          .single();

        if (error || !data) {
          return res.status(200).json({ settings: { price_xau: 499, price_btc: 499 } });
        }

        return res.status(200).json({ settings: JSON.parse(data.value) });
      }

      // POST - Save settings
      if (req.method === 'POST') {
        const { price_xau, price_btc } = req.body;

        const value = JSON.stringify({
          price_xau: price_xau || 499,
          price_btc: price_btc || 499
        });

        // Upsert settings
        const { error } = await supabase
          .from('settings')
          .upsert({ key: 'prices', value: value }, { onConflict: 'key' });

        if (error) throw error;
        return res.status(200).json({ success: true });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
}
