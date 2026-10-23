# Technical Design: User Token History & 10-Item Per-User Rotation

## 1. Data Model (`request_history`)

```sql
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

CREATE INDEX IF NOT EXISTS idx_request_history_user ON request_history(reg_key, created_at DESC);
```

## 2. Rotation Algorithm (Max 10 per user)

On every new request completed:
1. Insert the record into `request_history`.
2. Execute pruning query:
   ```typescript
   const { data: rows } = await supabaseAdmin
     .from("request_history")
     .select("id")
     .eq("reg_key", reg_key)
     .order("created_at", { ascending: false });

   if (rows && rows.length > 10) {
     const excessIds = rows.slice(10).map((r) => r.id);
     await supabaseAdmin.from("request_history").delete().in("id", excessIds);
   }
   ```
This guarantees strict memory bounds of $N \le 10$ records per user at all times.

## 3. Dedicated Page Architecture (`/history`)

- **Route:** `/history` (`lock/web/app/history/page.tsx`)
- **Key Features:**
  - 8-digit key lookup with persistent local session.
  - Overall stats: Total Tokens, Recent Requests, Average Latency, Model breakdown.
  - Chronological timeline of the last 10 requests.
  - Each item shows:
    - Mode badge (`code`, `mcq`, etc.).
    - Token metrics badge.
    - Timestamp & latency.
    - Full prompt sent drawer with copy action.
    - Full response received drawer with copy action.
