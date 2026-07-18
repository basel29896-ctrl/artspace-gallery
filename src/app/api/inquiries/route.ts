import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { clientIp, rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const schema = z.object({
  artwork_id: z.string().uuid(),
  buyer_name: z.string().trim().min(1).max(120),
  buyer_phone: z.string().trim().min(5).max(32),
  message: z.string().trim().min(1).max(2000),
  // Honeypot. Accept ANY value here — validating it would reject filled
  // submissions with a 400, which tells the bot exactly which field caught it.
  // The emptiness check happens after parsing so we can fake success instead.
  website: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  const ip = clientIp(req);
  const limit = rateLimit(`inquiry:${ip}`, 5, 60 * 60 * 1000);

  if (!limit.ok) {
    return NextResponse.json(
      { data: null, error: 'Too many messages sent. Try again later.' },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ data: null, error: 'Please check the form and try again.' }, { status: 400 });
  }

  if (parsed.data.website) {
    // Honeypot tripped. Return success so the bot does not learn it was caught.
    return NextResponse.json({ data: { ok: true }, error: null }, { status: 201 });
  }

  // Runs through submit_inquiry(), which derives artist_id from the artwork —
  // a client cannot address an inquiry to an artist who does not own the piece.
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('submit_inquiry', {
    p_artwork_id: parsed.data.artwork_id,
    p_buyer_name: parsed.data.buyer_name,
    p_buyer_phone: parsed.data.buyer_phone,
    p_message: parsed.data.message,
  });

  if (error) {
    console.error('[inquiries] submit failed', error);
    return NextResponse.json({ data: null, error: 'Could not send your message.' }, { status: 500 });
  }

  return NextResponse.json({ data: { id: data }, error: null }, { status: 201 });
}
