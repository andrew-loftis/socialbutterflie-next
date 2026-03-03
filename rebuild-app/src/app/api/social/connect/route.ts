/**
 * /api/social/connect — Initiates OAuth flow for a social platform.
 * 
 * Builds the platform-specific OAuth authorization URL and redirects the user.
 * State parameter carries workspace/company/user context through the flow.
 * 
 * Query params: provider, userId, workspaceId, companyId
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// ── Platform OAuth Configuration ────────────────────────────────────────────

const OAUTH_CONFIGS: Record<string, {
  buildAuthUrl: (state: string) => string | null;
}> = {
  // ── Facebook + Instagram (shared OAuth via Meta) ──────────────────────────
  facebook: {
    buildAuthUrl(state) {
      const appId = process.env.FB_APP_ID;
      const redirectUri = process.env.FB_REDIRECT_URI || `${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/social/callback`;
      if (!appId) return null;
      const scopes = [
        'public_profile', 'email',
        'pages_show_list', 'pages_read_engagement', 'pages_manage_metadata', 'pages_manage_posts',
        'pages_read_user_content',
        'instagram_basic', 'instagram_content_publish', 'instagram_manage_comments', 'instagram_manage_insights',
      ].join(',');
      const url = new URL('https://www.facebook.com/v21.0/dialog/oauth');
      url.searchParams.set('client_id', appId);
      url.searchParams.set('redirect_uri', redirectUri);
      url.searchParams.set('state', state);
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('scope', scopes);
      return url.toString();
    },
  },
  instagram: {
    buildAuthUrl(state) {
      // Instagram uses the same Meta OAuth as Facebook
      return OAUTH_CONFIGS.facebook.buildAuthUrl(state);
    },
  },

  // ── YouTube (Google OAuth) ────────────────────────────────────────────────
  youtube: {
    buildAuthUrl(state) {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/social/callback`;
      if (!clientId) return null;
      const scopes = [
        'openid', 'email', 'profile',
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtube',
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/yt-analytics.readonly',
      ].join(' ');
      const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      url.searchParams.set('client_id', clientId);
      url.searchParams.set('redirect_uri', redirectUri);
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('access_type', 'offline');
      url.searchParams.set('prompt', 'consent');
      url.searchParams.set('scope', scopes);
      url.searchParams.set('state', state);
      return url.toString();
    },
  },

  // ── TikTok ────────────────────────────────────────────────────────────────
  tiktok: {
    buildAuthUrl(state) {
      const clientKey = process.env.TIKTOK_CLIENT_KEY;
      const redirectUri = process.env.TIKTOK_REDIRECT_URI || `${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/social/callback`;
      if (!clientKey) return null;
      const url = new URL('https://www.tiktok.com/v2/auth/authorize/');
      url.searchParams.set('client_key', clientKey);
      url.searchParams.set('scope', 'user.info.basic,user.info.stats,video.publish,video.upload,video.list');
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('redirect_uri', redirectUri);
      url.searchParams.set('state', state);
      return url.toString();
    },
  },

  // ── Twitter / X (OAuth 2.0 PKCE) ─────────────────────────────────────────
  twitter: {
    buildAuthUrl(state) {
      const clientId = process.env.TWITTER_CLIENT_ID;
      const redirectUri = process.env.TWITTER_REDIRECT_URI || `${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/social/callback`;
      if (!clientId) return null;
      const scopes = 'tweet.read tweet.write users.read offline.access';
      const codeChallenge = crypto.randomBytes(32).toString('base64url');
      const url = new URL('https://twitter.com/i/oauth2/authorize');
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('client_id', clientId);
      url.searchParams.set('redirect_uri', redirectUri);
      url.searchParams.set('scope', scopes);
      url.searchParams.set('state', state);
      url.searchParams.set('code_challenge', codeChallenge);
      url.searchParams.set('code_challenge_method', 'plain');
      return url.toString();
    },
  },

  // ── LinkedIn (OAuth 2.0) ──────────────────────────────────────────────────
  linkedin: {
    buildAuthUrl(state) {
      const clientId = process.env.LINKEDIN_CLIENT_ID;
      const redirectUri = process.env.LINKEDIN_REDIRECT_URI || `${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/social/callback`;
      if (!clientId) return null;
      const scopes = 'openid profile email w_member_social r_organization_social rw_organization_admin';
      const url = new URL('https://www.linkedin.com/oauth/v2/authorization');
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('client_id', clientId);
      url.searchParams.set('redirect_uri', redirectUri);
      url.searchParams.set('scope', scopes);
      url.searchParams.set('state', state);
      return url.toString();
    },
  },

  // ── Threads (Meta Threads API) ────────────────────────────────────────────
  threads: {
    buildAuthUrl(state) {
      const appId = process.env.THREADS_APP_ID || process.env.FB_APP_ID;
      const redirectUri = process.env.THREADS_REDIRECT_URI || `${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/social/callback`;
      if (!appId) return null;
      const scopes = 'threads_basic,threads_content_publish,threads_manage_insights,threads_manage_replies';
      const url = new URL('https://threads.net/oauth/authorize');
      url.searchParams.set('client_id', appId);
      url.searchParams.set('redirect_uri', redirectUri);
      url.searchParams.set('scope', scopes);
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('state', state);
      return url.toString();
    },
  },

  // ── Bluesky (AT Protocol — uses app password, not OAuth) ──────────────────
  bluesky: {
    buildAuthUrl(_state) {
      // Bluesky uses handle + app password, not OAuth redirect
      // Return null to signal the UI should show a credentials dialog instead
      return null;
    },
  },

  // ── Pinterest ──────────────────────────────────────────────────────────────
  pinterest: {
    buildAuthUrl(state) {
      const appId = process.env.PINTEREST_APP_ID;
      const redirectUri = process.env.PINTEREST_REDIRECT_URI || `${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/social/callback`;
      if (!appId) return null;
      const scopes = 'boards:read,boards:write,pins:read,pins:write,user_accounts:read';
      const url = new URL('https://www.pinterest.com/oauth/');
      url.searchParams.set('client_id', appId);
      url.searchParams.set('redirect_uri', redirectUri);
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('scope', scopes);
      url.searchParams.set('state', state);
      return url.toString();
    },
  },
};

// ── State encoding ──────────────────────────────────────────────────────────

function encodeState(payload: Record<string, string | undefined>): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

// ── Route handler ───────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const provider = url.searchParams.get('provider');
  const userId = url.searchParams.get('userId');
  const workspaceId = url.searchParams.get('workspaceId');
  const companyId = url.searchParams.get('companyId') || undefined;

  if (!provider || !userId || !workspaceId) {
    return NextResponse.json(
      { error: 'Missing required params: provider, userId, workspaceId' },
      { status: 400 },
    );
  }

  const config = OAUTH_CONFIGS[provider];
  if (!config) {
    return NextResponse.json(
      { error: `Unsupported provider: ${provider}` },
      { status: 400 },
    );
  }

  const state = encodeState({
    provider,
    userId,
    workspaceId,
    companyId,
    nonce: crypto.randomBytes(8).toString('hex'),
    ts: String(Date.now()),
  });

  const authUrl = config.buildAuthUrl(state);
  if (!authUrl) {
    // For Bluesky or providers without OAuth, return JSON instructing client to show credentials dialog
    if (provider === 'bluesky') {
      return NextResponse.json({
        method: 'credentials',
        provider: 'bluesky',
        fields: ['handle', 'appPassword'],
        description: 'Bluesky uses an App Password instead of OAuth. Create one at bsky.app/settings/app-passwords',
      });
    }
    return NextResponse.json(
      { error: `${provider} OAuth is not configured. Set the required environment variables (e.g. ${provider.toUpperCase()}_CLIENT_ID).` },
      { status: 503 },
    );
  }

  return NextResponse.redirect(authUrl);
}
