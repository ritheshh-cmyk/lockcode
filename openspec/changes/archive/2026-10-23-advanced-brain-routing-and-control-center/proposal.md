# Proposal: Advanced AI Brain Routing, Live Radar & Control Center Enhancements

## Why
Following the unified Apple Control Center release, operators require enterprise-grade controls for scaling multi-model routing, monitoring live queries in real time, issuing bulk client vouchers, and governing hardware bindings—while keeping the TITAN desktop client 100% passive with zero background network footprint.

## What Changes
1. **Intelligent Mode-Based Routing (Feature 1)**:
   - Dynamic mode mapping for Code vs. MCQ.
   - Automated Speed-Tier routing: MCQs routed to ultra-fast sub-500ms models (Groq/Cerebras); Code routed to deep-reasoning models (Gemini/DeepSeek).
2. **Automated Health Pings & Proactive Circuit Breaking (Feature 2)**:
   - Proactive background checks to identify degraded or rate-limited providers before clients experience errors.
3. **Prompt & Code Sanitization (Feature 3)**:
   - Stripping invisible anti-cheat watermarks (`\u200B`, `\u200C`, `\u200D`, `\uFEFF`) from inbound prompts.
   - Stripping conversational preambles and markdown fences from outbound code.
4. **Live Activity Stream / Radar via SSE (Feature 5)**:
   - Server-Sent Events (SSE) route at `/api/admin/stream` providing a live telemetry radar in the Control Center.
5. **Bulk License & Voucher Code Generator (Feature 6)**:
   - Generate batches of 8-digit license keys with 1 click; export to CSV, JSON, or copy to clipboard.
6. **Hardware Lock Management & Remote Killswitch (Feature 7)**:
   - Inspect hardware bindings, unbind devices for legitimate hardware swaps, and issue instant remote revocation.
7. **3-Way Provider Load Balancing (Feature 8)**:
   - Support 3 routing strategies in the Control Center: Priority Waterfall, Weighted Distribution (% weights), and Round-Robin.
8. **Stealth Payload-Bound Config Sync & Killswitch (Feature 11)**:
   - TITAN sends ZERO background heartbeats. Validation, killswitch, and language sync are handled entirely inside the query payload cycle.

## Capabilities
### New Capabilities
- `sse-activity-stream`: Real-time Server-Sent Events stream of Brain queries for live operator monitoring.
- `bulk-license-generator`: Batch generation and export of client license vouchers.
- `advanced-brain-balancer`: Multi-strategy load balancing (Waterfall, Weighted, Round-Robin) and mode-aware routing (Code vs. MCQ).
- `prompt-sanitizer`: Lightweight anti-cheat watermark stripping and clean code normalization.

### Modified Capabilities
- `bridge-generate`: Enhanced to incorporate load balancing strategies, mode routing, and sanitization.
- `admin-control-center`: Augmented with Live Radar, Bulk Generator, and Balancing Strategy controls.

## Impact
- **TITAN Client**: Zero background network traffic; 100% stealth maintained.
- **Operators**: Full real-time observability, instant bulk provisioning, and fine-grained model traffic distribution.
