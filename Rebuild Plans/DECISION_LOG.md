# Decision Log

## 2026-02-20

### D-001 Execution Order
- Decision: Implement in strict order `PLAN 1 -> PLAN 2 -> PLAN 3`.
- Reason: Reduces dependency drift and keeps contracts stable.

### D-002 Gate Policy
- Decision: Each phase requires visual + functional signoff before next phase.
- Reason: Prevents unresolved UX debt from cascading.

### D-003 Canonical Backend Direction
- Decision: Firebase Auth + Firestore + Firebase Storage are canonical.
- Impact: Supabase references in `PLAN 1.md` are overridden.

### D-004 Shell Pattern
- Decision: Left rail + command bar + right inspector is universal app shell pattern.
- Reason: Matches target product model and references.

### D-005 Company Module
- Decision: Include 5 sections per company profile (Identity, Voice, Visual, Audience, Content).
- Reason: Required for onboarding quality and AI prompt grounding.

### D-006 Intake Strategy
- Decision: Massive wizard (6-8 steps) with shareable client links.
- Reason: Enables structured collection of high-quality brand context.

### D-007 AI Studio Direction
- Decision: Lovart-inspired structure (high-level pattern only), with always-on weighted company context injection.
- Reason: Aligns studio UX with brand intelligence and governance goals.

### D-008 AI Governance
- Decision: Generated outputs require approval before publish.
- Reason: Protects brand and compliance quality.

### D-009 Billing Model
- Decision: Credits + overage metering for AI image/video usage.
- Reason: Supports unit-economics control at scale.

### D-010 Implementation Workspace
- Decision: Build implementation in `rebuild-app/` while preserving legacy static app.
- Reason: Enables phased migration without breaking current production pages during rebuild.

### D-011 Firestore Fallback Strategy
- Decision: Firestore/Firebase Storage integrations include in-memory fallback when credentials are not configured.
- Reason: Keeps local development and CI build stable while Firebase credentials are provisioned.
