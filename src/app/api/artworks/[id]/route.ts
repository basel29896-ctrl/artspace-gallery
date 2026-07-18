import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const idSchema = z.string().uuid();

const patchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(4000).nullable().optional(),
  medium: z.string().trim().max(120).nullable().optional(),
  dimensions: z.string().trim().max(120).nullable().optional(),
  year: z.coerce.number().int().min(1000).max(new Date().getFullYear() + 1).nullable().optional(),
  price_range: z.string().trim().max(120).nullable().optional(),
});

async function requireOwner(artworkId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated' as const, status: 401 };

  const { data: artwork } = await supabase
    .from('artworks')
    .select('id, artist_id, original_url, display_url')
    .eq('id', artworkId)
    .maybeSingle();

  if (!artwork) return { error: 'Artwork not found' as const, status: 404 };

  // Ownership is checked here rather than relying on RLS, because the delete
  // path needs service_role to clean up storage objects.
  if (artwork.artist_id !== user.id) {
    return { error: 'Not found' as const, status: 404 };
  }

  return { artwork, user };
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const id = idSchema.safeParse(params.id);
  if (!id.success) {
    return NextResponse.json({ data: null, error: 'Invalid id' }, { status: 400 });
  }

  const owner = await requireOwner(id.data);
  if ('error' in owner) {
    return NextResponse.json({ data: null, error: owner.error }, { status: owner.status });
  }

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ data: null, error: 'Invalid fields' }, { status: 400 });
  }

  // Uses the caller's own client so the update is still RLS-checked.
  const supabase = createClient();
  const { data, error } = await supabase
    .from('artworks')
    .update(parsed.data)
    .eq('id', id.data)
    .select('id, title, description, medium, dimensions, year, price_range')
    .single();

  if (error) {
    console.error('[artworks] update failed', error);
    return NextResponse.json({ data: null, error: 'Could not save changes' }, { status: 500 });
  }

  return NextResponse.json({ data, error: null });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const id = idSchema.safeParse(params.id);
  if (!id.success) {
    return NextResponse.json({ data: null, error: 'Invalid id' }, { status: 400 });
  }

  const owner = await requireOwner(id.data);
  if ('error' in owner) {
    return NextResponse.json({ data: null, error: owner.error }, { status: owner.status });
  }

  const admin = createAdminClient();

  // Remove the row first: a dangling storage object is recoverable waste, but a
  // row pointing at a deleted object renders as a permanently broken artwork.
  const { error } = await admin.from('artworks').delete().eq('id', id.data);

  if (error) {
    console.error('[artworks] delete failed', error);
    return NextResponse.json({ data: null, error: 'Could not delete artwork' }, { status: 500 });
  }

  await Promise.all([
    admin.storage.from('originals').remove([owner.artwork.original_url]),
    admin.storage.from('display').remove([owner.artwork.display_url]),
  ]);

  return NextResponse.json({ data: { id: id.data }, error: null });
}
