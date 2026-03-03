/**
 * /api/social/refresh — Refresh expired OAuth tokens.
 * 
 * Body: { workspaceId, companyId, connectionId }
 * 
 * Supports: YouTube (Google), TikTok, Twitter/X, LinkedIn
 * Facebook/Instagram use long-lived tokens that expire after ~60 days (re-auth needed).
 */

import { NextRequest, NextResponse } from 'next/server';
import { serverGetDoc, serverSetDoc } from '@/lib/server/firebase-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workspaceId, companyId, connectionId } = body;

    if (!workspaceId || !companyId || !connectionId) {
      return NextResponse.json({ error: 'workspaceId, companyId, and connectionId required' }, { status: 400 });
    }

    const docPath = `workspaces/${workspaceId}/companies/${companyId}/connections/${connectionId}`;
    const conn = await serverGetDoc(docPath);
    if (!conn) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    const provider = conn.provider as string;
    const refreshToken = conn.refreshToken as string;

    if (!refreshToken) {
      return NextResponse.json({ error: `No refresh token available for ${provider}. Re-authenticate.` }, { status: 400 });
    }

    let newAccessToken: string | null = null;
    let newExpiresAt: number | null = null;
    let newRefreshToken: string | undefined;

    switch (provider) {
      case 'youtube': {
        const res = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
          }),
        }).then(r => r.json());
        if (res.access_token) {
          newAccessToken = res.access_token;
          newExpiresAt = Date.now() + (res.expires_in || 3600) * 1000;
        }
        break;
      }
      case 'tiktok': {
        const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_key: process.env.TIKTOK_CLIENT_KEY!,
            client_secret: process.env.TIKTOK_CLIENT_SECRET!,
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
          }),
        }).then(r => r.json());
        const token = res.access_token || res.data?.access_token;
        if (token) {
          newAccessToken = token;
          newExpiresAt = Date.now() + (res.expires_in || res.data?.expires_in || 86400) * 1000;
          newRefreshToken = res.refresh_token || res.data?.refresh_token;
        }
        break;
      }
      case 'twitter': {
        const clientId = process.env.TWITTER_CLIENT_ID!;
        const clientSecret = process.env.TWITTER_CLIENT_SECRET || '';
        const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const res = await fetch('https://api.x.com/2/oauth2/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${basicAuth}`,
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
          }),
        }).then(r => r.json());
        if (res.access_token) {
          newAccessToken = res.access_token;
          newExpiresAt = Date.now() + (res.expires_in || 7200) * 1000;
          newRefreshToken = res.refresh_token;
        }
        break;
      }
      case 'linkedin': {
        const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: process.env.LINKEDIN_CLIENT_ID!,
            client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
          }),
        }).then(r => r.json());
        if (res.access_token) {
          newAccessToken = res.access_token;
          newExpiresAt = Date.now() + (res.expires_in || 5184000) * 1000;
          newRefreshToken = res.refresh_token;
        }
        break;
      }
      default:
        return NextResponse.json({ error: `Token refresh not supported for ${provider}. Re-authenticate.` }, { status: 400 });
    }

    if (!newAccessToken) {
      // Mark as expired
      await serverSetDoc(docPath, { status: 'expired', updatedAt: new Date().toISOString() });
      return NextResponse.json({ error: 'Token refresh failed. Re-authenticate.' }, { status: 401 });
    }

    // Update connection with new tokens
    const update: Record<string, unknown> = {
      accessToken: newAccessToken,
      expiresAt: newExpiresAt,
      updatedAt: new Date().toISOString(),
      status: 'active',
    };
    if (newRefreshToken) update.refreshToken = newRefreshToken;
    await serverSetDoc(docPath, update);

    return NextResponse.json({ success: true, expiresAt: newExpiresAt });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
