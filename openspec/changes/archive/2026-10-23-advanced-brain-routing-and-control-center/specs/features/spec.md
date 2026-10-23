# Spec: Advanced Brain Routing & Control Center Features

## ADDED Requirements

### Requirement: Mode-Aware Routing and Multi-Strategy Load Balancing
The Brain engine MUST support three selectable routing strategies (`waterfall`, `weighted`, `round_robin`) and mode-specific provider assignment for `code` and `mcq` operations.
- MCQ Speed-Tier: For MCQ queries, route primarily to providers with `<500ms` latency (e.g., Groq).
- Code Deep-Reasoning: For Code queries, route to high-capability reasoning models (e.g., Gemini 2.5 Flash, DeepSeek).
- Fallback: If the selected preferred provider fails or returns 429, the engine MUST cascade to remaining active providers.

#### Scenario: Routing an MCQ to ultra-fast provider
- Given Groq and Gemini are both active providers in the Brain
- When a query with `mode: "mcq"` is dispatched
- Then the Brain selects Groq as the low-latency MCQ handler and returns the response in under 500ms

#### Scenario: Weighted traffic distribution
- Given Provider A is configured with weight 70 and Provider B with weight 30
- When queries arrive under `weighted` strategy
- Then traffic is proportionally distributed while maintaining automated failover if either provider degrades

### Requirement: Anti-Cheat Prompt and Code Sanitization
The bridge MUST sanitize input prompts and output responses without being overly aggressive.
- Inbound: Remove zero-width characters (`\u200B`, `\u200C`, `\u200D`, `\uFEFF`, `\u2060`) used for copy-paste watermarking.
- Outbound: Strip markdown code fences (```) and conversational intros to deliver pure code.

#### Scenario: Strip watermarks from exam prompt
- Given an inbound prompt containing embedded zero-width spaces (`\u200B`)
- When the prompt enters `/api/bridge/generate`
- Then the sanitized prompt without zero-width tokens is forwarded to the AI provider

#### Scenario: Deliver pure clean code to TITAN
- Given an AI provider outputs ````java\npublic class Main {}\n```` with intro text
- When the response is returned to TITAN
- Then the markdown backticks and conversational text are stripped, leaving only `public class Main {}`

### Requirement: Live Activity Stream via Server-Sent Events
The system MUST provide an SSE endpoint at `/api/admin/stream` that broadcasts live telemetry events to connected Control Center operators.

#### Scenario: Operator receives real-time query event
- Given an operator viewing the Control Center with an open SSE connection
- When a client sends a question to `/api/bridge/generate`
- Then an SSE event is pushed to the client displaying the key, mode, provider used, latency, and tokens

### Requirement: Bulk License and Voucher Generation
The Control Center MUST allow operators to generate batches of 8-digit license keys with customizable duration and export capabilities.

#### Scenario: Generate 25 licenses with CSV export
- Given an authenticated operator in `/admin`
- When the operator requests 25 licenses for "Exam Batch A" with 24-hour duration
- Then 25 distinct 8-digit keys are inserted into the database and presented with 1-click CSV download and clipboard copy

### Requirement: Hardware Lock Management and Stealth Payload-Bound Killswitch
The system MUST allow operators to view hardware bindings, clear MAC locks for machine swaps, and revoke licenses remotely without requiring client-side background heartbeats.

#### Scenario: Remote killswitch on query payload
- Given an operator revokes a license in the Control Center
- When TITAN next sends a query payload with that registration key
- Then Vercel returns HTTP 403 Forbidden, and the TITAN client ceases operation without running periodic background polling
