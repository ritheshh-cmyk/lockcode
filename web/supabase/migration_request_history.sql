-- ============================================================
-- Request History & Token Tracking Table
-- Stores prompts and responses with 10-row auto-rotation per user
-- ============================================================

CREATE TABLE IF NOT EXISTS request_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reg_key TEXT NOT NULL,
    mode TEXT DEFAULT 'code',
    prompt TEXT NOT NULL,
    response TEXT,
    provider TEXT,
    model TEXT,
    tokens_prompt INT DEFAULT 0,
    tokens_completion INT DEFAULT 0,
    tokens_total INT DEFAULT 0,
    latency_ms INT DEFAULT 0,
    status TEXT DEFAULT 'success',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for rapid per-user lookups and chronological ordering
CREATE INDEX IF NOT EXISTS idx_request_history_reg_key ON request_history(reg_key, created_at DESC);

-- Enable RLS
ALTER TABLE request_history ENABLE ROW LEVEL SECURITY;

-- Allow service_role full access
CREATE POLICY "Service role full access on request_history"
    ON request_history
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
