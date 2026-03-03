/**
 * /api/social/publish — Publish content to a social platform.
 * 
 * Uses stored OAuth tokens from Firestore to call each platform's API.
 * Supports: Facebook, Instagram, YouTube, TikTok, Twitter/X, LinkedIn, Threads
 * 
 * Body: { workspaceId, companyId, provider, caption, mediaUrl?, scheduledAt?, postId? }
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  serverQueryDocs,
  serverSetDoc,
} from '@/lib/server/firebase-server';

// ── Get active connection for provider ──────────────────────────────────────

async function getConnection(workspaceId: string, companyId: string, provider: string) {
  const path = `workspaces/${workspaceId}/companies/${companyId}/connections`;
  const results = await serverQueryDocs(path, 'provider', '==', provider);
  const active = results.find((c) => c.status === 'active');
  if (!active) throw new Error(`No active ${provider} connection found. Connect ${provider} in Integrations first.`);
  return active;
}

// ── Platform publish functions ──────────────────────────────────────────────

async function publishFacebook(conn: Record<string, unknown>, caption: string, mediaUrl?: string, scheduledAt?: string) {
  const meta = (conn.meta || {}) as Record<string, unknown>;
  const pageId = meta.pageId as string || conn.externalAccountId as string;
  const token = conn.accessToken as string;
  const scheduledUnix = scheduledAt ? Math.floor(new Date(scheduledAt).getTime() / 1000) : null;

  if (mediaUrl) {
    // Photo post
    const form = new URLSearchParams();
    form.set('published', scheduledUnix ? 'false' : 'true');
    if (scheduledUnix) form.set('scheduled_publish_time', String(scheduledUnix));
    form.set('caption', caption);
    form.set('url', mediaUrl);
    form.set('access_token', token);
    const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/photos`, { method: 'POST', body: form }).then(r => r.json());
    if (res.error) throw new Error(`Facebook: ${res.error.message}`);
    return res.id || res.post_id;
  } else {
    // Text post
    const form = new URLSearchParams();
    form.set('message', caption);
    form.set('published', scheduledUnix ? 'false' : 'true');
    if (scheduledUnix) form.set('scheduled_publish_time', String(scheduledUnix));
    form.set('access_token', token);
    const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/feed`, { method: 'POST', body: form }).then(r => r.json());
    if (res.error) throw new Error(`Facebook: ${res.error.message}`);
    return res.id;
  }
}

async function publishInstagram(conn: Record<string, unknown>, caption: string, mediaUrl?: string) {
  const meta = (conn.meta || {}) as Record<string, unknown>;
  const igUserId = meta.igUserId as string || conn.externalAccountId as string;
  const token = conn.accessToken as string;

  if (!mediaUrl) throw new Error('Instagram requires a media URL (image or video).');

  // Detect media type
  const isVideo = /\.(mp4|mov|avi|webm)$/i.test(mediaUrl) || mediaUrl.includes('video');

  // 1. Create media container
  const containerBody: Record<string, string> = {
    caption,
    access_token: token,
  };
  if (isVideo) {
    containerBody.media_type = 'REELS';
    containerBody.video_url = mediaUrl;
  } else {
    containerBody.image_url = mediaUrl;
  }

  const containerRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(containerBody),
  }).then(r => r.json());

  if (containerRes.error) throw new Error(`Instagram container: ${containerRes.error.message}`);
  if (!containerRes.id) throw new Error('Instagram: Failed to create media container');

  // 2. For video, wait for processing
  if (isVideo) {
    let ready = false;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const statusRes = await fetch(
        `https://graph.facebook.com/v21.0/${containerRes.id}?fields=status_code&access_token=${token}`
      ).then(r => r.json());
      if (statusRes.status_code === 'FINISHED') { ready = true; break; }
      if (statusRes.status_code === 'ERROR') throw new Error('Instagram: Video processing failed');
    }
    if (!ready) throw new Error('Instagram: Video processing timed out');
  }

  // 3. Publish
  const pubRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: containerRes.id, access_token: token }),
  }).then(r => r.json());

  if (pubRes.error) throw new Error(`Instagram publish: ${pubRes.error.message}`);
  return pubRes.id;
}

async function publishYouTube(conn: Record<string, unknown>, caption: string, mediaUrl?: string, scheduledAt?: string) {
  const token = conn.accessToken as string;
  if (!mediaUrl) throw new Error('YouTube requires a video file URL.');

  // Download the video
  const mediaRes = await fetch(mediaUrl);
  if (!mediaRes.ok) throw new Error(`Cannot fetch video: ${mediaRes.status}`);
  const buffer = Buffer.from(await mediaRes.arrayBuffer());
  const mimeType = mediaRes.headers.get('content-type') || 'video/mp4';

  const metadata = {
    snippet: { title: caption.slice(0, 100) || 'Upload', description: caption },
    status: scheduledAt
      ? { privacyStatus: 'private', publishAt: new Date(scheduledAt).toISOString() }
      : { privacyStatus: 'public' },
  };

  const boundary = '---SBUploadBoundary';
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
    buffer,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const res = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  }).then(r => r.json());

  if (res.error) throw new Error(`YouTube: ${res.error.message}`);
  return res.id;
}

async function publishTikTok(conn: Record<string, unknown>, caption: string, mediaUrl?: string) {
  const token = conn.accessToken as string;
  if (!mediaUrl) throw new Error('TikTok requires a video URL.');

  const res = await fetch('https://open.tiktokapis.com/v2/post/publish/content/init/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      post_info: { title: caption.slice(0, 150), privacy_level: 'PUBLIC_TO_EVERYONE' },
      source_info: { source: 'PULL_FROM_URL', video_url: mediaUrl },
    }),
  }).then(r => r.json());

  if (res.error?.code) throw new Error(`TikTok: ${res.error.message}`);
  return res.data?.publish_id || 'submitted';
}

async function publishTwitter(conn: Record<string, unknown>, caption: string, mediaUrl?: string) {
  const token = conn.accessToken as string;

  // If media, upload it first
  let mediaId: string | undefined;
  if (mediaUrl) {
    // Twitter media upload requires v1.1 API — would need additional auth setup
    // For now, post text-only or with a link
  }

  const body: Record<string, unknown> = { text: caption };
  if (mediaId) body.media = { media_ids: [mediaId] };

  const res = await fetch('https://api.x.com/2/tweets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  }).then(r => r.json());

  if (res.errors) throw new Error(`Twitter: ${res.errors[0]?.message || JSON.stringify(res.errors)}`);
  return res.data?.id;
}

async function publishLinkedIn(conn: Record<string, unknown>, caption: string, mediaUrl?: string) {
  const token = conn.accessToken as string;
  const meta = (conn.meta || {}) as Record<string, unknown>;
  const personId = meta.sub as string || conn.externalAccountId as string;

  const body: Record<string, unknown> = {
    author: `urn:li:person:${personId}`,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: caption },
        shareMediaCategory: mediaUrl ? 'ARTICLE' : 'NONE',
        ...(mediaUrl ? {
          media: [{
            status: 'READY',
            originalUrl: mediaUrl,
          }],
        } : {}),
      },
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
  };

  const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(body),
  }).then(r => r.json());

  if (res.message) throw new Error(`LinkedIn: ${res.message}`);
  return res.id;
}

async function publishThreads(conn: Record<string, unknown>, caption: string, mediaUrl?: string) {
  const token = conn.accessToken as string;
  const userId = conn.externalAccountId as string;

  // 1. Create container
  const containerBody: Record<string, string> = {
    text: caption,
    access_token: token,
  };
  if (mediaUrl) {
    const isVideo = /\.(mp4|mov|avi|webm)$/i.test(mediaUrl);
    containerBody.media_type = isVideo ? 'VIDEO' : 'IMAGE';
    if (isVideo) containerBody.video_url = mediaUrl;
    else containerBody.image_url = mediaUrl;
  } else {
    containerBody.media_type = 'TEXT';
  }

  const containerRes = await fetch(`https://graph.threads.net/v1.0/${userId}/threads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(containerBody),
  }).then(r => r.json());

  if (containerRes.error) throw new Error(`Threads container: ${containerRes.error.message}`);

  // 2. Publish
  const pubRes = await fetch(`https://graph.threads.net/v1.0/${userId}/threads_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: containerRes.id, access_token: token }),
  }).then(r => r.json());

  if (pubRes.error) throw new Error(`Threads publish: ${pubRes.error.message}`);
  return pubRes.id;
}

// ── Route handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workspaceId, companyId, provider, caption, mediaUrl, scheduledAt, postId } = body;

    if (!workspaceId || !companyId || !provider) {
      return NextResponse.json({ error: 'workspaceId, companyId, and provider are required' }, { status: 400 });
    }

    const conn = await getConnection(workspaceId, companyId, provider);

    let externalId: string | undefined;

    switch (provider) {
      case 'facebook':
        externalId = await publishFacebook(conn, caption || '', mediaUrl, scheduledAt);
        break;
      case 'instagram':
        externalId = await publishInstagram(conn, caption || '', mediaUrl);
        break;
      case 'youtube':
        externalId = await publishYouTube(conn, caption || '', mediaUrl, scheduledAt);
        break;
      case 'tiktok':
        externalId = await publishTikTok(conn, caption || '', mediaUrl);
        break;
      case 'twitter':
        externalId = await publishTwitter(conn, caption || '', mediaUrl);
        break;
      case 'linkedin':
        externalId = await publishLinkedIn(conn, caption || '', mediaUrl);
        break;
      case 'threads':
        externalId = await publishThreads(conn, caption || '', mediaUrl);
        break;
      default:
        return NextResponse.json({ error: `Unsupported provider: ${provider}` }, { status: 400 });
    }

    // Update post status in Firestore if postId provided
    if (postId) {
      const postPath = `workspaces/${workspaceId}/companies/${companyId}/posts/${postId}`;
      await serverSetDoc(postPath, {
        status: 'published',
        publishedAt: new Date().toISOString(),
        externalId,
        publishedProvider: provider,
      });
    }

    return NextResponse.json({ success: true, externalId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Publish failed';
    console.error('[social/publish]', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
