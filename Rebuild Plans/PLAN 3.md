# Plan Addendum: AI Studio (Lovart-Style) with Company-Context Generation

## Summary
Add a new first-class page: **AI Studio** for image + video generation using **Nano Banana Pro** and **Kling 3.0**, integrated into your rebuilt app shell and powered by selected company context from Firestore.

This module will:
- Reuse Lovart’s high-level pattern (not clone): **left tools, center canvas/timeline, right prompt+controls**
- Always inject company brand intelligence context (guarded/weighted)
- Run async generation jobs with progress/retry/failure handling
- Route outputs into required review workflow before publish
- Meter usage with included credits + overages

---

## UX and IA

### New Routes
- `/studio`  
  Main AI Studio workspace.
- `/studio/jobs/[jobId]`  
  Deep link to generation session.
- `/studio/library`  
  Generated outputs history (filter by company/project).

### Studio Layout
- **Left rail (tools):** generator mode, style presets, brand boards, recent sessions.
- **Center workspace:** prompt result canvas (images), timeline/scene strip (video), compare view.
- **Right panel:** prompt editor, company context chips, model params, safety status, submit queue.
- **Bottom bar:** job status, queue count, credit usage, approve/send-to-build actions.

### Required Behaviors
- Active company must be explicit and pinned.
- Company context always-on by default, visible as editable-weight chips (Identity/Voice/Visual/Audience/Content).
- One-click “Open company profile” to edit source context.
- Generated assets can be:
  - saved to company asset library
  - sent to Build Post
  - sent to Review Queue (default required path)

---

## Firestore + Firebase Auth + Storage Design

### Collections
- `workspaces/{workspaceId}/studioSessions/{sessionId}`
- `workspaces/{workspaceId}/generationJobs/{jobId}`
- `workspaces/{workspaceId}/generatedAssets/{assetId}`
- `workspaces/{workspaceId}/companyContexts/{companyId}` (compiled cache)
- `workspaces/{workspaceId}/usageMeters/{periodId}`
- `workspaces/{workspaceId}/safetyEvents/{eventId}`

### Job Document (core)
- `companyId`, `requestedBy`, `model` (`nano-banana-pro|kling-3`)
- `mode` (`image|video`)
- `promptRaw`, `promptCompiled`, `negativePrompt`
- `contextWeights` (`identity|voice|visual|audience|content`)
- `status` (`queued|running|succeeded|failed|blocked`)
- `providerJobId`, `progress`, `errorCode`, `errorMessage`
- `outputRefs[]`, timestamps

### Storage Paths
- `workspaces/{workspaceId}/generated/{companyId}/images/*`
- `workspaces/{workspaceId}/generated/{companyId}/videos/*`
- `workspaces/{workspaceId}/generated/{companyId}/thumbs/*`

---

## Context Injection Architecture (Always-On Guarded)

### Weighted Context Compiler
Build a compiler step before provider request:
1. Pull company profile sections from Firestore.
2. Normalize into model-specific blocks:
   - visual style descriptors
   - brand voice constraints
   - color/logo/mascot references
   - audience intent
   - content guardrails
3. Apply weighted blending (default weights editable in UI).
4. Add negative constraints (off-brand, prohibited elements, banned claims).
5. Persist compiled prompt payload for audit/debug.

### Injection Controls
- Context is on by default and cannot be fully disabled by non-admin roles.
- Users can tune section weights and strictness slider.
- Prompt preview shows what was injected and why.

---

## Provider Integration Strategy

### Direct API Adapters
- `NanoBananaAdapter` for image generation/editing
- `KlingAdapter` for text/image-to-video and extensions
- Unified interface:
  - `submitJob(payload)`
  - `getJobStatus(providerJobId)`
  - `fetchOutputs(providerJobId)`
  - `cancelJob(providerJobId)`

### Execution Model
- Async queued jobs only.
- Retry policy with capped exponential backoff + jitter.
- Dead-letter status for repeated failures.
- Webhook support if provider allows; fallback polling.

---

## Safety + Brand Governance

### Pre-generation checks
- content moderation (policy)
- prohibited prompt terms
- company-specific banned topics and claims
- logo/mascot misuse checks (rule-based in V1)

### Post-generation checks
- image/video moderation pass
- brand consistency heuristics (color/style mismatch, forbidden marks)
- block or require explicit admin override for failed checks

### Audit
Every generation writes:
- input prompt, compiled context version
- model and params
- safety outcomes
- approval decisions
- publish routing outcome

---

## Approval and Workflow Integration
- All generated outputs default to `review_required`.
- “Send to Build” creates draft post payload with asset refs + company context link.
- Review queue shows AI provenance:
  - model used
  - prompt hash
  - context version used
  - safety score summary

---

## APIs / Interfaces to Add

### Studio
- `POST /api/studio/jobs`
- `GET /api/studio/jobs?companyId=&status=`
- `GET /api/studio/jobs/:jobId`
- `POST /api/studio/jobs/:jobId/cancel`
- `POST /api/studio/jobs/:jobId/route` (`build|review|library`)

### Context
- `GET /api/companies/:companyId/context-compiled`
- `POST /api/companies/:companyId/context-compile`

### Usage/Billing
- `GET /api/usage/ai?workspaceId=`
- `POST /api/usage/ai/consume`

### Safety
- `POST /api/safety/evaluate-prompt`
- `POST /api/safety/evaluate-output`

---

## Billing and Metering (Credits + Overage)
- Plan includes monthly AI credits.
- Meter separately:
  - per image generation/edit
  - per video generation/extend
- Store usage ledger in Firestore (`usageMeters`) with immutable events.
- UI shows:
  - credits remaining
  - estimated cost before submission
  - overage warnings before run

---

## Testing and Acceptance Criteria

### Functional
- create image job and video job successfully
- company context injected and persisted in compiled payload
- job status transitions and retries work correctly
- generated assets saved to Firebase Storage + Firestore metadata
- send-to-review and send-to-build routes create correct records

### Governance
- blocked prompts cannot run
- blocked outputs cannot publish
- role restrictions respected (viewer/client cannot override checks)

### Reliability
- provider failure -> retry -> terminal failed state with clear reason
- canceled jobs stop polling and mark terminal status

### UX
- Lovart-style layout works desktop and tablet
- keyboard navigation and focus management in Studio controls
- queue indicators and progress are legible and responsive

---

## Assumptions and Defaults
- Nano Banana Pro and Kling 3.0 credentials/contracts are available.
- Firebase Auth is canonical identity; Firestore is canonical studio/company context store.
- Existing scheduler/review modules remain in place and consume generated assets via API bridge.
- Context compiler starts rule-based in V1; advanced semantic retrieval can be phase 2.

