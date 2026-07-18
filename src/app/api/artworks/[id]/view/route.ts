import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { serverEnv } from '@/lib/env';

export const runtime = 'nodejs';

const paramsSchema = z.object({ id: z.string().uuid() });

/**
 * Records a view, deduplicated per viewer per day by the database.
 *
 * The viewer identity is a salted SHA-256 of IP + user agent. The raw IP is
 * never persisted, and the salt is the service-role key, so the digest is not
 * reversible via a rainbow table of the IPv4 space.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const parsed = paramsSchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ data: null, error: 'Invalid artwork id' }, { status: 400 });
  }

  const ip = clientIp(req);
  if (!rateLimit(`view:${ip}`, 120, 60 * 60 * 1000).ok) {
    // Silently accept — a view counter is not worth surfacing an error for.
    return NextResponse.json({ data: null, error: null }, { status: 202 });
  }

  const viewerHash = createHash('sha256')
    .update(`${ip}|${req.headers.get('user-agent') ?? ''}|${serverEnv().SUPABASE_SERVICE_ROLE_KEY}`)
    .digest('hex');

  const admin = createAdminClient();
  const { error } = await admin.rpc('record_artwork_view', {
    p_artwork_id: parsed.data.id,
    p_viewer_hash: viewerHash,
  });

  if (error) {
    console.error('[views] record failed', error);
  }

  return NextResponse.json({ data: null, error: null }, { status: 202 });
}
