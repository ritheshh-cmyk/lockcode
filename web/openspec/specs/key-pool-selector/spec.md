# key-pool-selector Specification

## Purpose
TBD - created by archiving change admin-panel-upgrades. Update Purpose after archive.
## Requirements
### Requirement: Modal Key Pool Visual Selectors
The system SHALL provide interactive key pool selectors in both the `AddKeyModal` and `EditKeyModal`. Admins MUST be able to view unchecked, active, or rate-limited keys from the `api_key_pool` table and assign them directly to the license through a dropdown or visual picker instead of entering keys manually.

#### Scenario: Assign key from pool in AddKeyModal
- **WHEN** the user opens `AddKeyModal` and clicks on the pool picker dropdown
- **THEN** the picker lists all free (unused) pool keys with their labels and status, and clicking a key adds it to the license's API key field.

#### Scenario: Assign key from pool in EditKeyModal
- **WHEN** the user opens `EditKeyModal` and clicks the pool selector trigger button
- **THEN** an inline list of available pool keys is shown, allowing the user to select and assign the key to the license.

### Requirement: License Tier Duration Templates
The system SHALL display "1-Day" and "2-Day" quick-select template buttons under the trial duration inputs in the `AddKeyModal` to accelerate testing key generation. Clicking a template SHALL pre-populate the trial days and hours inputs.

#### Scenario: Click 1-Day trial template
- **WHEN** the user clicks the "1-Day" trial quick-select template button in `AddKeyModal`
- **THEN** the trial days input is populated with `1` and the trial hours input is populated with `0`.

#### Scenario: Click 2-Day trial template
- **WHEN** the user clicks the "2-Day" trial quick-select template button in `AddKeyModal`
- **THEN** the trial days input is populated with `2` and the trial hours input is populated with `0`.

