# Rebuild Master Context

## Purpose
Single source of truth for cross-phase context while implementing:

1. `PLAN 1.md`
2. `PLAN 2.md`
3. `PLAN 3.md`

## Locked Decisions
- Execution order: `PLAN 1 -> PLAN 2 -> PLAN 3`
- Gate rule: visual + functional signoff required before next phase
- Canonical stack: Firebase Auth + Firestore + Firebase Storage
- Hosting target: Netlify
- URL strategy: keep existing route URLs
- App direction: Next.js App Router + TypeScript + Tailwind + shadcn-style tokenized system
- Visual direction: dark cinematic glass, compact density, amber + warm silver accents
- Shell model: collapsible left rail + command bar + universal right inspector

## Experience Targets
- Core routes: dashboard/build/calendar/review/analytics/settings/assets
- Company module routes: companies list, profile, intake
- Studio routes: studio, studio job detail, studio library
- Accessibility target: WCAG 2.2 AA on core flows

## Cross-Phase Dependency Rules
- Phase 2 starts only after Phase 1 is shipped and signed off.
- Phase 3 starts only after Phase 2 canonical company context model is shipped.
- Contract changes in later phases must remain back-compatible or include migration notes.

## Data Direction
- Firestore workspace-first model
- Firebase Storage as canonical media store
- Existing Netlify function orchestration may remain during migration

## Review Inputs
- Source visual references are in `EXAMPLES/`
- Plan sources are in `Rebuild Plans/PLAN 1.md`, `Rebuild Plans/PLAN 2.md`, and `Rebuild Plans/PLAN 3.md`

