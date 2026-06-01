## Why

The TITAN admin console currently lacks critical production-grade usability features. Specifically, the licensing ledger lacks client-side pagination (leading to vertical clutter with large volumes), lacks visual clipboard copy features in several grids, does not allow dynamically picking specific Gemini API keys from the rotational Key Pool within modals, and lacks direct Quick-Select durations for common evaluation periods (1-Day and 2-Day trials). Resolving these gaps ensures a seamless administrative experience for high-throughput license generation.

## What Changes

- **Action Parity in Key Vault**: Introduce clipboard copier and consistent action gates (Terminate/End action parity) directly in the `KeyVaultPage` card grid.
- **Interactive Stat Cards**: Allow filtering the ledger table dynamically by clicking on active/expired/missing licenses stat cards with visual toggle states.
- **Client-Side Pagination**: Add full paging capabilities, including page size selectors (10, 25, 50, All) and page index indicators with disabled previous/next states.
- **CSV Data Export**: Enable full-featured client-side spreadsheet compilation and download for active/filtered licenses.
- **Key Pool Visual Assigners**: Integrate visual dropdown menus in `AddKeyModal` and `EditKeyModal` allowing admins to assign specific keys from the rotational `api_key_pool` database table.
- **License Duration Templates**: Introduce 1-Day and 2-Day quick-select template buttons to accelerate testing key generation.

## Capabilities

### New Capabilities
- `admin-ledgers`: Enhanced ledger grid interface featuring client-side pagination, interactive click-to-filter stat cards, and dynamic CSV data compilation.
- `key-pool-selector`: Contextual key pool database integration within administrative modals, offering key status checking and manual/rotational API key assignments.

### Modified Capabilities
<!-- No existing capabilities listed in specs/ directory -->

## Impact

- **Affected Files**:
  - `C:\Users\rithesh\Desktop\lock\web\app\admin\page.tsx` (modals and pages logic)
- **Database / API Key pool**: Leverages the existing `api_key_pool` table and server actions (`fetchPoolKeys`, `fetchFreePoolKeys`, `markPoolKeysUsed`).
