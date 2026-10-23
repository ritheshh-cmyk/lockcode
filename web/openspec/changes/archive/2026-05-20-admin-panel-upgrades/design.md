## Context

The TITAN admin console provides essential administrative tools for license generation, rotation, tracking, and management. While the backend capabilities (Supabase actions, key pool logic) are fully functional, several core UI-side usability bottlenecks remain:
1. **Ledger Overload**: Large tables vertical scrolling is cumbersome without interactive filter controls and page segregation.
2. **Missing Copy Button in Vault**: The Key Vault card layout doesn't provide a quick click-to-copy button next to the registration key.
3. **Manual Key Selection**: While an `api_key_pool` table exists, admins must manually enter keys or rely entirely on automatic assignment in the `AddKeyModal`. There is no visual picker in the `AddKeyModal` and `EditKeyModal` to select specific pool keys manually.
4. **No Duration Presets**: Testing requires frequent generation of short 1-Day or 2-Day trials, which currently require manual number inputs.

To solve these gaps, we will implement client-side interactive dashboard capabilities and inline key pool pickers inside the Next.js `web` app.

## Goals / Non-Goals

**Goals:**
- Provide client-side pagination with selectable page sizes (10, 25, 50, All) for the ledger table.
- Implement click-to-filter stat cards that show active, expired, or missing keys with custom toggle states.
- Introduce CSV export on the filtered dataset directly in the UI.
- Add clipboard copying and full actions parity inside the Key Vault card grid.
- Integrate an interactive key pool dropdown selector in both `AddKeyModal` and `EditKeyModal`.
- Provide 1-Day and 2-Day trial preset duration buttons in `AddKeyModal`.

**Non-Goals:**
- No server-side pagination (client-side fits within our high-performance client state).
- No relational database schema changes (use existing `licenses` and `api_key_pool` tables).
- No third-party CSV libraries (compile raw string output in memory).

## Decisions

1. **Client-side Pagination**: We will implement stateful page controls in the `OverviewPage` using React `useState`. We slice the pre-filtered license array client-side, which is highly responsive and eliminates server overhead.
2. **Interactive Filter Toggles**: We'll define a state variable `statFilter` which takes values `""`, `"active"`, `"expired"`, or `"missing"`. Clicking on a stat card will toggle the corresponding state, clear other search/status filters, and render interactive CSS visual states.
3. **Clipboard Copying & Parity in Key Vault**: We will add a copy button next to the registration key in `KeyVaultPage` using `navigator.clipboard.writeText` and animate a transition using local component state, similar to `OverviewPage`.
4. **Key Pool Picker in Modals**: 
   - In `AddKeyModal`, we will fetch the list of free keys and display an interactive list where admins can click to assign or append keys to the license.
   - In `EditKeyModal`, we will preserve the existing inline key-pool list under the key input, and ensure it correctly updates the `newGemini` state.
5. **Preset Duration Templates**: We will add two visual preset buttons for "1-Day" and "2-Day" that call state updates to `setTrialDays` and `setTrialHours` directly.

## Risks / Trade-offs

- **Memory overhead with huge datasets** → Mitigation: Client-side slicing is extremely fast for under 10,000 keys. If the dataset exceeds this, server-side pagination can be introduced later without changing the UI architecture.
- **Concurrent edits or key pool exhaustion** → Mitigation: Show warning banner if no free keys are available in the pool, prompting the admin to populate the pool first.
