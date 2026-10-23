## ADDED Requirements

### Requirement: Key Vault Action and Clipboard Parity
The system SHALL provide a clipboard copier icon button next to the registration key in the `KeyVaultPage` card grid, matching the copying behavior and checkmark animation from the ledger table. The system SHALL also support standard action handlers (Edit, Revoke, Terminate, Reset, Delete) within the `KeyVaultPage` card grid, maintaining parity with the main `OverviewPage` table.

#### Scenario: Copy key from Key Vault card
- **WHEN** the user clicks the copy button next to the registration key in a Key Vault card
- **THEN** the registration key is written to the clipboard, and the copy icon transitions into a green checkmark icon for 1.5 seconds.

#### Scenario: Trigger actions from Key Vault card
- **WHEN** the user clicks Edit, Revoke, End (Terminate), Reset, or Del (Delete) on a Key Vault card
- **THEN** the corresponding modal opens or the server action is dispatched, updating the license state.

### Requirement: Interactive Stat Cards Filtering
The system SHALL allow users to filter the licensing ledger table dynamically by clicking on any of the three stat cards: "Active Licenses", "Expired", or "Missing Gemini Keys". Clicking a stat card SHALL toggle that filter on or off, and display a prominent active toggle state with an accent border and custom checkmark badge.

#### Scenario: Toggle active licenses filter by stat card
- **WHEN** the user clicks the "Active Licenses" stat card when it is inactive
- **THEN** the ledger table displays only active licenses, and the active card shows a success border, glow shadow, and checkmark badge.

#### Scenario: Untoggle active licenses filter by stat card
- **WHEN** the user clicks the "Active Licenses" stat card when it is already active
- **THEN** the active licenses filter is removed, and the ledger table displays all licenses.

### Requirement: Client-Side Pagination for Ledger Table
The system SHALL provide client-side pagination on the licensing ledger table, including a page size selector (10, 25, 50, and All), current page indicator, previous and next navigation controls, and page-specific index buttons.

#### Scenario: Navigate to next page
- **WHEN** the user clicks the "chevron_right" next page button
- **THEN** the ledger table advances to the next page of results, updating the list.

#### Scenario: Change page size to fifty
- **WHEN** the user selects "50" in the page size dropdown
- **THEN** the table updates to display up to 50 rows per page, resetting the current page to 1.

### Requirement: CSV Ledger Data Export
The system SHALL provide a CSV export capability that compiles the currently filtered rows in the ledger into a formatted CSV spreadsheet file and downloads it automatically to the user's local machine.

#### Scenario: Trigger CSV download
- **WHEN** the user clicks the "Export" button on the ledger toolbar
- **THEN** the client compiles the visible/filtered rows (Registration Key, Label, Gemini Key, Machine ID, Model, Language, Status, Expiry, and Creation time) and downloads a `.csv` file.
