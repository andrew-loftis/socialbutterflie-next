/**
 * /api/social/analytics — Fetch analytics from social platforms.
 * 
 * Queries each platform's Insights/Analytics API using stored tokens,
 * then writes aggregated data to Firestore for the dashboard to consume.
 * 
 * GET: ?workspaceId=...&companyId=...&provider=...&period=current-month
 * POST: Sync all connected platforms at once
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  serverQueryDocs,
  serverSetDoc,
} from '@/lib/server/firebase-server';

// ── Get connection ──────────────────────────────────────────────────────────

async function getConnection(workspaceId: string, companyId: string, provider: string) {
  const path = `workspaces/${workspaceId}/companies/${companyId}/connections`;
  const results = await serverQueryDocs(path, 'provider', '==', provider);
  return results.find((c) => c.status === 'active') || null;
}

async function getAllConnections(workspaceId: string, companyId: string) {
  const path = `workspaces/${workspaceId}/companies/${companyId}/connections`;
  const results = await serverQueryDocs(path, 'status', '==', 'active');
  return results;
}

// ── Platform analytics fetchers ─────────────────────────────────────────────

async function fetchFacebookInsights(conn: Record<string, unknown>) {
  const meta = (conn.meta || {}) as Record<string, unknown>;
  const pageId = meta.pageId as string || conn.externalAccountId as string;
  const token = conn.accessToken as string;

  try {
    // Page insights — last 28 days
    const insightsRes = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}/insights?metric=page_impressions,page_engaged_users,page_post_engagements,page_views_total&period=days_28&access_token=${token}`
    ).then(r => r.json());

    const metrics: Record<string, number> = {};
    for (const entry of (insightsRes.data || [])) {
      const value = entry.values?.[entry.values.length - 1]?.value || 0;
      metrics[entry.name] = typeof value === 'number' ? value : 0;
    }

    // Page followers
    const pageRes = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}?fields=followers_count,fan_count&access_token=${token}`
    ).then(r => r.json()).catch(() => ({}));

    return {
      provider: 'facebook',
      impressions: metrics.page_impressions || 0,
      engagements: metrics.page_post_engagements || metrics.page_engaged_users || 0,
      followers: pageRes.followers_count || pageRes.fan_count || 0,
      pageViews: metrics.page_views_total || 0,
      raw: metrics,
    };
  } catch (e) {
    return { provider: 'facebook', error: (e as Error).message, impressions: 0, engagements: 0 };
  }
}

async function fetchInstagramInsights(conn: Record<string, unknown>) {
  const meta = (conn.meta || {}) as Record<string, unknown>;
  const igUserId = meta.igUserId as string || conn.externalAccountId as string;
  const token = conn.accessToken as string;

  try {
    // Account-level insights — last 28 days
    const insightsRes = await fetch(
      `https://graph.facebook.com/v21.0/${igUserId}/insights?metric=impressions,reach,profile_views,follower_count&period=days_28&access_token=${token}`
    ).then(r => r.json());

    const metrics: Record<string, number> = {};
    for (const entry of (insightsRes.data || [])) {
      const value = entry.values?.[entry.values.length - 1]?.value || 0;
      metrics[entry.name] = typeof value === 'number' ? value : 0;
    }

    // Recent media insights
    const mediaRes = await fetch(
      `https://graph.facebook.com/v21.0/${igUserId}/media?fields=id,timestamp,like_count,comments_count&limit=25&access_token=${token}`
    ).then(r => r.json()).catch(() => ({ data: [] }));

    let totalLikes = 0;
    let totalComments = 0;
    for (const post of (mediaRes.data || [])) {
      totalLikes += post.like_count || 0;
      totalComments += post.comments_count || 0;
    }

    return {
      provider: 'instagram',
      impressions: metrics.impressions || 0,
      reach: metrics.reach || 0,
      profileViews: metrics.profile_views || 0,
      followers: metrics.follower_count || 0,
      engagements: totalLikes + totalComments,
      likes: totalLikes,
      comments: totalComments,
      recentPosts: (mediaRes.data || []).length,
    };
  } catch (e) {
    return { provider: 'instagram', error: (e as Error).message, impressions: 0, engagements: 0 };
  }
}

async function fetchYouTubeInsights(conn: Record<string, unknown>) {
  const token = conn.accessToken as string;

  try {
    // Channel statistics
    const channelRes = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&mine=true',
      { headers: { Authorization: `Bearer ${token}` } }
    ).then(r => r.json());

    const channel = channelRes.items?.[0];
    const stats = channel?.statistics || {};

    // Recent videos
    const videosRes = await fetch(
      'https://www.googleapis.com/youtube/v3/search?part=snippet&forMine=true&type=video&maxResults=10&order=date',
      { headers: { Authorization: `Bearer ${token}` } }
    ).then(r => r.json()).catch(() => ({ items: [] }));

    return {
      provider: 'youtube',
      subscribers: Number(stats.subscriberCount || 0),
      totalViews: Number(stats.viewCount || 0),
      videoCount: Number(stats.videoCount || 0),
      impressions: Number(stats.viewCount || 0),
      engagements: Number(stats.videoCount || 0),
      recentVideos: (videosRes.items || []).length,
    };
  } catch (e) {
    return { provider: 'youtube', error: (e as Error).message, impressions: 0, engagements: 0 };
  }
}

async function fetchTikTokInsights(conn: Record<string, unknown>) {
  const token = conn.accessToken as string;

  try {
    const userRes = await fetch(
      'https://open.tiktokapis.com/v2/user/info/?fields=follower_count,following_count,likes_count,video_count',
      { headers: { Authorization: `Bearer ${token}` } }
    ).then(r => r.json());

    const user = userRes.data?.user || {};

    return {
      provider: 'tiktok',
      followers: user.follower_count || 0,
      following: user.following_count || 0,
      likes: user.likes_count || 0,
      videoCount: user.video_count || 0,
      impressions: user.likes_count || 0,
      engagements: user.likes_count || 0,
    };
  } catch (e) {
    return { provider: 'tiktok', error: (e as Error).message, impressions: 0, engagements: 0 };
  }
}

async function fetchTwitterInsights(conn: Record<string, unknown>) {
  const token = conn.accessToken as string;

  try {
    const userRes = await fetch(
      'https://api.x.com/2/users/me?user.fields=public_metrics',
      { headers: { Authorization: `Bearer ${token}` } }
    ).then(r => r.json());

    const metrics = userRes.data?.public_metrics || {};

    return {
      provider: 'twitter',
      followers: metrics.followers_count || 0,
      following: metrics.following_count || 0,
      tweets: metrics.tweet_count || 0,
      listed: metrics.listed_count || 0,
      impressions: metrics.followers_count || 0,
      engagements: metrics.tweet_count || 0,
    };
  } catch (e) {
    return { provider: 'twitter', error: (e as Error).message, impressions: 0, engagements: 0 };
  }
}

async function fetchLinkedInInsights(conn: Record<string, unknown>) {
  const token = conn.accessToken as string;

  try {
    const userRes = await fetch(
      'https://api.linkedin.com/v2/userinfo',
      { headers: { Authorization: `Bearer ${token}` } }
    ).then(r => r.json());

    return {
      provider: 'linkedin',
      name: userRes.name || '',
      email: userRes.email || '',
      impressions: 0,
      engagements: 0,
      note: 'LinkedIn analytics require Organization access token for detailed metrics',
    };
  } catch (e) {
    return { provider: 'linkedin', error: (e as Error).message, impressions: 0, engagements: 0 };
  }
}

async function fetchThreadsInsights(conn: Record<string, unknown>) {
  const token = conn.accessToken as string;
  const userId = conn.externalAccountId as string;

  try {
    const insightsRes = await fetch(
      `https://graph.threads.net/v1.0/${userId}/threads_insights?metric=views,likes,replies,reposts,quotes&access_token=${token}`
    ).then(r => r.json());

    const metrics: Record<string, number> = {};
    for (const entry of (insightsRes.data || [])) {
      metrics[entry.name] = entry.total_value?.value || 0;
    }

    return {
      provider: 'threads',
      views: metrics.views || 0,
      likes: metrics.likes || 0,
      replies: metrics.replies || 0,
      reposts: metrics.reposts || 0,
      impressions: metrics.views || 0,
      engagements: (metrics.likes || 0) + (metrics.replies || 0) + (metrics.reposts || 0),
    };
  } catch (e) {
    return { provider: 'threads', error: (e as Error).message, impressions: 0, engagements: 0 };
  }
}

// ── Fetcher dispatch ────────────────────────────────────────────────────────

const FETCHERS: Record<string, (conn: Record<string, unknown>) => Promise<Record<string, unknown>>> = {
  facebook: fetchFacebookInsights,
  instagram: fetchInstagramInsights,
  youtube: fetchYouTubeInsights,
  tiktok: fetchTikTokInsights,
  twitter: fetchTwitterInsights,
  linkedin: fetchLinkedInInsights,
  threads: fetchThreadsInsights,
};

// ── GET: Fetch for single provider ──────────────────────────────────────────

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const workspaceId = url.searchParams.get('workspaceId');
  const companyId = url.searchParams.get('companyId');
  const provider = url.searchParams.get('provider');

  if (!workspaceId || !companyId) {
    return NextResponse.json({ error: 'workspaceId and companyId required' }, { status: 400 });
  }

  try {
    if (provider) {
      // Single provider
      const conn = await getConnection(workspaceId, companyId, provider);
      if (!conn) {
        return NextResponse.json({ error: `No ${provider} connection found` }, { status: 404 });
      }
      const fetcher = FETCHERS[provider];
      if (!fetcher) {
        return NextResponse.json({ error: `Analytics not supported for ${provider}` }, { status: 400 });
      }
      const data = await fetcher(conn);
      return NextResponse.json({ data });
    }

    // All providers
    const connections = await getAllConnections(workspaceId, companyId);
    const results: Record<string, unknown>[] = [];
    for (const conn of connections) {
      const p = conn.provider as string;
      const fetcher = FETCHERS[p];
      if (fetcher) {
        const data = await fetcher(conn);
        results.push(data);
      }
    }

    return NextResponse.json({ data: results });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// ── POST: Sync all and save to Firestore analytics subcollection ────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workspaceId, companyId } = body;

    if (!workspaceId || !companyId) {
      return NextResponse.json({ error: 'workspaceId and companyId required' }, { status: 400 });
    }

    const connections = await getAllConnections(workspaceId, companyId);
    const platformData: Record<string, unknown>[] = [];
    let totalImpressions = 0;
    let totalEngagements = 0;
    let totalFollowers = 0;

    for (const conn of connections) {
      const p = conn.provider as string;
      const fetcher = FETCHERS[p];
      if (!fetcher) continue;
      const data = await fetcher(conn);
      platformData.push(data);
      totalImpressions += (data.impressions as number) || 0;
      totalEngagements += (data.engagements as number) || 0;
      totalFollowers += (data.followers as number) || 0;
    }

    // Save aggregated analytics to Firestore
    const analyticsPath = `workspaces/${workspaceId}/companies/${companyId}/analytics/current-month`;
    await serverSetDoc(analyticsPath, {
      period: 'current-month',
      impressions: totalImpressions,
      engagements: totalEngagements,
      followers: totalFollowers,
      engagementRate: totalImpressions > 0 ? Math.round((totalEngagements / totalImpressions) * 10000) / 100 : 0,
      platforms: platformData,
      postsPublished: 0, // Will be calculated from posts collection separately
      postsScheduled: 0,
      clicks: 0,
      syncedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      platforms: platformData.length,
      totalImpressions,
      totalEngagements,
      totalFollowers,
      data: platformData,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
