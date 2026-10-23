# ai-gateway Specification

## ADDED Requirements

### Requirement: Multi-Tier AI Gateway & Fallback
The Vercel edge backend SHALL provide a universal AI bridge capable of dynamically rotating across environment API keys, Supabase key pools, and fallback providers.

#### Scenario: Successful Generation with Env Key
- GIVEN a valid request with `x-app-secret`
- WHEN `/api/bridge/generate` is called
- THEN it returns a 200 response with generated content and provider metadata.

#### Scenario: Server-Side Fallback on Gemini Rate Limit
- GIVEN Gemini API returns HTTP 429
- WHEN `/api/bridge/generate` is called
- THEN it automatically falls back to Groq `llama-3.3-70b-versatile` and returns a 200 response.

### Requirement: Dedicated MCQ and Utility Endpoints
The platform SHALL provide dedicated endpoints for fast MCQ answering, code formatting, health diagnostics, and streaming.

#### Scenario: Fast MCQ Resolution
- GIVEN an assessment multiple choice question
- WHEN `/api/bridge/mcq` is invoked
- THEN it returns clean structured JSON with the selected option and explanation.

#### Scenario: Health Check
- GIVEN a health query to `/api/bridge/health`
- WHEN invoked via HTTP GET
- THEN it returns 200 with edge region and provider availability status.
