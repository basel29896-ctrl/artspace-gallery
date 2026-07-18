import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const schema = z.object({ status: z.enum(['new', 'contacted', 'closed']) });

/**
 * Status changes only. RLS restricts UPDATE to the receiving artist, and this
 * uses the caller's own client, so no extra ownership check is needed.
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const id = z.string().uuid().safeParse(params.id);
  if (!id.success) {
    return NextResponse.json({ data: null, error: 'Invalid id' }, { status: 400 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ data: null, error: 'Invalid status' }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ data: null, error: 'Not authenticated' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('inquiries')
    .update({ status: parsed.data.status })
    .eq('id', id.data)
    .select('id, status')
    .maybeSingle();

  if (error) {
    console.error('[inquiries] status update failed', error);
    return NextResponse.json({ data: null, error: 'Could not update status' }, { status: 500 });
  }

  // RLS filtered the row out — the caller does not own this inquiry.
  if (!data) {
    return NextResponse.json({ data: null, error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ data, error: null });
}
