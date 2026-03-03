# Social Butterflie — Feature Expansion Blueprint

> Elaborated from founder notes. Each section maps raw ideas to concrete specs,
> data models, UI surface locations, and implementation priority.
>
> **Date:** March 3, 2026
> **Status:** Specification draft — ready for review & phased implementation

---

## Table of Contents

1. [Stories Publishing Engine](#1-stories-publishing-engine)
2. [Notification System Overhaul](#2-notification-system-overhaul)
3. [Internal Messaging & Approval Comments](#3-internal-messaging--approval-comments)
4. [Post Optimization & Best-Time Engine](#4-post-optimization--best-time-engine)
5. [Unified Social Inbox](#5-unified-social-inbox)
6. [Customizable Dashboard (Notion-Style)](#6-customizable-dashboard-notion-style)
7. [Client Contract & Deliverable Tracker](#7-client-contract--deliverable-tracker)
8. [Comment-Trigger DM Automations](#8-comment-trigger-dm-automations)
9. [Canva Plugin / Export Integration](#9-canva-plugin--export-integration)
10. [Client Media Upload Portal](#10-client-media-upload-portal)
11. [SEO & Hashtag Studio](#11-seo--hashtag-studio)
12. [Data Model Additions](#12-data-model-additions)
13. [Implementation Phases](#13-implementation-phases)

---

## 1. Stories Publishing Engine

### Why It Matters
Stories (Instagram, Facebook, TikTok, YouTube Shorts) drive massive organic
reach — often 2–5× more daily impressions than feed posts. Most SMM tools
still treat Stories as an afterthought. Making this first-class differentiates
Social Butterflie.

### What to Build

| Capability | Details |
|---|---|
| **Story Composer** | Dedicated composer mode in `/build` with vertical (9:16) canvas preview, text overlay placement, sticker/poll/quiz attachment metadata, link sticker URL field, and music tag field. |
| **Story Scheduling** | Stories can be scheduled just like feed posts. Calendar view shows them as a distinct pill type ("Story" badge, different color). |
| **Multi-Slide Stories** | Support ordered slide sequences (up to 10 frames per story set). Drag-to-reorder in composer. Each slide can be image or ≤15s video. |
| **Story Templates** | Reusable story templates stored per-company (brand colors, font, logo watermark position). Clone a template to start a new story instantly. |
| **Story Analytics** | Track reach, taps forward/back, exits, replies, link clicks, sticker interactions per story. Display in the Analytics page as a "Stories" tab. |
| **Review Flow** | Stories flow through the same approval pipeline as posts (draft → in_review → scheduled → published). Reviewers see a phone-frame preview. |
| **Platform Support** | Instagram Stories, Facebook Stories, TikTok (as story-format), YouTube Shorts via the existing social gateway connectors. |

### Data Model

```typescript
interface StorySlide {
  id: string;
  mediaRef: string;          // Firebase Storage path
  mediaType: 'image' | 'video';
  duration?: number;         // seconds, for video
  overlays: StoryOverlay[];  // text, sticker, poll, quiz, link
  order: number;
}

interface StoryOverlay {
  type: 'text' | 'sticker' | 'poll' | 'quiz' | 'link' | 'music' | 'mention';
  payload: Record<string, unknown>;
  position: { x: number; y: number };
  size?: { w: number; h: number };
}

// Extend existing CompanyPost or create a StoryPost variant
interface StoryPost {
  id: string;
  companyId: string;
  type: 'story';
  platforms: SocialProvider[];
  slides: StorySlide[];
  templateId?: string;
  status: 'draft' | 'in_review' | 'scheduled' | 'published' | 'expired';
  scheduledFor?: string;
  publishedAt?: string;
  expiresAt?: string;        // Stories auto-expire after 24h
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
```

### UI Surfaces
- `/build` — toggle between "Post" and "Story" mode at top of composer.
- `/calendar` — Story pills show with a 📷 icon and distinct color.
- `/review` — Phone-frame story preview in the review inspector.
- `/analytics` — "Stories" tab with reach/exits/taps chart.

---

## 2. Notification System Overhaul

### Why It Matters
Current notifications are client-side only (browser toggles in Settings).
For a team tool managing multiple client accounts, **push, email, SMS/text,
and in-app** notifications are essential so nothing slips.

### What to Build

| Capability | Details |
|---|---|
| **Email Notifications** | Transactional emails via SendGrid/Postmark for approvals, comments, publish confirmations, contract deadline reminders. |
| **SMS/Text Notifications** | Twilio integration. Users opt-in per phone number. Ideal for urgent approvals and contract deadline alerts. |
| **Push Notifications** | Web Push (service worker) + future mobile (FCM). Prompt users on first visit with a tasteful opt-in modal. |
| **In-App Notification Center** | Bell icon in the shell header → slide-out panel with grouped, timestamped notifications. Mark read/unread, link to entity. |
| **Notification Preferences (granular)** | Per-user settings page where they configure **per-event-type × per-channel** matrix. Example: "Post approved" → Email ✓, SMS ✗, Push ✓. |
| **Per-Company Notification Rules** | Company admins can set which events notify which roles. E.g., "Client role only gets notified on published posts, not drafts." |
| **Notification Types** | Post approved, Post rejected, Comment received, DM received, Mention detected, Contract milestone approaching, Story expired, Automation triggered, Team member joined, Weekly digest. |
| **Quiet Hours** | Users set "Do not disturb" windows (e.g., 10 PM – 7 AM). Notifications queue and deliver after. |

### Data Model

```typescript
type NotificationChannel = 'email' | 'sms' | 'push' | 'in_app' | 'slack';

type NotificationEventType =
  | 'post_approved'
  | 'post_rejected'
  | 'post_published'
  | 'comment_received'
  | 'dm_received'
  | 'mention_detected'
  | 'contract_milestone'
  | 'story_expiring'
  | 'automation_triggered'
  | 'member_joined'
  | 'weekly_digest'
  | 'approval_requested';

interface NotificationPreference {
  userId: string;
  companyId?: string;           // null = workspace-wide default
  event: NotificationEventType;
  channels: NotificationChannel[];
  enabled: boolean;
}

interface Notification {
  id: string;
  recipientId: string;
  companyId: string;
  event: NotificationEventType;
  title: string;
  body: string;
  entityKind?: EntityKind;
  entityId?: string;
  href?: string;
  read: boolean;
  deliveredVia: NotificationChannel[];
  createdAt: string;
}

interface QuietHours {
  userId: string;
  enabled: boolean;
  startTime: string;  // "22:00"
  endTime: string;    // "07:00"
  timezone: string;
}
```

### UI Surfaces
- **Shell header** — Bell icon with unread badge count → notification slide-out.
- `/settings` — Expanded "Notifications" section with event×channel toggle matrix.
- **First-visit prompt** — Modal: "Stay in the loop — enable push notifications?"
- **Company settings** → "Notification rules" tab for per-role notification config.

### Backend
- Netlify function `notify.js` — fan-out to email (SendGrid), SMS (Twilio), push (FCM), Slack webhook.
- Firestore subcollection: `workspaces/{wid}/notifications/{notifId}`.
- Scheduled function to generate weekly digests.

---

## 3. Internal Messaging & Approval Comments

### Why It Matters
Right now, approval feedback requires leaving the app (Slack, text, email).
Built-in threaded comments on posts, images, and approvals keep context
in one place and speed up the review cycle.

### What to Build

| Capability | Details |
|---|---|
| **Post Comments** | Threaded comment panel on every post in `/review`. Team members and clients can leave feedback, tag others with @mentions. |
| **Image Annotations** | Click on an image to drop a pin + comment (like Figma). Useful for "move the logo left" type feedback on creative assets. |
| **Approval Comments** | When approving/rejecting a post, a required comment field captures rationale. Shows in the post's audit log. |
| **Internal-Only vs Client-Visible** | Toggle on each comment: "Internal" (team only) or "Client" (visible to client-role members). |
| **Real-Time Updates** | Firestore `onSnapshot` listeners so comments appear instantly for all viewers. |
| **@Mention Notifications** | When someone is @mentioned in a comment, trigger a notification (email/push/in-app per their preferences). |
| **Resolve Threads** | Mark comment threads as "Resolved" to keep the view clean. Resolved threads collapse but remain accessible. |

### Data Model

```typescript
interface PostComment {
  id: string;
  postId: string;
  companyId: string;
  parentId?: string;           // for threading
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string;
  body: string;
  mentions: string[];          // user IDs
  visibility: 'internal' | 'client';
  annotation?: {               // image pin
    mediaRef: string;
    x: number;                 // 0-100 percentage
    y: number;
  };
  resolved: boolean;
  resolvedBy?: string;
  createdAt: string;
  updatedAt: string;
}
```

### UI Surfaces
- `/review` — Right-side inspector gets a "Comments" tab alongside Version History and Audit Log.
- `/build` — Comment sidebar visible while editing.
- `/assets` — Image detail overlay gains annotation pins.
- Notification triggers on new comment, @mention, and thread resolution.

---

## 4. Post Optimization & Best-Time Engine

### Why It Matters
Posting at the right time can double engagement. This feature turns Social
Butterflie from a scheduler into an **intelligent publishing advisor**.

### What to Build

| Capability | Details |
|---|---|
| **Audience Activity Heatmap** | Per-company heatmap showing when followers are online, by day×hour. Sourced from platform Insights APIs (Instagram, Facebook, etc.). |
| **AI Best-Time Suggestions** | When scheduling a post, show a "Recommended times" row with top 3 time slots ranked by predicted engagement. |
| **Auto-Schedule Mode** | Toggle in Settings / per-post: "Let Social Butterflie pick the best time." System places post in the highest-engagement slot that doesn't conflict with other scheduled posts. |
| **Competitor Benchmarking** | (Phase 2) Optionally track competitor posting cadence and engagement to inform timing strategy. |
| **A/B Time Testing** | Schedule the same post at two different times across two days. Compare performance after 48h. Report winner. |
| **Optimal Frequency Analysis** | "You posted 3× this week. Historically your engagement drops after post #4. Consider holding this until Monday." |
| **Per-Platform Recommendations** | Different platforms peak at different times. Show per-platform recommended windows. |

### Data Model

```typescript
interface AudienceActivityData {
  companyId: string;
  platform: SocialProvider;
  // 7 days × 24 hours = 168 slots, 0-100 activity score
  heatmap: number[][];  // [dayOfWeek 0-6][hour 0-23]
  sampleSize: number;
  lastSynced: string;
}

interface PostTimeSuggestion {
  platform: SocialProvider;
  suggestedAt: string;    // ISO datetime
  confidence: number;     // 0-100
  reason: string;         // "Peak audience activity window"
}

interface ABTimeTest {
  id: string;
  companyId: string;
  postIdA: string;
  postIdB: string;
  scheduledAtA: string;
  scheduledAtB: string;
  status: 'running' | 'complete';
  winnerPostId?: string;
  results?: {
    impressionsA: number;
    impressionsB: number;
    engagementsA: number;
    engagementsB: number;
  };
}
```

### UI Surfaces
- `/build` composer → "Schedule" step shows recommended time slots with confidence badges.
- `/analytics` → "Best Times" tab with audience heatmap visualization.
- `/calendar` → Suggested open slots glow/highlight.
- `/settings` → "Auto-schedule" toggle (already exists, wire to engine).

---

## 5. Unified Social Inbox

### Current State
Inbox page already exists with comment/DM/mention support and platform
filtering. Needs enhancement.

### What to Add

| Capability | Details |
|---|---|
| **Cross-Platform Threading** | Group messages from the same person across platforms into a unified conversation view. |
| **Quick Reply Templates** | Saved response templates ("Thanks for your comment! 🙌") one-click insert. |
| **Sentiment Tagging** | Auto-tag messages as positive/neutral/negative (already have `sentiment` field — wire to AI classifier). |
| **Assign to Team Member** | Assign an inbox item to a specific team member. Shows their avatar, tracks response time. |
| **Priority Inbox** | AI-ranked: messages from verified accounts, high-follower users, or negative sentiment bubble to top. |
| **Response Time Analytics** | Track average response time per company. Show SLA badges ("Avg reply: 2h 14m"). |
| **Bulk Actions** | Multi-select → Mark read, Archive, Assign, Label. |
| **Label System** | Custom labels (e.g., "Lead", "Complaint", "Collab Request") for organization. |

### Data Model Additions

```typescript
interface InboxAssignment {
  messageId: string;
  assignedTo: string;
  assignedBy: string;
  assignedAt: string;
  status: 'open' | 'in_progress' | 'closed';
}

interface InboxLabel {
  id: string;
  companyId: string;
  name: string;
  color: string;
}

interface QuickReplyTemplate {
  id: string;
  companyId: string;
  name: string;
  body: string;
  platforms: SocialProvider[];
  createdBy: string;
}
```

---

## 6. Customizable Dashboard (Notion-Style)

### Why It Matters
Every user and every company has different priorities. A static dashboard
forces everyone into one view. A Notion-meets-Vista-Social drag-and-drop
dashboard lets users build their own command center.

### What to Build

| Capability | Details |
|---|---|
| **Widget Library** | Predefined widget types users can add: KPI cards, engagement chart, publishing queue, calendar mini-view, inbox preview, contract tracker, tasks, quick actions, recent posts, AI suggestions, notes/scratchpad. |
| **Drag & Drop Grid** | CSS Grid-based layout with drag-and-drop reordering (use `@dnd-kit/core`). Widgets snap to a column grid (2, 3, or 4 columns). |
| **Resize Widgets** | Widgets can span 1–4 columns and 1–3 rows. Drag handle on bottom-right corner. |
| **Per-User Layout** | Dashboard layout saved per user per company in Firestore. Each user can personalize their view. |
| **Widget Settings** | Each widget has a ⚙️ gear icon for configuration (e.g., KPI card → choose which metric, chart → choose date range). |
| **Tasks Widget** | Kanban-lite or checklist: add tasks, assign to team members, due dates, drag to reorder. Company-scoped. |
| **Notes Widget** | Rich-text scratchpad (title + body). Persisted per-company. Useful for content ideas, meeting notes. |
| **Preset Layouts** | One-click layouts: "Manager View", "Client View", "Content Creator". Users can start from a preset and customize. |

### Data Model

```typescript
type WidgetType =
  | 'kpi_card'
  | 'engagement_chart'
  | 'publishing_queue'
  | 'calendar_mini'
  | 'inbox_preview'
  | 'contract_tracker'
  | 'tasks'
  | 'quick_actions'
  | 'recent_posts'
  | 'ai_suggestions'
  | 'notes'
  | 'story_performance'
  | 'hashtag_performance';

interface DashboardWidget {
  id: string;
  type: WidgetType;
  config: Record<string, unknown>;  // widget-specific settings
  position: { col: number; row: number };
  size: { colSpan: number; rowSpan: number };
}

interface DashboardLayout {
  id: string;
  userId: string;
  companyId: string;
  name: string;
  columns: 2 | 3 | 4;
  widgets: DashboardWidget[];
  updatedAt: string;
}

interface DashboardTask {
  id: string;
  companyId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  dueDate?: string;
  status: 'todo' | 'in_progress' | 'done';
  order: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
```

### UI Surfaces
- `/dashboard` — Complete redesign. Top bar: "Edit layout" toggle, preset selector, column count.
- Edit mode: widgets show drag handles, add-widget button opens widget picker modal.
- Widget picker: grid of available widget types with preview thumbnails.
- Each widget renders its own component from a `WidgetRegistry` map.

### Implementation Notes
- Use `@dnd-kit/core` + `@dnd-kit/sortable` for drag-and-drop.
- Layout serialized to Firestore at `workspaces/{wid}/users/{uid}/dashboardLayouts/{companyId}`.
- Default layout applied on first visit (can be "Manager View" preset).

---

## 7. Client Contract & Deliverable Tracker

### Why It Matters
Agency teams juggle multiple clients with different deliverable agreements.
Forgetting a client needs 12 Stories/month is a relationship killer.
This feature makes Social Butterflie the source of truth for what's owed.

### What to Build

| Capability | Details |
|---|---|
| **Contract Editor** | Per-company "Contract" or "Agreed Deliverables" panel. Fill out: X feed posts/week, Y stories/month, Z reels/month, etc. |
| **Deliverable Types** | Feed posts, Stories, Reels/Shorts, Carousels, Blog posts, Newsletters — each with its own count + period (weekly/monthly/quarterly). |
| **Live Progress Tracker** | Dashboard widget and dedicated company section showing: "12 Stories due this month — 7 published, 2 scheduled, 3 remaining." Progress bar with color states (green/yellow/red). |
| **Auto-Counting** | When a post/story is published that matches a deliverable type, the count auto-increments. No manual check-off needed. |
| **Period Rollover** | At the start of each new period (week/month), counters reset. Historical data preserved for reporting. |
| **Deadline Alerts** | Notification: "⚠️ 3 days left in the month and Company X still needs 4 more feed posts." Configurable warning thresholds (e.g., alert at 50% time elapsed with <50% delivered). |
| **Contract History** | Versioned contracts — when terms change, keep a record of previous agreements with effective dates. |
| **Client-Facing View** | Clients (with `client` role) see a simplified "Deliverables" page showing their progress without internal notes. |
| **Report Export** | "End of month" PDF/CSV report: what was agreed, what was delivered, with links to each published post. |

### Data Model

```typescript
type DeliverablePeriod = 'weekly' | 'monthly' | 'quarterly';
type DeliverableType =
  | 'feed_post'
  | 'story'
  | 'reel'
  | 'carousel'
  | 'short'
  | 'blog_post'
  | 'newsletter'
  | 'custom';

interface ContractDeliverable {
  id: string;
  type: DeliverableType;
  customLabel?: string;       // for 'custom' type
  count: number;              // e.g., 4
  period: DeliverablePeriod;  // e.g., 'weekly'
  platforms?: SocialProvider[];
  notes?: string;
}

interface CompanyContract {
  id: string;
  companyId: string;
  name: string;               // "Q1 2026 Agreement"
  effectiveFrom: string;
  effectiveTo?: string;
  deliverables: ContractDeliverable[];
  totalMonthlyValue?: number; // optional $ amount
  notes?: string;
  status: 'active' | 'expired' | 'draft';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface DeliverableProgress {
  companyId: string;
  contractId: string;
  deliverableId: string;
  periodStart: string;        // ISO date (start of week/month/quarter)
  periodEnd: string;
  target: number;
  completed: number;
  scheduled: number;
  linkedPostIds: string[];
  status: 'on_track' | 'at_risk' | 'behind' | 'complete';
}
```

### UI Surfaces
- `/companies/[companyId]` — New "Contract" tab alongside Profile, Members, Integrations.
- `/dashboard` — "Contract Tracker" widget showing all active companies' deliverable status at a glance.
- `/review` — When publishing, if it counts toward a deliverable, show a toast: "✓ Feed post 3/4 for this week."
- Notifications — "⚠️ Company X: 3 stories remaining, 4 days left."

---

## 8. Comment-Trigger DM Automations

### Why It Matters
"Comment X to get Y" is a massive engagement and lead-gen tactic on
Instagram and TikTok. Automating the DM follow-up turns comments into
conversions without manual labor.

### What to Build

| Capability | Details |
|---|---|
| **Automation Builder** | New `/automations` page (route already defined in blueprint). Visual builder: "When someone comments [trigger word] on [post], send them [DM template]." |
| **Trigger Keywords** | Case-insensitive keyword matching. Support multiple keywords per automation. E.g., "Spring", "SPRING", "spring" all trigger. |
| **DM Templates** | Rich message templates with variables: `{name}`, `{comment}`, `{post_link}`. Support text + one image/link. |
| **Rate Limiting** | Respect platform API limits. Queue DMs with configurable delay (e.g., send within 30s–5min of comment to look natural). |
| **Automation Dashboard** | List all automations, see triggered count, success/failure rate, toggle on/off. |
| **Post Selector** | Link automation to specific posts or "all posts in this company." |
| **Condition Chains** | (Phase 2) Multi-step: "If they comment Spring → DM template A. If they reply to DM → send template B." |
| **Analytics** | Track: triggers fired, DMs sent, DM open rate (if available), link clicks in DMs. |
| **Platform Support** | Instagram (via IG Messaging API), Facebook (Page Messaging), TikTok (when API allows). |

### Data Model

```typescript
interface CommentAutomation {
  id: string;
  companyId: string;
  name: string;
  enabled: boolean;
  triggerKeywords: string[];
  targetPostIds: string[];       // empty = all posts
  targetPlatforms: SocialProvider[];
  dmTemplate: {
    body: string;                // supports {name}, {comment}
    mediaRef?: string;           // optional image attachment
    linkUrl?: string;
  };
  rateLimitDelay: number;        // seconds between sends
  maxSendsPerHour: number;
  stats: {
    totalTriggered: number;
    totalSent: number;
    totalFailed: number;
  };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface AutomationExecution {
  id: string;
  automationId: string;
  commentId: string;
  commentAuthor: string;
  commentText: string;
  dmSentAt?: string;
  status: 'queued' | 'sent' | 'failed' | 'rate_limited';
  errorMessage?: string;
  platform: SocialProvider;
  createdAt: string;
}
```

### UI Surfaces
- `/automations` — Automation list with create/edit modal.
- Automation detail view — Stats dashboard, execution log, toggle switch.
- `/build` — When creating a post, option to "Attach automation" → quick-link to automation builder.

---

## 9. Canva Plugin / Export Integration

### Why It Matters
Canva is the #1 design tool for SMM teams. Being able to export straight
from Canva into Social Butterflie eliminates the download→upload→compose
workflow and saves significant time.

### What to Build

| Capability | Details |
|---|---|
| **Canva App (Publish Extension)** | Build a Canva App using the Canva Apps SDK. Appears in Canva's "Share/Publish" menu. Users authenticate with their Social Butterflie account and push designs directly. |
| **Design → Asset** | Export from Canva creates an asset in the company's asset library with auto-tagging (design dimensions, format, Canva design ID). |
| **Design → Post Draft** | One-click: "Send to Social Butterflie as new post." Creates a draft in `/build` with the image/video attached and caption field ready. |
| **Multi-Page Support** | Canva multi-page designs export as carousel slides or story slides depending on aspect ratio. |
| **Bidirectional Sync** | (Phase 2) Open a Social Butterflie asset back in Canva for editing. Track Canva design ID for round-trip. |
| **Team Templates** | Canva Brand Kit templates that map to company branding in Social Butterflie. |

### Technical Approach
- Register as a Canva App via [Canva Developers](https://www.canva.com/developers).
- Use Canva's "Publish" extension type — the SDK provides the exported image/video blob.
- Backend endpoint: `POST /api/canva/import` — receives file + metadata, stores in Firebase Storage, creates asset/post record.
- Auth: OAuth token exchange between Canva session and Social Butterflie user.

### Data Model

```typescript
interface CanvaImport {
  id: string;
  companyId: string;
  canvaDesignId: string;
  canvaDesignTitle: string;
  exportedFormat: 'png' | 'jpg' | 'mp4' | 'gif' | 'pdf';
  exportedPages: number;
  storagePath: string;
  assetId?: string;          // if saved to asset library
  postId?: string;           // if used to create a draft
  importedBy: string;
  importedAt: string;
}
```

---

## 10. Client Media Upload Portal

### Why It Matters
Clients constantly need to send photos, videos, and brand assets. Email
attachments are messy and get lost. A branded upload portal is professional
and keeps all media in one place.

### What to Build

| Capability | Details |
|---|---|
| **Shareable Upload Link** | Generate a unique, time-limited upload URL per company. No account or login required for the uploader. |
| **Upload-Only Access** | Uploaders can ONLY add files. They cannot view, download, or delete existing assets. No browse capability. |
| **Branded Upload Page** | The upload page shows the company name, logo, and brand colors. "Upload media for [Company Name]." |
| **Drag & Drop Zone** | Large drop zone supporting multi-file upload. Accepted formats: images (jpg, png, webp, heic), videos (mp4, mov), documents (pdf). |
| **Upload Metadata** | Uploader can add optional notes per file and tag files with categories (e.g., "Product shots", "Headshots", "Event photos"). |
| **Automatic Organization** | Uploaded files land in a dedicated "Client Uploads" folder in the company's asset library, tagged with upload date, uploader name (if provided), and link ID. |
| **Upload Notifications** | Team gets notified: "📁 New upload: 12 files added by client via upload link abc123." |
| **Link Management** | Dashboard to create, view, expire, and revoke upload links. Set file-count limits and expiration dates. |
| **Storage Quotas** | Per-company storage limits with usage meter. Warn at 80%, block at 100%. |

### Data Model

```typescript
interface UploadLink {
  id: string;
  companyId: string;
  token: string;               // unique URL token
  label?: string;              // "Q1 Product Shoot"
  createdBy: string;
  createdAt: string;
  expiresAt?: string;
  maxFiles?: number;
  maxSizeMb?: number;
  filesUploaded: number;
  status: 'active' | 'expired' | 'revoked';
}

interface ClientUpload {
  id: string;
  uploadLinkId: string;
  companyId: string;
  fileName: string;
  fileType: string;
  fileSizeMb: number;
  storagePath: string;
  downloadUrl: string;
  thumbnailUrl?: string;
  uploaderName?: string;
  uploaderNote?: string;
  tags: string[];
  createdAt: string;
}
```

### UI Surfaces
- `/companies/[companyId]` → "Upload Links" management section.
- `/upload/[token]` — Public route (outside `(app)` layout). Branded upload page. No auth required.
- `/assets` — "Client Uploads" filter shows files received via upload links.
- Notification on new uploads.

---

## 11. SEO & Hashtag Studio

### Why It Matters
Hashtags are still a primary discovery mechanism on Instagram, TikTok, and
LinkedIn. A dedicated studio for researching, managing, and optimizing
hashtags turns guesswork into strategy.

### What to Build

| Capability | Details |
|---|---|
| **Hashtag Manager** | Per-company library of saved hashtag groups. E.g., "Brand tags", "Industry tags", "Trending", "Location tags." |
| **Hashtag Groups** | Create named groups of hashtags. One-click insert into post composer. Groups have a max count indicator (e.g., "28/30 for Instagram"). |
| **Hashtag Research** | Search tool: type a keyword → see related hashtags, estimated post volume, competition level (API: RapidAPI hashtag endpoints or scraped IG data). |
| **AI Hashtag Suggestions** | Based on post caption/image, AI suggests relevant hashtags with rationale. "Your post mentions 'spring collection' — consider: #SpringFashion (2.1M posts), #NewArrivals (800K), …" |
| **Hashtag Performance Tracking** | Track which hashtag groups correlate with higher impressions/engagement over time. "Posts with Group A get 34% more reach than Group B." |
| **Banned/Blocked Hashtags** | Maintain a list of hashtags to never use (shadowban risks, off-brand terms). Warn in composer if a banned hashtag is detected. |
| **SEO Caption Optimizer** | AI-powered caption analysis: readability score, keyword density, CTA presence, emoji usage, length recommendation per platform. |
| **Alt Text Generator** | AI generates alt text for images (accessibility + SEO). Editable before publish. |
| **Platform-Specific Guidelines** | Show character limits, hashtag limits, and best practices per platform inline in the composer. |

### Data Model

```typescript
interface HashtagGroup {
  id: string;
  companyId: string;
  name: string;
  hashtags: string[];
  color?: string;
  notes?: string;
  performance?: {
    avgImpressions: number;
    avgEngagement: number;
    sampleSize: number;
  };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface HashtagResearchResult {
  hashtag: string;
  postCount: number;
  competitionLevel: 'low' | 'medium' | 'high';
  trending: boolean;
  relatedTags: string[];
}

interface BannedHashtag {
  id: string;
  companyId: string;
  hashtag: string;
  reason: string;
  addedBy: string;
  addedAt: string;
}

interface CaptionAnalysis {
  readabilityScore: number;     // 0-100
  keywordDensity: Record<string, number>;
  hasCta: boolean;
  emojiCount: number;
  characterCount: number;
  platformLimits: {
    platform: SocialProvider;
    maxChars: number;
    maxHashtags: number;
    isWithinLimits: boolean;
  }[];
  suggestions: string[];
}
```

### UI Surfaces
- `/studio/hashtags` (or `/hashtag-studio`) — Dedicated page for managing groups, research, and performance tracking.
- `/build` composer → "Hashtags" panel with group picker, AI suggestions, banned-tag warnings.
- `/build` composer → "SEO Score" badge showing caption quality score.
- `/analytics` → "Hashtag Performance" section correlating tags with reach.

---

## 12. Data Model Additions

All new interfaces should be added to [interfaces.ts](rebuild-app/src/types/interfaces.ts). Here's a summary of every new type to add:

### New Entity Kinds
Extend `EntityKind`:
```typescript
export type EntityKind =
  | 'post'
  | 'story'          // NEW
  | 'asset'
  | 'campaign'
  | 'connection'
  | 'report'
  | 'company'
  | 'studio_job'
  | 'automation'     // NEW
  | 'contract'       // NEW
  | 'upload_link'    // NEW
  | 'hashtag_group'; // NEW
```

### New Firestore Collections
| Collection Path | Purpose |
|---|---|
| `workspaces/{wid}/companies/{cid}/contracts/{contractId}` | Client contracts |
| `workspaces/{wid}/companies/{cid}/deliverableProgress/{dpId}` | Period-based delivery tracking |
| `workspaces/{wid}/companies/{cid}/comments/{commentId}` | Post/asset comments |
| `workspaces/{wid}/companies/{cid}/automations/{autoId}` | Comment-trigger automations |
| `workspaces/{wid}/companies/{cid}/automationExecutions/{execId}` | Automation run log |
| `workspaces/{wid}/companies/{cid}/hashtagGroups/{groupId}` | Saved hashtag groups |
| `workspaces/{wid}/companies/{cid}/bannedHashtags/{tagId}` | Blocked hashtags |
| `workspaces/{wid}/companies/{cid}/uploadLinks/{linkId}` | Client upload links |
| `workspaces/{wid}/companies/{cid}/clientUploads/{uploadId}` | Files from upload links |
| `workspaces/{wid}/notifications/{notifId}` | Global notification log |
| `workspaces/{wid}/users/{uid}/notificationPrefs/{prefId}` | Per-user notification settings |
| `workspaces/{wid}/users/{uid}/dashboardLayouts/{companyId}` | Custom dashboard layouts |
| `workspaces/{wid}/companies/{cid}/tasks/{taskId}` | Dashboard tasks |
| `workspaces/{wid}/companies/{cid}/quickReplyTemplates/{tplId}` | Inbox quick replies |
| `workspaces/{wid}/companies/{cid}/inboxLabels/{labelId}` | Inbox custom labels |
| `workspaces/{wid}/companies/{cid}/audienceActivity/{platformId}` | Best-time heatmap data |

---

## 13. Implementation Phases

### Phase A — Foundation & High-Impact (Weeks 1–6)
> These features have the highest daily-use impact and foundational dependencies.

| # | Feature | Est. Effort | Dependencies |
|---|---|---|---|
| A1 | **Notification System Overhaul** | 2 weeks | SendGrid + Twilio accounts, FCM setup |
| A2 | **Internal Messaging & Approval Comments** | 1.5 weeks | Firestore real-time listeners |
| A3 | **Client Contract & Deliverable Tracker** | 1.5 weeks | Post publish hooks |
| A4 | **Customizable Dashboard** | 1 week | `@dnd-kit` dependency |

### Phase B — Publishing Power (Weeks 7–12)
> Expand what users can publish and how intelligently.

| # | Feature | Est. Effort | Dependencies |
|---|---|---|---|
| B1 | **Stories Publishing Engine** | 2 weeks | Platform API story endpoints |
| B2 | **Post Optimization & Best-Time Engine** | 2 weeks | Platform Insights API data |
| B3 | **SEO & Hashtag Studio** | 1.5 weeks | Hashtag research API |
| B4 | **Unified Inbox Enhancements** | 0.5 weeks | Existing inbox page |

### Phase C — Ecosystem & Automation (Weeks 13–18)
> Extend the platform with integrations and advanced automation.

| # | Feature | Est. Effort | Dependencies |
|---|---|---|---|
| C1 | **Comment-Trigger DM Automations** | 2 weeks | IG Messaging API approval |
| C2 | **Client Media Upload Portal** | 1.5 weeks | Firebase Storage rules |
| C3 | **Canva Plugin** | 2 weeks | Canva Developer account + review |

### New Route Map

```
(app)/
  dashboard/           ← Customizable widget grid
  build/               ← Post + Story composer
  calendar/            ← Feed + Story scheduling
  review/              ← Approval queue with comments
  analytics/           ← + Stories tab, Best Times tab, Hashtag Performance
  inbox/               ← Enhanced with labels, assignments, quick replies
  automations/         ← Comment-trigger DM builder
  studio/
    hashtags/          ← Hashtag Studio
  companies/
    [companyId]/
      contract/        ← Contract & Deliverable editor
      uploads/         ← Upload link management
  settings/            ← Expanded notification matrix, quiet hours
  
(public)/
  upload/[token]/      ← Client upload portal (no auth)
```

### New Dependencies to Install

```
@dnd-kit/core          — Dashboard drag-and-drop
@dnd-kit/sortable      — Sortable widget grid
@dnd-kit/utilities     — DnD helpers
@sendgrid/mail         — Email notifications
twilio                 — SMS notifications
firebase-admin         — Server-side notifications (if not already)
```

---

## Summary Matrix

| Feature | New Route | Firestore Collections | External APIs | Priority |
|---|---|---|---|---|
| Stories Engine | — (extends `/build`) | stories subcollection | IG/FB/TT Story APIs | 🔴 High |
| Notifications | — (shell + `/settings`) | notifications, notifPrefs | SendGrid, Twilio, FCM | 🔴 High |
| Comments/Messaging | — (extends `/review`) | comments | — | 🔴 High |
| Best-Time Engine | — (extends `/build`, `/analytics`) | audienceActivity | Platform Insights | 🟡 Medium |
| Custom Dashboard | — (rewrites `/dashboard`) | dashboardLayouts, tasks | — | 🔴 High |
| Contract Tracker | `/companies/[id]/contract` | contracts, deliverableProgress | — | 🔴 High |
| DM Automations | `/automations` | automations, executions | IG Messaging API | 🟡 Medium |
| Canva Plugin | — (external app) | canvaImports | Canva Apps SDK | 🟡 Medium |
| Upload Portal | `/upload/[token]` | uploadLinks, clientUploads | — | 🟡 Medium |
| Hashtag Studio | `/studio/hashtags` | hashtagGroups, bannedHashtags | Hashtag research API | 🟡 Medium |

---

*This document should be reviewed alongside [PRODUCT_BLUEPRINT.md](../PRODUCT_BLUEPRINT.md) and
[MASTER_CONTEXT.md](MASTER_CONTEXT.md) to ensure alignment with the canonical stack and
existing phase gates.*
