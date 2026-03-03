/**
 * /api/social/disconnect — Remove a social connection.
 * 
 * Body: { workspaceId, companyId, connectionId?, provider? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { serverDeleteDoc, serverQueryDocs } from '@/lib/server/firebase-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workspaceId, companyId, connectionId, provider } = body;

    if (!workspaceId || !companyId) {
      return NextResponse.json({ error: 'workspaceId and companyId required' }, { status: 400 });
    }

    const collectionPath = `workspaces/${workspaceId}/companies/${companyId}/connections`;

    if (connectionId) {
      await serverDeleteDoc(`${collectionPath}/${connectionId}`);
    } else if (provider) {
      // Find and delete by provider
      const results = await serverQueryDocs(collectionPath, 'provider', '==', provider);
      for (const doc of results) {
        if (doc.id) await serverDeleteDoc(`${collectionPath}/${doc.id}`);
      }
    } else {
      return NextResponse.json({ error: 'connectionId or provider required' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
