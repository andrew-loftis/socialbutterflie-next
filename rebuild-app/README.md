# SocialButterflie Rebuild App

This folder contains the sequential rebuild implementation target for:

1. `Rebuild Plans/PLAN 1.md`
2. `Rebuild Plans/PLAN 2.md`
3. `Rebuild Plans/PLAN 3.md`

## Stack
- Next.js App Router + TypeScript
- Tailwind v4 tokens in `src/app/globals.css`
- Firebase Auth + Firestore + Firebase Storage (with mock fallback when env is missing)

## Run
```bash
npm install
npm run dev
```

## Routes Implemented
- Core shell/pages: `/dashboard`, `/build`, `/calendar`, `/review`, `/analytics`, `/settings`, `/assets`
- Company module: `/companies`, `/companies/[companyId]`, `/companies/[companyId]/intake`
- AI Studio: `/studio`, `/studio/library`, `/studio/jobs/[jobId]`

## API Endpoints Implemented
- `/api/context/session`
- `/api/inspector/entity`
- `/api/search`
- `/api/assets`
- `/api/companies` (+ detail/patch, versions, context compile)
- `/api/studio/jobs` (+ detail, cancel, route destination)
- `/api/usage/ai` and `/api/usage/ai/consume`

## Notes
- If Firebase server credentials are not present, repository functions use in-memory demo data.
- Governance files are tracked in `Rebuild Plans/`:
  - `MASTER_CONTEXT.md`
  - `DECISION_LOG.md`
  - `PHASE_STATUS.md`

