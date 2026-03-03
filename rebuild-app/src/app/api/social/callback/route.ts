/**
 * /api/social/callback — OAuth callback handler.
 * 
 * Receives the authorization code from the platform, exchanges it for tokens,
 * resolves account metadata (page IDs, usernames, etc.), and stores the
 * connection in Firestore under the company.
 * 
 * After success, redirects to /integrations with a success toast.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  serverAddDoc,
  serverQueryDocs,
  serverDeleteDoc,
} from '@/lib/server/firebase-server';

// ── State decoding ──────────────────────────────────────────────────────────

function decodeState(stateValue: string | null): Record<string, string> | null {
  if (!stateValue) return null;
  try {
    return JSON.parse(Buffer.from(stateValue, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

// ── Token exchange helpers per platform ─────────────────────────────────────

async function handleFacebookCallback(code: string, state: Record<string, string>) {
  const appId = process.env.FB_APP_ID!;
  const appSecret = process.env.FB_APP_SECRET!;
  const redirectUri = process.env.FB_REDIRECT_URI || `${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/social/callback`;

  // 1. Exchange code for short-lived token
  const tokenUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token');
  tokenUrl.searchParams.set('client_id', appId);
  tokenUrl.searchParams.set('client_secret', appSecret);
  tokenUrl.searchParams.set('redirect_uri', redirectUri);
  tokenUrl.searchParams.set('code', code);
  const tokenRes = await fetch(tokenUrl).then(r => r.json());
  if (!tokenRes.access_token) throw new Error('Facebook token exchange failed: ' + JSON.stringify(tokenRes));

  // 2. Exchange for long-lived token
  const longUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token');
  longUrl.searchParams.set('grant_type', 'fb_exchange_token');
  longUrl.searchParams.set('client_id', appId);
  longUrl.searchParams.set('client_secret', appSecret);
  longUrl.searchParams.set('fb_exchange_token', tokenRes.access_token);
  const longRes = await fetch(longUrl).then(r => r.json());
  const userToken = longRes.access_token || tokenRes.access_token;

  // 3. Get user's Pages
  const pagesRes = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?fields=name,access_token,id&access_token=${userToken}`
  ).then(r => r.json());
  const pages = pagesRes.data || [];

  // 4. Resolve Instagram Business Account from first page
  let igUserId: string | null = null;
  let pageName = 'Facebook Page';
  let pageId = '';
  let pageToken = userToken;

  for (const page of pages) {
    const igRes = await fetch(
      `https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account{id,username,profile_picture_url}&access_token=${userToken}`
    ).then(r => r.json());
    if (igRes.instagram_business_account?.id) {
      igUserId = igRes.instagram_business_account.id;
      pageId = page.id;
      pageToken = page.access_token;
      pageName = page.name || 'Facebook Page';
      break;
    }
  }

  // If no IG business found, still save FB page connection
  if (!igUserId && pages.length > 0) {
    pageId = pages[0].id;
    pageToken = pages[0].access_token;
    pageName = pages[0].name || 'Facebook Page';
  }

  const connections = [];

  // Save Facebook connection
  connections.push({
    companyId: state.companyId,
    provider: 'facebook',
    label: pageName,
    accountName: pageName,
    externalAccountId: pageId,
    accessToken: pageToken,
    refreshToken: '',
    expiresAt: null, // Long-lived tokens last ~60 days
    meta: { pageId, userToken, igUserId },
    connectedBy: state.userId,
    connectedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'active',
  });

  // If IG business found, save Instagram connection too
  if (igUserId) {
    const igProfile = await fetch(
      `https://graph.facebook.com/v21.0/${igUserId}?fields=username,profile_picture_url,followers_count&access_token=${pageToken}`
    ).then(r => r.json()).catch(() => ({}));

    connections.push({
      companyId: state.companyId,
      provider: 'instagram',
      label: igProfile.username ? `@${igProfile.username}` : 'Instagram Business',
      accountName: igProfile.username || 'Instagram',
      externalAccountId: igUserId,
      accessToken: pageToken,
      refreshToken: '',
      expiresAt: null,
      meta: {
        igUserId,
        pageId,
        username: igProfile.username,
        profilePicture: igProfile.profile_picture_url,
        followers: igProfile.followers_count,
      },
      connectedBy: state.userId,
      connectedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
    });
  }

  return connections;
}

async function handleYouTubeCallback(code: string, state: Record<string, string>) {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/social/callback`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code,
    }),
  }).then(r => r.json());

  if (!tokenRes.access_token) throw new Error('YouTube token exchange failed: ' + JSON.stringify(tokenRes));

  // Get channel info
  const channelRes = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true`,
    { headers: { Authorization: `Bearer ${tokenRes.access_token}` } }
  ).then(r => r.json()).catch(() => ({ items: [] }));

  const channel = channelRes.items?.[0];
  const channelName = channel?.snippet?.title || 'YouTube Channel';
  const channelId = channel?.id || '';

  return [{
    companyId: state.companyId,
    provider: 'youtube',
    label: channelName,
    accountName: channelName,
    externalAccountId: channelId,
    accessToken: tokenRes.access_token,
    refreshToken: tokenRes.refresh_token || '',
    expiresAt: tokenRes.expires_in ? Date.now() + tokenRes.expires_in * 1000 : null,
    meta: {
      channelId,
      subscriberCount: channel?.statistics?.subscriberCount,
      thumbnail: channel?.snippet?.thumbnails?.default?.url,
    },
    connectedBy: state.userId,
    connectedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'active',
  }];
}

async function handleTikTokCallback(code: string, state: Record<string, string>) {
  const clientKey = process.env.TIKTOK_CLIENT_KEY!;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET!;
  const redirectUri = process.env.TIKTOK_REDIRECT_URI || `${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/social/callback`;

  const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  }).then(r => r.json());

  const accessToken = tokenRes.access_token || tokenRes.data?.access_token;
  if (!accessToken) throw new Error('TikTok token exchange failed: ' + JSON.stringify(tokenRes));

  // Get user info
  const userRes = await fetch(
    'https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,follower_count',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  ).then(r => r.json()).catch(() => ({ data: { user: {} } }));

  const user = userRes.data?.user || {};

  return [{
    companyId: state.companyId,
    provider: 'tiktok',
    label: user.display_name || 'TikTok',
    accountName: user.display_name || 'TikTok',
    externalAccountId: tokenRes.open_id || tokenRes.data?.open_id || '',
    accessToken,
    refreshToken: tokenRes.refresh_token || tokenRes.data?.refresh_token || '',
    expiresAt: tokenRes.expires_in ? Date.now() + tokenRes.expires_in * 1000 : null,
    meta: {
      openId: tokenRes.open_id || tokenRes.data?.open_id,
      avatar: user.avatar_url,
      followers: user.follower_count,
    },
    connectedBy: state.userId,
    connectedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'active',
  }];
}

async function handleTwitterCallback(code: string, state: Record<string, string>) {
  const clientId = process.env.TWITTER_CLIENT_ID!;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET || '';
  const redirectUri = process.env.TWITTER_REDIRECT_URI || `${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/social/callback`;

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const tokenRes = await fetch('https://api.x.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code_verifier: 'challenge', // Must match code_challenge from connect
    }),
  }).then(r => r.json());

  if (!tokenRes.access_token) throw new Error('Twitter token exchange failed: ' + JSON.stringify(tokenRes));

  const userRes = await fetch('https://api.x.com/2/users/me?user.fields=profile_image_url,public_metrics', {
    headers: { Authorization: `Bearer ${tokenRes.access_token}` },
  }).then(r => r.json()).catch(() => ({ data: {} }));

  const twitterUser = userRes.data || {};

  return [{
    companyId: state.companyId,
    provider: 'twitter',
    label: twitterUser.name ? `@${twitterUser.username}` : 'X (Twitter)',
    accountName: twitterUser.username || 'Twitter',
    externalAccountId: twitterUser.id || '',
    accessToken: tokenRes.access_token,
    refreshToken: tokenRes.refresh_token || '',
    expiresAt: tokenRes.expires_in ? Date.now() + tokenRes.expires_in * 1000 : null,
    meta: {
      username: twitterUser.username,
      name: twitterUser.name,
      profileImage: twitterUser.profile_image_url,
      followers: twitterUser.public_metrics?.followers_count,
    },
    connectedBy: state.userId,
    connectedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'active',
  }];
}

async function handleLinkedInCallback(code: string, state: Record<string, string>) {
  const clientId = process.env.LINKEDIN_CLIENT_ID!;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET!;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI || `${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/social/callback`;

  const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  }).then(r => r.json());

  if (!tokenRes.access_token) throw new Error('LinkedIn token exchange failed: ' + JSON.stringify(tokenRes));

  const userRes = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenRes.access_token}` },
  }).then(r => r.json()).catch(() => ({}));

  return [{
    companyId: state.companyId,
    provider: 'linkedin',
    label: userRes.name || 'LinkedIn',
    accountName: userRes.name || 'LinkedIn',
    externalAccountId: userRes.sub || '',
    accessToken: tokenRes.access_token,
    refreshToken: tokenRes.refresh_token || '',
    expiresAt: tokenRes.expires_in ? Date.now() + tokenRes.expires_in * 1000 : null,
    meta: {
      name: userRes.name,
      email: userRes.email,
      picture: userRes.picture,
      sub: userRes.sub,
    },
    connectedBy: state.userId,
    connectedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'active',
  }];
}

async function handleThreadsCallback(code: string, state: Record<string, string>) {
  const appId = process.env.THREADS_APP_ID || process.env.FB_APP_ID!;
  const appSecret = process.env.THREADS_APP_SECRET || process.env.FB_APP_SECRET!;
  const redirectUri = process.env.THREADS_REDIRECT_URI || `${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/social/callback`;

  // Exchange code for short-lived token
  const tokenRes = await fetch('https://graph.threads.net/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code,
    }),
  }).then(r => r.json());

  if (!tokenRes.access_token) throw new Error('Threads token exchange failed: ' + JSON.stringify(tokenRes));

  // Exchange for long-lived token
  const longRes = await fetch(
    `https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${appSecret}&access_token=${tokenRes.access_token}`
  ).then(r => r.json()).catch(() => tokenRes);

  const accessToken = longRes.access_token || tokenRes.access_token;

  // Get profile
  const profileRes = await fetch(
    `https://graph.threads.net/v1.0/me?fields=id,username,threads_profile_picture_url&access_token=${accessToken}`
  ).then(r => r.json()).catch(() => ({}));

  return [{
    companyId: state.companyId,
    provider: 'threads',
    label: profileRes.username ? `@${profileRes.username}` : 'Threads',
    accountName: profileRes.username || 'Threads',
    externalAccountId: profileRes.id || tokenRes.user_id || '',
    accessToken,
    refreshToken: '',
    expiresAt: longRes.expires_in ? Date.now() + longRes.expires_in * 1000 : null,
    meta: {
      username: profileRes.username,
      profilePicture: profileRes.threads_profile_picture_url,
    },
    connectedBy: state.userId,
    connectedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'active',
  }];
}

// ── Route handler ───────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get('code');
  const stateParam = url.searchParams.get('state');

  if (!code || !stateParam) {
    const error = url.searchParams.get('error') || url.searchParams.get('error_description') || 'Missing code or state';
    return NextResponse.redirect(new URL(`/integrations?error=${encodeURIComponent(error)}`, request.url));
  }

  const state = decodeState(stateParam);
  if (!state || !state.provider || !state.workspaceId || !state.companyId) {
    return NextResponse.redirect(new URL('/integrations?error=Invalid+OAuth+state', request.url));
  }

  try {
    let connectionData: Array<Record<string, unknown>> = [];
    const provider = state.provider;

    switch (provider) {
      case 'facebook':
      case 'instagram':
        connectionData = await handleFacebookCallback(code, state);
        break;
      case 'youtube':
        connectionData = await handleYouTubeCallback(code, state);
        break;
      case 'tiktok':
        connectionData = await handleTikTokCallback(code, state);
        break;
      case 'twitter':
        connectionData = await handleTwitterCallback(code, state);
        break;
      case 'linkedin':
        connectionData = await handleLinkedInCallback(code, state);
        break;
      case 'threads':
        connectionData = await handleThreadsCallback(code, state);
        break;
      default:
        return NextResponse.redirect(
          new URL(`/integrations?error=${encodeURIComponent(`Unsupported provider: ${provider}`)}`, request.url)
        );
    }

    // Save each connection to Firestore
    const collectionPath = `workspaces/${state.workspaceId}/companies/${state.companyId}/connections`;

    for (const conn of connectionData) {
      // Remove existing connections for same provider to avoid duplicates
      const existing = await serverQueryDocs(collectionPath, 'provider', '==', conn.provider);
      for (const doc of existing) {
        if (doc.id) {
          await serverDeleteDoc(`${collectionPath}/${doc.id}`);
        }
      }
      // Save new connection
      await serverAddDoc(collectionPath, conn);
    }

    const names = connectionData.map(c => c.label || c.provider).join(', ');
    return NextResponse.redirect(
      new URL(`/integrations?success=${encodeURIComponent(`Connected: ${names}`)}`, request.url)
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'OAuth callback failed';
    console.error('[social/callback]', message);
    return NextResponse.redirect(
      new URL(`/integrations?error=${encodeURIComponent(message)}`, request.url)
    );
  }
}
