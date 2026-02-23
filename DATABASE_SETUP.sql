-- ============================================
-- EA BUSINESS DASHBOARD - Database Setup
-- Esegui questo script in Supabase SQL Editor
-- ============================================

-- SE HAI GIÀ LA TABELLA SALES, esegui prima questo per aggiungere 'free':
-- ALTER TABLE sales DROP CONSTRAINT sales_source_check;
-- ALTER TABLE sales ADD CONSTRAINT sales_source_check CHECK (source IN ('market', 'private', 'free'));

-- Tabella SALES (vendite Market + Private + Free)
CREATE TABLE IF NOT EXISTS sales (
  id SERIAL PRIMARY KEY,
  sale_date DATE NOT NULL,
  ea_product VARCHAR(50) NOT NULL,
  source VARCHAR(20) NOT NULL CHECK (source IN ('market', 'private', 'free')),
  amount_usd DECIMAL(10,2) NOT NULL,
  exchange_rate DECIMAL(10,6) NOT NULL,
  amount_eur_gross DECIMAL(10,2) NOT NULL,
  amount_eur_net DECIMAL(10,2) NOT NULL,
  client_name VARCHAR(100),
  account_number VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index per query veloci
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_source ON sales(source);
CREATE INDEX IF NOT EXISTS idx_sales_year ON sales(EXTRACT(YEAR FROM sale_date));

-- La tabella licenses esiste già, aggiungi queste colonne:
-- ALTER TABLE licenses ADD COLUMN license_type VARCHAR(20) DEFAULT 'paid';
-- ALTER TABLE licenses ADD COLUMN expires_at TIMESTAMP DEFAULT NULL;

-- Tabella ACTIVATION_CODES (per link attivazione usa-e-getta)
CREATE TABLE IF NOT EXISTS activation_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  product VARCHAR(50) NOT NULL,
  platform VARCHAR(10) DEFAULT 'MT5',
  license_type VARCHAR(20) NOT NULL,
  trial_days INTEGER DEFAULT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP DEFAULT NULL,
  used_by_account VARCHAR(50) DEFAULT NULL,
  used_by_name VARCHAR(100) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabella SETTINGS (per prezzi e configurazioni)
CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(50) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Inserisci prezzi di default
INSERT INTO settings (key, value) VALUES ('prices', '{"price_xau": 499, "price_btc": 499, "price_ghb": 499}')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- VERIFICA: Esegui questa query per controllare
-- ============================================
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
