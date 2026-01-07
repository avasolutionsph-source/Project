-- ============================================
-- FlyHighManarang - COMPLETE Schema Fix
-- Run this in Supabase SQL Editor
-- This fixes ALL sync errors including:
-- - Missing columns
-- - UUID type mismatches
-- - local_id columns
-- ============================================

-- ============================================
-- 1. DISPLAY TABLE - Fix product_id type and add columns
-- ============================================

-- First, drop any foreign key constraints on product_id if they exist
DO $$
BEGIN
  -- Try to drop constraint (ignore if doesn't exist)
  ALTER TABLE display DROP CONSTRAINT IF EXISTS display_product_id_fkey;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Change product_id to TEXT type to accept integer IDs from local DB
ALTER TABLE display ALTER COLUMN product_id TYPE TEXT USING product_id::TEXT;

-- Add missing columns
ALTER TABLE display ADD COLUMN IF NOT EXISTS local_id TEXT;
ALTER TABLE display ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE display ADD COLUMN IF NOT EXISTS original_pieces INTEGER DEFAULT 0;
ALTER TABLE display ADD COLUMN IF NOT EXISTS remaining_pieces INTEGER DEFAULT 0;
ALTER TABLE display ADD COLUMN IF NOT EXISTS original_kg DECIMAL(10,2) DEFAULT 0;
ALTER TABLE display ADD COLUMN IF NOT EXISTS remaining_kg DECIMAL(10,2) DEFAULT 0;
ALTER TABLE display ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE display ADD COLUMN IF NOT EXISTS display_date DATE;
ALTER TABLE display ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE display ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE display ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- 2. INVENTORY TABLE - Fix product_id type and add columns
-- ============================================

-- Drop any foreign key constraints
DO $$
BEGIN
  ALTER TABLE inventory DROP CONSTRAINT IF EXISTS inventory_product_id_fkey;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Change product_id to TEXT type
ALTER TABLE inventory ALTER COLUMN product_id TYPE TEXT USING product_id::TEXT;

-- Add missing columns
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS local_id TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 10;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS stock_sacks INTEGER DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS stock_kg DECIMAL(10,2) DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS stock_units INTEGER DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS low_stock BOOLEAN DEFAULT FALSE;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- 3. TRANSACTIONS TABLE - Add missing columns
-- ============================================

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS local_id TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS date TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS total DECIMAL(10,2) DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'Cash';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- 4. PRODUCTS TABLE - Ensure all columns exist
-- ============================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS local_id TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_per_sack DECIMAL(10,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_per_kg DECIMAL(10,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_per_box DECIMAL(10,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_per_piece DECIMAL(10,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS kg_per_sack DECIMAL(10,2) DEFAULT 25;
ALTER TABLE products ADD COLUMN IF NOT EXISTS pieces_per_box INTEGER DEFAULT 1;
ALTER TABLE products ADD COLUMN IF NOT EXISTS wholesale_price DECIMAL(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS wholesale_min INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE products ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- ============================================
-- 5. SETTINGS TABLE - Ensure columns exist
-- ============================================

ALTER TABLE settings ADD COLUMN IF NOT EXISTS local_id TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- 6. Create/Update triggers for updated_at
-- ============================================

-- Generic updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.version = COALESCE(OLD.version, 0) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables
DROP TRIGGER IF EXISTS display_updated_at ON display;
CREATE TRIGGER display_updated_at
  BEFORE UPDATE ON display
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS inventory_updated_at ON inventory;
CREATE TRIGGER inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS transactions_updated_at ON transactions;
CREATE TRIGGER transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS products_updated_at ON products;
CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS settings_updated_at ON settings;
CREATE TRIGGER settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. Add unique constraints for upsert conflict resolution
-- ============================================

-- Products: unique on store_id + local_id
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_store_local_unique') THEN
    ALTER TABLE products ADD CONSTRAINT products_store_local_unique UNIQUE (store_id, local_id);
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Inventory: unique on store_id + local_id
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_store_local_unique') THEN
    ALTER TABLE inventory ADD CONSTRAINT inventory_store_local_unique UNIQUE (store_id, local_id);
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Display: unique on store_id + local_id
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'display_store_local_unique') THEN
    ALTER TABLE display ADD CONSTRAINT display_store_local_unique UNIQUE (store_id, local_id);
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Settings: unique on store_id + local_id
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'settings_store_local_unique') THEN
    ALTER TABLE settings ADD CONSTRAINT settings_store_local_unique UNIQUE (store_id, local_id);
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ============================================
-- 8. Verify all columns exist
-- ============================================

SELECT '=== VERIFICATION ===' as status;

SELECT 'DISPLAY columns:' as table_info;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'display'
ORDER BY ordinal_position;

SELECT 'INVENTORY columns:' as table_info;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'inventory'
ORDER BY ordinal_position;

SELECT 'TRANSACTIONS columns:' as table_info;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'transactions'
ORDER BY ordinal_position;

SELECT 'PRODUCTS columns:' as table_info;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'products'
ORDER BY ordinal_position;

SELECT '=== ALL FIXES APPLIED SUCCESSFULLY ===' as status;
