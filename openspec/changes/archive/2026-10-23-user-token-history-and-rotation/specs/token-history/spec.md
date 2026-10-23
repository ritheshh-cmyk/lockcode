# token-history Specification

## ADDED Requirements

### Requirement: Token Logging and Self-Pruning Rotation
The system SHALL log request prompts, responses, token consumption, and latency per user key while enforcing a strict 10-record per user ceiling.

#### Scenario: Request Logging with Token Consumption
- GIVEN a valid generation or MCQ request with `reg_key`
- WHEN the response is generated
- THEN a record is created containing prompt, response, tokens calculated, provider, and latency.

#### Scenario: Self-Pruning Rotation on 11th Request
- GIVEN a user with 10 existing history records
- WHEN an 11th request is logged
- THEN the system automatically removes the oldest record, retaining exactly 10 records for that user.

### Requirement: User Token Consumption View
The system SHALL provide a dedicated history interface accessible at `/history`.

#### Scenario: Viewing User History
- GIVEN an 8-digit registration key
- WHEN queried on `/history` or `/api/history`
- THEN it returns the cumulative token usage and up to 10 latest prompts and responses.
