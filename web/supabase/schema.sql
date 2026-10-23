-- ============================================================
-- LockApp License System — Supabase Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ============================================================

-- 1. Create the licenses table
CREATE TABLE IF NOT EXISTS licenses (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reg_key     TEXT UNIQUE NOT NULL,
    machine_id  TEXT,                           -- filled on first activation
    created_at  TIMESTAMPTZ DEFAULT now(),
    activated_at TIMESTAMPTZ,                   -- set when machine_id is first written
    expires_at  TIMESTAMPTZ NOT NULL,
    is_active   BOOLEAN DEFAULT true,
    label       TEXT                            -- admin note (e.g. customer name)
);

-- 2. Enable Row Level Security
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;

-- 3. Deny all public/anon access — only service_role can read/write
-- This policy allows full access ONLY to the service_role (used by our API)
CREATE POLICY "Service role full access"
    ON licenses
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- 4. Explicitly deny anon/authenticated users (belt and suspenders)
-- By enabling RLS with no matching policy for anon/authenticated,
-- those roles are already denied. But we add this comment for clarity.

-- 5. Create index on reg_key for fast lookups
CREATE INDEX IF NOT EXISTS idx_licenses_reg_key ON licenses (reg_key);

-- 6. Create index on machine_id for reverse lookups
CREATE INDEX IF NOT EXISTS idx_licenses_machine_id ON licenses (machine_id);
