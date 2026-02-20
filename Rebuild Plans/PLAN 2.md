# SocialButterflie Rebuild Plan Update: Company Brand Intelligence + Firebase Core

## Summary
Add a new first-class module called **Company Brand Intelligence** and make it the foundation for client onboarding, brand context, and AI quality.

This module includes:
- **Company card grid** with 5 brand sections surfaced per card
- **Click-to-inspect** (right inspector) and **expand-to-full editor**
- **Massive guided intake questionnaire** for new companies (6-8 step wizard, 80-120 fields)
- **Drag/drop uploads** for logos, mascots, banners, and reference gallery
- **Auto version snapshots** and audit history
- **Shareable intake links** for clients
- **Automatic AI context injection** into caption/assistant flows

Architecture is now explicitly:
- **Firebase Auth + Firestore + Firebase Storage**
- Next.js App Router frontend rebuild
- Existing backend orchestration can remain temporarily where useful, but canonical company profile data lives in Firestore.

## Confirmed Decisions (Locked)
- Visual: dark cinematic glass, amber + warm silver accents, compact pro density
- Navigation: hybrid collapsible left rail
- Layout model: left rail + command bar + dense cards + universal right inspector
- Company profile sections: Identity, Voice, Visual, Audience, Content
- Card open behavior: inspector first + full-page expand
- Intake depth: large guided wizard (6-8 steps)
- Edit permissions: Admins + Editors
- Intake method: shareable intake link
- Versioning: automatic snapshots
- Asset taxonomy V1: Logos, Mascots, Banners, Reference Gallery
- Prompting: section-level optimized prompt packs
- AI usage: auto-inject company profile context

## Product IA Additions
- `/companies`  
  Company grid with cinematic cards, quick health badges, completion %, last updated, owner chips.
- `/companies/[companyId]`  
  Full editable Company Brand Intelligence profile.
- `/companies/[companyId]/intake`  
  Guided questionnaire wizard.
- Inspector integration across app for `company` entity objects.
- Company switcher stays global in command/context bar.

## Firestore Data Model (Workspace-First)
Top-level collections:
- `workspaces/{workspaceId}`
- `workspaces/{workspaceId}/companies/{companyId}`
- `workspaces/{workspaceId}/companies/{companyId}/versions/{versionId}`
- `workspaces/{workspaceId}/companies/{companyId}/assets/{assetId}`
- `workspaces/{workspaceId}/companies/{companyId}/intakeResponses/{responseId}`
- `workspaces/{workspaceId}/companies/{companyId}/audit/{auditId}`
- `workspaces/{workspaceId}/intakeLinks/{linkId}`

### `companies` document shape (core)
- `name`, `slug`, `status`, `completionScore`
- `identity`: legal name, tagline, mission, logo refs, mascot refs, color tokens
- `voice`: tone sliders, do/dont language, copy examples, CTA style
- `visual`: style keywords, layout preferences, typography preferences, mood refs
- `audience`: personas, geos, objections, desired perception
- `content`: pillars, formats, cadence, platform goals, prohibited topics
- `promptPacks`: optimized section prompts + client examples
- `aiContextCompiled`: normalized merged string/object for AI injection
- `createdBy`, `updatedBy`, timestamps

### `assets` document shape
- `type` (`logo|mascot|banner|reference`)
- `storagePath`, `downloadUrl`, `thumbnailUrl`
- `tags`, `notes`, `dominantColors`, `usageRights`
- `uploadedBy`, timestamps

## Firebase Storage Structure
- `workspaces/{workspaceId}/companies/{companyId}/logos/*`
- `.../mascots/*`
- `.../banners/*`
- `.../references/*`

Uploads:
- drag/drop multi-file + progress
- client-side file validation (type/size/dimensions where relevant)
- metadata persisted in Firestore assets subcollection

## Questionnaire (Massive Wizard)
6-8 steps:
1. Brand Identity
2. Voice & Messaging
3. Visual Direction
4. Audience & Positioning
5. Content Strategy
6. Asset Uploads
7. AI Prompt Context
8. Review & Confirm

Features:
- conditional branching by company type (business/personal brand)
- autosave per step
- progress + completion scoring
- draft/publish states
- can resume from share link

## Public Interfaces / API Changes
Even with Firestore direct reads via SDK, add thin server-side routes for consistency and security boundaries.

New endpoints/actions:
- `POST /api/companies`
- `GET /api/companies?workspaceId=...`
- `GET /api/companies/:companyId`
- `PATCH /api/companies/:companyId`
- `POST /api/companies/:companyId/version`
- `GET /api/companies/:companyId/versions`
- `POST /api/companies/:companyId/intake`
- `POST /api/companies/:companyId/assets/sign-upload` (if signed workflow used)
- `POST /api/intake-links`
- `POST /api/intake-links/:token/submit`

Inspector aggregator:
- `GET /api/inspector/company/:companyId` returns summary + versions + approvals + audit + asset refs

## Auth, Permissions, and Security Rules
Firebase Auth:
- workspace membership claims (or Firestore membership lookup)
- roles: `admin`, `editor`, `viewer`, `client`

Rules:
- viewers: read-only company profiles
- admins/editors: write company fields, assets, versions
- client via intake token: scoped write to intake response only
- Storage rules enforce path ownership + role checks

## UI Component Plan
- `CompanyCard`
- `CompanyCardStack` (cinematic layout option)
- `CompanyInspectorPanel`
- `CompanyProfileEditor`
- `IntakeWizard`
- `BrandBoardUploader`
- `PromptPackEditor`
- `VersionTimeline`
- `AuditTrailPanel`

## AI Integration
When generating captions/hashtags/assistant outputs:
- auto-load active company `aiContextCompiled`
- include section-derived constraints and examples
- log which profile version fed each AI call

## Test Cases and Scenarios
Functional:
- create company, edit sections, save, version snapshot created
- drag/drop upload for each asset type
- open card in inspector, expand to full editor
- generate shareable intake link and submit as client
- role enforcement: viewer/client cannot edit canonical fields
- AI request includes company context and correct version reference

Security:
- cross-workspace data isolation in Firestore rules
- intake token cannot access unrelated company/workspace
- unauthorized Storage upload blocked

UX:
- compact density maintained at 1440/1280/1024/mobile breakpoints
- keyboard navigation through cards, inspector, and wizard
- autosave recovery after refresh

Performance:
- company grid load under target budgets
- upload progress and error handling resilient on network interruption

## Rollout Plan
Phase 1:
- build Company module + Firebase auth/firestore/storage plumbing
- ship behind feature flag (`companies_v2`)
Phase 2:
- connect module into Build/AI flows (auto context)
Phase 3:
- migrate remaining profile/settings data to Firestore-backed model
Phase 4:
- full frontend cutover with Company module as primary onboarding surface

## Assumptions and Defaults
- Firestore becomes canonical store for company brand intelligence data.
- Firebase Storage is canonical for brand assets.
- Existing scheduling/review analytics backend can coexist during migration.
- Share links are time-bounded and revocable.
- Future asset categories can be added without schema break via extensible `type` and `tags`.
