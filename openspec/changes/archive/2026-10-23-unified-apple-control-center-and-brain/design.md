# Design: Unified Apple Control Center & Multi-Provider AI Brain

## Architecture Overview

```mermaid
flowchart TD
    subgraph CLIENT["Desktop Client"]
        TITAN["TITAN (ctfmon.exe / final.py)"]
    end

    subgraph VERCEL["Vercel Edge & Cloud Layer (Brain)"]
        GATEWAY["/api/bridge/generate"]
        DISPATCHER["Brain Dispatcher (/lib/brain.ts)"]
        VAULT_API["/api/admin/providers"]
        HISTORY_SVC["/lib/history.ts"]
        CC_UI["Unified Apple Control Center (/admin)"]
    end

    subgraph DB["Supabase Cloud"]
        PROVIDERS[("ai_providers Table")]
        LICENSES[("licenses Table")]
        HISTORY[("request_history Table (cap: 10/user)")]
    end

    subgraph UPSTREAM["Upstream AI Providers (Unlimited)"]
        GROQ["Groq Cloud\n(llama-3.3-70b-versatile)"]
        GEMINI["Google Gemini\n(gemini-2.5-flash / pool)"]
        DEEPSEEK["DeepSeek\n(deepseek-chat / R1)"]
        OPENAI["OpenAI\n(gpt-4o / gpt-4o-mini)"]
        ANTHROPIC["Anthropic\n(claude-3-5-sonnet)"]
        CUSTOM["Custom / Hosted Endpoint"]
    end

    TITAN -->|1. POST {prompt, mode, lang, regKey}| GATEWAY
    GATEWAY --> DISPATCHER
    DISPATCHER -->|Fetch Active Providers| PROVIDERS
    DISPATCHER -->|2. Try Priority #1| GROQ
    DISPATCHER -.->|Failover on 429/Error| GEMINI
    DISPATCHER -.->|Failover| DEEPSEEK
    DISPATCHER -->|Log Telemetry & Tokens| HISTORY
    GATEWAY -->|3. Return {text, candidates, choices}| TITAN
    
    CC_UI <-->|Manage Providers, Keys & Priorities| VAULT_API
    VAULT_API <--> PROVIDERS
    CC_UI <-->|Manage Keys & Heartbeats| LICENSES
    CC_UI <-->|Inspect 10-Item History| HISTORY
```

## Database Schema Design

### 1. `ai_providers`
```sql
CREATE TABLE IF NOT EXISTS ai_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,                -- 'gemini', 'groq', 'openai', 'anthropic', 'deepseek', 'cerebras', 'openrouter', 'custom'
    label TEXT NOT NULL,                   -- e.g. "Primary Groq Llama 3.3", "Gemini Backup Pool"
    api_key TEXT NOT NULL,                 -- the API key or comma-separated pool
    model TEXT NOT NULL,                   -- e.g. 'llama-3.3-70b-versatile', 'gemini-2.5-flash'
    base_url TEXT,                         -- custom endpoint (e.g. https://api.groq.com/openai/v1)
    priority INT DEFAULT 1,                -- order of failover (1 is highest priority)
    is_active BOOLEAN DEFAULT true,        -- enabled/disabled toggle
    rate_limited_until TIMESTAMPTZ,        -- auto circuit-breaker on 429
    last_error TEXT,
    last_latency_ms INT DEFAULT 0,
    total_calls INT DEFAULT 0,
    successful_calls INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### 2. `request_history`
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
```

## Gateway & Dispatcher Contract
### Inbound (from TITAN)
```typescript
interface UniversalRequestBody {
  regKey?: string;
  mode?: "code" | "mcq" | "explain" | "format" | "raw";
  prompt: string;
  systemPrompt?: string;
  language?: string;
  model?: string;
}
```

### Outbound (to TITAN)
```typescript
interface UniversalResponseBody {
  success: boolean;
  text: string;               // Direct text extraction
  provider: string;           // Provider that fulfilled the query
  model: string;              // Model that fulfilled the query
  latency_ms: number;
  tokens: { prompt: number; completion: number; total: number };
  candidates: [               // 100% backward compatibility for Gemini client SDKs
    { content: { parts: [{ text: string }], role: "model" }, finishReason: "STOP" }
  ];
  choices: [                  // 100% backward compatibility for OpenAI client SDKs
    { message: { role: "assistant", content: string }, finish_reason: "stop" }
  ];
}
```

## Unified Apple Control Center UX/UI Design
- **Aesthetic**: Apple HIG macOS Sequoia / iOS Control Center.
- **Surface**: Pure OLED Black (`#000000`), elevated glass surfaces (`rgba(255, 255, 255, 0.04)` to `0.08`), 1px hairline specular borders (`rgba(255, 255, 255, 0.1)`), vibrant backdrop blur (`backdrop-blur-2xl`).
- **Color Accents**: Apple System Blue (`#0a84ff`), Apple Mint (`#30d158`), Apple Amber (`#ff9f0a`), Apple Red (`#ff453a`).
- **Typography**: Apple San Francisco, SF Mono for keys, hashes, and code.
- **Controls**:
  - Cupertino pill segmented tabs with smooth layout animation.
  - Cupertino toggle switches (smooth iOS style switches).
  - Apple sheet dialogs for adding/editing providers and client licenses.
  - Real-time latency ping badge with live test feedback.
