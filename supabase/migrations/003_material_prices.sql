-- Materials price database
CREATE TABLE IF NOT EXISTS material_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  material TEXT NOT NULL,
  description TEXT,
  unit TEXT NOT NULL,
  price_kes DECIMAL(12,2) NOT NULL,
  price_usd DECIMAL(12,2) GENERATED ALWAYS AS (price_kes / 130.0) STORED,
  region TEXT NOT NULL DEFAULT 'mombasa',
  supplier TEXT,
  supplier_contact TEXT,
  in_stock BOOLEAN DEFAULT TRUE,
  last_verified TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price history for tracking fluctuations
CREATE TABLE IF NOT EXISTS material_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID REFERENCES material_prices(id) ON DELETE CASCADE,
  price_kes DECIMAL(12,2) NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  change_percent DECIMAL(6,2)
);

-- Price review flags for manual review
CREATE TABLE IF NOT EXISTS price_review_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID REFERENCES material_prices(id) ON DELETE CASCADE,
  suggested_price DECIMAL(12,2) NOT NULL,
  current_price DECIMAL(12,2) NOT NULL,
  change_percent DECIMAL(6,2) NOT NULL,
  reasoning TEXT,
  status TEXT DEFAULT 'pending_review',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_material_prices_category ON material_prices(category);
CREATE INDEX IF NOT EXISTS idx_material_prices_region ON material_prices(region);
CREATE INDEX IF NOT EXISTS idx_material_prices_material ON material_prices(material);
CREATE INDEX IF NOT EXISTS idx_price_history_material ON material_price_history(material_id);
CREATE INDEX IF NOT EXISTS idx_price_review_flags_status ON price_review_flags(status);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_material_prices_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER material_prices_updated
  BEFORE UPDATE ON material_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_material_prices_timestamp();

-- Auto-record price history on price change
CREATE OR REPLACE FUNCTION record_price_history()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.price_kes != NEW.price_kes THEN
    INSERT INTO material_price_history (
      material_id,
      price_kes,
      change_percent
    ) VALUES (
      NEW.id,
      NEW.price_kes,
      ROUND(((NEW.price_kes - OLD.price_kes) / OLD.price_kes) * 100, 2)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_price_changes
  AFTER UPDATE ON material_prices
  FOR EACH ROW
  EXECUTE FUNCTION record_price_history();

-- RLS Policies
ALTER TABLE material_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_review_flags ENABLE ROW LEVEL SECURITY;

-- Everyone can read prices
CREATE POLICY "Public read material prices"
  ON material_prices FOR SELECT
  USING (true);

-- Only service role can insert/update
CREATE POLICY "Service role manages prices"
  ON material_prices FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Public read price history"
  ON material_price_history FOR SELECT
  USING (true);

CREATE POLICY "Service role manages price history"
  ON material_price_history FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Public read price review flags"
  ON price_review_flags FOR SELECT
  USING (true);

CREATE POLICY "Service role manages price review flags"
  ON price_review_flags FOR ALL
  USING (auth.role() = 'service_role');
