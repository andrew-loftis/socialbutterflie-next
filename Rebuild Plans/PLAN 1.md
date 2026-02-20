# SocialButterflie Full Rebuild Plan (Dark Cinematic, Next.js, Decision-Complete)

## Summary
Rebuild the product frontend into a premium, compact, dark cinematic SaaS experience using **Next.js App Router + TypeScript + Tailwind + shadcn + tokenized design system**, while preserving your current backend APIs on Netlify in phase 1.  
The new UX will center on your requested model: **left rail + command bar + dense card grid + universal right inspector** across core pages, plus a **tabbed mobile simulator** in Build.

This plan assumes:
- Keep existing route URLs (`/calendar`, `/build`, `/analytics`, etc.).
- Stay hosted on Netlify.
- Big-bang frontend swap at launch.
- Add real login in phase 1.
- Weekly gated delivery with reference-board review checkpoints.

## Current State Inventory (What Works Today)
- Existing static pages for Dashboard, Calendar, Build, Review, Analytics, Storage, Settings, Profile.
- Netlify functions already support context, workspaces, members, campaigns, scheduling, review approve/reject, analytics, AI endpoints, account groups, audit logging.
- DB already has `orgs`, `workspace_members`, `scheduled`, `scheduled_log`, `audit_log`, `account_groups`, `connections`, `campaigns`, `prefs`.
- Current frontend issues are structural/style debt: conflicting CSS layers, oversized/empty regions, inconsistent shell behavior, uneven density, weak information hierarchy.

## Product Experience Targets
- Visual tone: dark cinematic glass with amber + warm silver accents.
- Density: compact professional default.
- Motion: medium cinematic, utility-first transitions only.
- Navigation: hybrid collapsible left rail.
- Inspector: universal right inspector pattern for all major entities.
- Command system: global actions + search (`Cmd/Ctrl+K` and inline command bar).
- Brand voice: “creative operator.”
- Logo: refine current butterfly concept into a cleaner product mark.
- Accessibility: WCAG 2.2 AA on core flows.
- Browser support: modern desktop/mobile browsers.

## Rebuild Architecture (Frontend)
- Add Next.js app into repo and phase out static UI layer.
- Use route groups:
- `(app)` authenticated product
- `(marketing)` optional future site content
- `(playground)` component and state validation
- Keep URLs unchanged via routing config and matching page paths.
- Use server components for read-heavy shells and client components for interaction-rich modules.
- Add universal app shell with:
- Collapsible left rail
- Global command bar
- Context switch row (company + connected user chips)
- Sticky right inspector rail
- Mobile bottom nav + responsive inspector behavior

## Route Plan (V1 Core 6 + Assets)
- `/` or `/dashboard`: operational command center
- `/build`: post composer + tabbed mobile simulator
- `/calendar`: planning calendar with compact filters and inspector hooks
- `/review`: approval queue with batch actions and inspector detail
- `/analytics`: interactive KPI dashboard + export baseline
- `/settings`: workspace, members, appearance, AI prefs, account links
- `/assets` (upgraded from storage): content-first media grid + metadata + inspector

## Major UX Systems to Build
- Universal Inspector framework:
- Entity types: post, asset, campaign, connection, report
- Panels: summary, version history, approvals, audit log, linked objects
- Deep-link support with URL state (`?inspect=post:uuid` pattern)
- Command Palette:
- Global search index over posts/campaigns/assets/connections
- Quick actions: new post, submit review, open company, jump to route
- Keyboard support and focus-safe behaviors
- Company Context Layer:
- Global company switcher in command area
- Connected user chips under company context
- Persist active org/user context through auth/session
- Build Mobile Simulator:
- Tabbed app previews (Instagram/Facebook/LinkedIn/TikTok)
- Content-aware render using caption/media metadata
- “Client demo mode” visual framing for presentations
- Analytics Visual Language:
- Compact card metrics, animated chart reveals, dense table sections
- Preserve readability and consistency with system tokens

## Branding and Design System
- Create token architecture in `styles/globals.css`:
- Semantic color tokens for dark-first and light fallback
- 8px spacing scale
- Radius/elevation/motion tokens
- Accent tokens centered on amber + warm silver
- Typography system:
- Modern sans as base UI text
- Restrained display style for key headings only
- Component primitives:
- Card, panel, toolbar, command input, pills/chips, status badges, data table, chart shell, inspector block
- Motion rules:
- 150–220ms transitions
- Inspector slide/fade
- Chart reveal on mount
- No decorative/parallax excess in core workflows

## Authentication and Session Plan (Phase 1)
- Implement real login now (Supabase Auth recommended to align existing stack).
- Map authenticated user to existing workspace role model.
- Preserve context concept, but source from authenticated identity and selected org.
- Update frontend guards and role-based rendering for review/admin actions.

## Backend/API Strategy
- Phase 1 keeps existing Netlify API surface as primary contract.
- Add only targeted API improvements to support new UX where required.

## Public API / Interface Changes (Planned)
- Add `GET /inspector/entity?type=&id=` aggregator endpoint for normalized inspector payload.
- Add `GET /search?q=` endpoint for command palette global search.
- Add `GET /assets` normalized media listing endpoint (unifying storage concepts).
- Add auth/session endpoints integration or wrappers for real login flow.
- Standardize response envelope for core endpoints:
- `{ data, meta, errors }` for new endpoints
- Keep backward compatibility for old endpoints during transition.
- Add optional pagination/filter params on high-volume lists:
- `/scheduled`, `/analytics`, `/assets`, `/audit`

## Data/Model Additions (Minimal, Backward-Compatible)
- Add version metadata table or extend existing logs:
- `entity_versions` for post/asset/campaign version timeline
- or normalize from `scheduled_log` + `audit_log` for V1
- Add search index materialization strategy:
- lightweight server-side query first
- optional full-text index later

## Delivery Phases (Weekly Gates)
- Week 1:
- Finalize design foundations from EXAMPLES
- Build token system, shell, nav, command bar, universal inspector skeleton
- Deliver clickable Dashboard + shell demo
- Week 2:
- Rebuild Build + Calendar with compact layout and inspector hooks
- Implement tabbed mobile simulator
- Wire to existing schedule/campaign APIs
- Week 3:
- Rebuild Review + Analytics with new visual language
- Add chart system, compact data tables, export baseline
- Implement command palette global search/actions
- Week 4:
- Rebuild Settings + Assets (storage replacement)
- Implement real login and role-aware interactions
- Complete accessibility and responsive passes
- Week 5 (stabilization/cutover):
- Regression QA, performance tuning, final content polish
- Big-bang swap from static UI to Next.js frontend
- Post-launch monitoring and hotfix window

## QA, Testing, and Acceptance Criteria
- Functional tests:
- Login, workspace switch, schedule/create/edit/reschedule post
- Submit/approve/reject review flows
- Campaign creation and assignment
- Analytics render and filters
- Inspector open/deep-link across entities
- Command palette search/jump/action
- Visual/regression tests:
- Snapshot checks for all core pages at desktop + mobile breakpoints
- Density and spacing checks against compact system rules
- Accessibility tests:
- Keyboard-only navigation on all core flows
- Focus visibility and tab order
- Contrast compliance on text/status/action controls
- Screen-reader labels on nav/commands/inspector controls
- Performance targets:
- LCP under 2.5s on core pages (warm path)
- INP under 200ms for primary interactions
- CLS under 0.1

## Rollout and Risk Controls
- Build new app behind internal path during implementation.
- Keep old static app live until cutover readiness checklist passes.
- Run route parity checklist before big-bang swap.
- Maintain API backward compatibility for existing functions during transition.
- Add telemetry hooks for command usage, inspector engagement, and flow drop-offs.

## Reference-Board Review Method
- Every phase checkpoint includes:
- Side-by-side comparisons to specific EXAMPLES images
- What was intentionally matched (layout density, depth, card rhythm, motion)
- What was intentionally adapted for product usability/accessibility
- Sign-off artifact:
- Annotated screenshots for desktop + mobile
- Decision log of approved styling and interaction patterns

## Explicit Assumptions and Defaults
- Next.js App Router is approved stack.
- Tailwind + shadcn + CSS tokens are approved.
- Hosting remains Netlify.
- Existing URLs remain unchanged.
- Big-bang launch is accepted.
- Backend remains mostly as-is in phase 1 with targeted endpoint additions only.
- Core V1 scope is core 6 pages + polished Assets page.
- AI in V1 includes advanced studio direction in UX structure, with staged backend depth if needed.
- Inbox and Automations are deferred to post-V1 unless scope is explicitly expanded.

