import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import {
  ACCEPTED_MIME,
  MAX_UPLOAD_BYTES,
  assertSupportedImage,
  buildDisplayRendition,
} from '@/lib/images/watermark';

// sharp is a native module — it cannot run on the Edge runtime.
export const runtime = 'nodejs';
export const maxDuration = 60;

const metadataSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).optional(),
  medium: z.string().trim().max(120).optional(),
  dimensions: z.string().trim().max(120).optional(),
  year: z.coerce.number().int().min(1000).max(new Date().getFullYear() + 1).optional(),
  price_range: z.string().trim().max(120).optional(),
});

export async function POST(req: Request) {
  const limit = rateLimit(`upload:${clientIp(req)}`, 10, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { data: null, error: 'Too many uploads. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((limit.resetAt - Date.now()) / 1000)) } },
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ data: null, error: 'Not authenticated' }, { status: 401 });
  }

  // Authorization is checked here explicitly because the write below runs with
  // service_role and therefore bypasses the artworks RLS policy.
  const { data: profile } = await supabase
    .from('users')
    .select('role, username, name')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'artist') {
    return NextResponse.json(
      { data: null, error: 'Only artist accounts can upload artwork' },
      { status: 403 },
    );
  }

  const form = await req.formData();
  const file = form.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ data: null, error: 'Missing file' }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ data: null, error: 'File exceeds 25MB' }, { status: 413 });
  }
  if (!ACCEPTED_MIME.includes(file.type as (typeof ACCEPTED_MIME)[number])) {
    return NextResponse.json({ data: null, error: `Unsupported type: ${file.type}` }, { status: 415 });
  }

  const parsed = metadataSchema.safeParse(Object.fromEntries(form.entries()));
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') },
      { status: 400 },
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  let originalFormat: string;
  let display: Awaited<ReturnType<typeof buildDisplayRendition>>;
  try {
    // Sniff the real format from the bytes; the client-supplied MIME is a hint, not proof.
    originalFormat = await assertSupportedImage(bytes);
    display = await buildDisplayRendition(bytes, profile.username ?? profile.name ?? 'ArtSpace');
  } catch (err) {
    console.error('[upload] image processing failed', { userId: user.id, err });
    return NextResponse.json({ data: null, error: 'Could not process image' }, { status: 422 });
  }

  const admin = createAdminClient();
  const artworkId = crypto.randomUUID();
  const originalPath = `${user.id}/${artworkId}.${originalFormat}`;
  const displayPath = `${user.id}/${artworkId}.webp`;

  const originalUpload = await admin.storage
    .from('originals')
    .upload(originalPath, bytes, { contentType: file.type, upsert: false });

  if (originalUpload.error) {
    console.error('[upload] original store failed', originalUpload.error);
    return NextResponse.json({ data: null, error: 'Upload failed' }, { status: 500 });
  }

  const displayUpload = await admin.storage
    .from('display')
    .upload(displayPath, display.buffer, { contentType: 'image/webp', upsert: false });

  if (displayUpload.error) {
    await admin.storage.from('originals').remove([originalPath]);
    console.error('[upload] display store failed', displayUpload.error);
    return NextResponse.json({ data: null, error: 'Upload failed' }, { status: 500 });
  }

  const { data: artwork, error: insertError } = await admin
    .from('artworks')
    .insert({
      id: artworkId,
      artist_id: user.id,
      ...parsed.data,
      original_url: originalPath,
      display_url: displayPath,
    })
    .select('id, title, display_url, created_at')
    .single();

  if (insertError) {
    // Storage and Postgres are not transactional together; roll the objects back
    // so a failed insert cannot leave orphaned files behind.
    await admin.storage.from('originals').remove([originalPath]);
    await admin.storage.from('display').remove([displayPath]);
    console.error('[upload] insert failed', insertError);
    return NextResponse.json({ data: null, error: 'Upload failed' }, { status: 500 });
  }

  return NextResponse.json({ data: artwork, error: null }, { status: 201 });
}
