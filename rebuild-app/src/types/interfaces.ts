export type EntityKind =
  | 'post'
  | 'story'
  | 'asset'
  | 'campaign'
  | 'connection'
  | 'report'
  | 'company'
  | 'studio_job'
  | 'automation'
  | 'contract'
  | 'upload_link'
  | 'hashtag_group';

export type Role = 'admin' | 'editor' | 'viewer' | 'client';

export interface AppContext {
  workspaceId: string;
  userId: string;
  role: Role;
  activeCompanyId: string | null;
  companyGateSeenInSession: boolean;
}

export interface InspectorEntityPayload {
  kind: EntityKind;
  id: string;
  title: string;
  subtitle?: string;
  status?: string;
  summary?: string;
  versionHistory: string[];
  approvals: string[];
  auditLog: string[];
  meta?: Record<string, string | number | boolean | null>;
}

export interface GlobalSearchResult {
  id: string;
  kind: EntityKind;
  title: string;
  subtitle?: string;
  href: string;
}

export interface CompanySectionState {
  identity: {
    legalName: string;
    tagline: string;
    mission: string;
    mascot?: string;
    primaryColors: string[];
  };
  voice: {
    tone: string;
    dos: string[];
    donts: string[];
    ctaStyle: string;
    examples: string[];
  };
  visual: {
    styleKeywords: string[];
    typography: string;
    layoutDirection: string;
    moodReferences: string[];
  };
  audience: {
    primaryPersona: string;
    geographies: string[];
    keyObjections: string[];
    desiredPerception: string;
  };
  content: {
    pillars: string[];
    formats: string[];
    cadence: string;
    goals: string[];
    prohibitedTopics: string[];
  };
}

export interface CompanyAssetRef {
  id: string;
  type: 'logo' | 'mascot' | 'banner' | 'reference';
  storagePath: string;
  downloadUrl: string;
  thumbnailUrl?: string;
  tags: string[];
  uploadedBy: string;
  createdAt: string;
}

export interface CompanyVersionSnapshot {
  id: string;
  companyId: string;
  createdBy: string;
  createdAt: string;
  notes?: string;
}

export interface IntakeSubmission {
  id: string;
  companyId: string;
  submittedBy: string;
  step: number;
  progress: number;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyProfile {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  status: 'draft' | 'active' | 'archived';
  completionScore: number;
  coverAssetUrl?: string;
  branding: {
    primary: string;
    secondary?: string;
    accent?: string;
  };
  memberCount: number;
  sections: CompanySectionState;
  promptPacks: Record<string, string[]>;
  aiContextCompiled?: string;
  assets: CompanyAssetRef[];
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyMember {
  id: string;
  workspaceId?: string;
  companyId: string;
  email: string;
  uid?: string;
  name?: string;
  avatarUrl?: string;
  role: Role;
  status: 'pending' | 'active' | 'revoked';
  invitedBy: string;
  invitedAt: string;
  joinedAt?: string;
  inviteToken?: string;
}

export interface CompanyInvite {
  id: string;
  companyId: string;
  email: string;
  role: Role;
  token: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  expiresAt: string;
  createdAt: string;
  createdBy: string;
  acceptedByUid?: string;
}

export interface CompanyAnalyticsSnapshot {
  companyId: string;
  period: string;
  impressions: number;
  engagements: number;
  clicks: number;
  postsScheduled: number;
  postsPublished: number;
  updatedAt: string;
  /** Per-platform breakdown from real API sync */
  channelBreakdown?: Array<{ name: string; impressions: number; engagements: number; followers: number }>;
  syncedAt?: string;
}

export interface CompanyThemeTokens {
  primary: string;
  secondary: string;
  accent: string;
  glow: string;
  glowSoft: string;
  border: string;
  panelTint: string;
}

export interface CompiledContextPayload {
  companyId: string;
  versionId?: string;
  compiledPrompt: string;
  negativePrompt: string;
  contextWeights: {
    identity: number;
    voice: number;
    visual: number;
    audience: number;
    content: number;
  };
}

export interface GenerationJob {
  id: string;
  workspaceId: string;
  companyId: string;
  requestedBy: string;
  model: 'nano-banana-pro' | 'kling-3';
  mode: 'image' | 'video';
  promptRaw: string;
  promptCompiled: string;
  negativePrompt?: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'blocked';
  progress: number;
  outputRefs: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SafetyEvaluation {
  id: string;
  jobId: string;
  stage: 'pre' | 'post';
  result: 'allow' | 'warn' | 'block';
  reasons: string[];
  createdAt: string;
}

export interface UsageLedgerEvent {
  id: string;
  workspaceId: string;
  jobId: string;
  unit: 'image_generation' | 'video_generation';
  amount: number;
  createdAt: string;
}

/* ═══════════════════════════════════════════════════════════════════════════
   FEATURE EXPANSION — New types for Stories, Notifications, Contracts,
   Automations, Upload Portal, Hashtag Studio, Custom Dashboard
   ═══════════════════════════════════════════════════════════════════════════ */

// ── Stories ────────────────────────────────────────────────────────────────

export interface StoryOverlay {
  type: 'text' | 'sticker' | 'poll' | 'quiz' | 'link' | 'music' | 'mention';
  payload: Record<string, unknown>;
  position: { x: number; y: number };
  size?: { w: number; h: number };
}

export interface StorySlide {
  id: string;
  mediaRef: string;
  mediaType: 'image' | 'video';
  duration?: number;
  overlays: StoryOverlay[];
  order: number;
}

export interface StoryPost {
  id: string;
  companyId: string;
  type: 'story';
  platforms: string[];
  slides: StorySlide[];
  templateId?: string;
  status: 'draft' | 'in_review' | 'scheduled' | 'published' | 'expired';
  scheduledFor?: string;
  publishedAt?: string;
  expiresAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ── Notifications ──────────────────────────────────────────────────────────

export type NotificationChannel = 'email' | 'sms' | 'push' | 'in_app' | 'slack';

export type NotificationEventType =
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
  | 'approval_requested'
  | 'upload_received';

export interface NotificationPreference {
  userId: string;
  companyId?: string;
  event: NotificationEventType;
  channels: NotificationChannel[];
  enabled: boolean;
}

export interface Notification {
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

export interface QuietHours {
  userId: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
  timezone: string;
}

// ── Internal Messaging & Approval Comments ─────────────────────────────────

export interface PostComment {
  id: string;
  postId: string;
  companyId: string;
  parentId?: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string;
  body: string;
  mentions: string[];
  visibility: 'internal' | 'client';
  annotation?: {
    mediaRef: string;
    x: number;
    y: number;
  };
  resolved: boolean;
  resolvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Post Optimization & Best-Time Engine ───────────────────────────────────

export interface AudienceActivityData {
  companyId: string;
  platform: string;
  heatmap: number[][];
  sampleSize: number;
  lastSynced: string;
}

export interface PostTimeSuggestion {
  platform: string;
  suggestedAt: string;
  confidence: number;
  reason: string;
}

export interface ABTimeTest {
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

// ── Inbox Enhancements ─────────────────────────────────────────────────────

export interface InboxAssignment {
  messageId: string;
  assignedTo: string;
  assignedBy: string;
  assignedAt: string;
  status: 'open' | 'in_progress' | 'closed';
}

export interface InboxLabel {
  id: string;
  companyId: string;
  name: string;
  color: string;
}

export interface QuickReplyTemplate {
  id: string;
  companyId: string;
  name: string;
  body: string;
  platforms: string[];
  createdBy: string;
}

// ── Customizable Dashboard ─────────────────────────────────────────────────

export type WidgetType =
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

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  config: Record<string, unknown>;
  position: { col: number; row: number };
  size: { colSpan: number; rowSpan: number };
}

export interface DashboardLayout {
  id: string;
  userId: string;
  companyId: string;
  name: string;
  columns: 2 | 3 | 4;
  widgets: DashboardWidget[];
  updatedAt: string;
}

export interface DashboardTask {
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

// ── Client Contract & Deliverable Tracker ──────────────────────────────────

export type DeliverablePeriod = 'weekly' | 'monthly' | 'quarterly';

export type DeliverableType =
  | 'feed_post'
  | 'story'
  | 'reel'
  | 'carousel'
  | 'short'
  | 'blog_post'
  | 'newsletter'
  | 'custom';

export interface ContractDeliverable {
  id: string;
  type: DeliverableType;
  customLabel?: string;
  count: number;
  period: DeliverablePeriod;
  platforms?: string[];
  notes?: string;
}

export interface CompanyContract {
  id: string;
  companyId: string;
  name: string;
  effectiveFrom: string;
  effectiveTo?: string;
  deliverables: ContractDeliverable[];
  totalMonthlyValue?: number;
  notes?: string;
  status: 'active' | 'expired' | 'draft';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeliverableProgress {
  companyId: string;
  contractId: string;
  deliverableId: string;
  periodStart: string;
  periodEnd: string;
  target: number;
  completed: number;
  scheduled: number;
  linkedPostIds: string[];
  status: 'on_track' | 'at_risk' | 'behind' | 'complete';
}

// ── Comment-Trigger DM Automations ─────────────────────────────────────────

export interface CommentAutomation {
  id: string;
  companyId: string;
  name: string;
  status: 'active' | 'paused' | 'draft';
  trigger: {
    type: 'comment_keyword' | 'comment_any' | 'story_mention' | 'dm_keyword';
    keywords: string[];
    platforms: string[];
    postFilter?: 'all' | 'specific_post';
    postId?: string;
  };
  action: {
    type: 'send_dm' | 'reply_comment' | 'add_label' | 'notify_team';
    message: string;
    delay?: number;
    linkUrl?: string;
    mediaRef?: string;
  };
  rateLimitDelay: number;
  maxSendsPerHour: number;
  stats: {
    triggered: number;
    sent: number;
    failed: number;
  };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationExecution {
  id: string;
  automationId: string;
  commentId: string;
  commentAuthor: string;
  commentText: string;
  dmSentAt?: string;
  status: 'queued' | 'sent' | 'failed' | 'rate_limited';
  errorMessage?: string;
  platform: string;
  createdAt: string;
}

// ── Canva Integration ──────────────────────────────────────────────────────

export interface CanvaImport {
  id: string;
  companyId: string;
  canvaDesignId: string;
  canvaDesignTitle: string;
  exportedFormat: 'png' | 'jpg' | 'mp4' | 'gif' | 'pdf';
  exportedPages: number;
  storagePath: string;
  assetId?: string;
  postId?: string;
  importedBy: string;
  importedAt: string;
}

// ── Client Media Upload Portal ─────────────────────────────────────────────

export interface UploadLink {
  id: string;
  companyId: string;
  token: string;
  label?: string;
  createdBy: string;
  createdAt: string;
  expiresAt?: string;
  maxFiles?: number;
  maxSizeMb?: number;
  filesUploaded: number;
  status: 'active' | 'expired' | 'revoked';
}

export interface ClientUpload {
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

// ── SEO & Hashtag Studio ───────────────────────────────────────────────────

export interface HashtagGroup {
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

export interface HashtagResearchResult {
  hashtag: string;
  postCount: number;
  competitionLevel: 'low' | 'medium' | 'high';
  trending: boolean;
  relatedTags: string[];
}

export interface BannedHashtag {
  id: string;
  companyId: string;
  hashtag: string;
  reason: string;
  addedBy: string;
  addedAt: string;
}

export interface CaptionAnalysis {
  readabilityScore: number;
  keywordDensity: Record<string, number>;
  hasCta: boolean;
  emojiCount: number;
  characterCount: number;
  platformLimits: {
    platform: string;
    maxChars: number;
    maxHashtags: number;
    isWithinLimits: boolean;
  }[];
  suggestions: string[];
}

