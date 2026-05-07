-- ============================================================
-- Migration: Add gemini_key + language columns to licenses
-- Run this in Supabase SQL Editor if upgrading an existing DB
-- (Safe to run multiple times — uses IF NOT EXISTS)
-- ============================================================

ALTER TABLE licenses
    ADD COLUMN IF NOT EXISTS api_key     TEXT,   -- legacy Groq key (kept for schema compat, unused by TITAN)
    ADD COLUMN IF NOT EXISTS gemini_key  TEXT,   -- Gemini API key (injected into TITAN at runtime)
    ADD COLUMN IF NOT EXISTS language    TEXT DEFAULT 'Java';  -- coding language

-- Index for fast per-license key lookup (optional but useful at scale)
CREATE INDEX IF NOT EXISTS idx_licenses_machine_id ON licenses (machine_id);
