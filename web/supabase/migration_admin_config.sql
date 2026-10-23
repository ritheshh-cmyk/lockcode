-- Migration: admin_config table for Supabase-backed admin authentication
-- Run this in Supabase SQL editor or via supabase db push

CREATE TABLE IF NOT EXISTS admin_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Seed the admin password (SHA-256 hash of "Lucky@1222")
-- To change: compute SHA-256 of new password and UPDATE this row.
INSERT INTO admin_config (key, value)
VALUES ('admin_password_hash', '4016f2f6da63d9d07f20197b69aacc1c4cc65fb489fae9a178605233b2e07035')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
