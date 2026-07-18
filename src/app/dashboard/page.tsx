import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/app/auth/actions';
import { UploadDropzone } from '@/components/dashboard/UploadDropzone';
import { ArtworkManager, type ManagedArtwork } from '@/components/dashboard/ArtworkManager';
import { InquiryList, type DashboardInquiry } from '@/components/dashboard/InquiryList';

// Every read here is caller-scoped and private; never cache it.
export const dynamic = 'force-dynamic';

export const metadata = { title: 'Dashboard — ArtSpace' };

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login?next=/dashboard');

  const { data: profile } = await supabase
    .from('users')
    .select('role, name, username')
    .eq('id', user.id)
    .single();

  // Middleware only gates on being signed in; the artist check belongs here.
  if (profile?.role !== 'artist') {
    return (
      <main className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="font-serif text-3xl text-stone-900">Artist account required</h1>
        <p className="mt-4 text-stone-600">
          Your account is set up as a visitor. Upgrade to an artist account to publish work.
        </p>
        <Link
          href="/settings"
          className="mt-8 inline-block rounded-sm bg-stone-900 px-6 py-2.5 text-sm text-stone-50 hover:bg-stone-700"
        >
          Go to settings
        </Link>
      </main>
    );
  }

  const [statsResult, artworksResult, inquiriesResult] = await Promise.all([
    supabase.rpc('artist_artwork_stats'),
    supabase
      .from('artworks')
      .select('id, title, medium, dimensions, price_range, display_url')
      .eq('artist_id', user.id),
    supabase
      .from('inquiries')
      .select('id, buyer_name, buyer_phone, message, status, created_at, artworks (title)')
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  const detailsById = new Map(
    (artworksResult.data ?? []).map((a) => [a.id, a] as const),
  );

  const managed: ManagedArtwork[] = (statsResult.data ?? []).map((stat) => {
    const details = detailsById.get(stat.artwork_id);
    return {
      ...stat,
      title: stat.title,
      medium: details?.medium ?? '',
      dimensions: details?.dimensions ?? '',
      price_range: details?.price_range ?? '',
      display_url: details?.display_url ?? '',
    };
  });

  const inquiries: DashboardInquiry[] = (inquiriesResult.data ?? []).map((row) => {
    const artwork = Array.isArray(row.artworks) ? row.artworks[0] : row.artworks;
    return {
      id: row.id,
      buyer_name: row.buyer_name,
      buyer_phone: row.buyer_phone,
      message: row.message,
      status: row.status,
      created_at: row.created_at,
      artwork_title: artwork?.title ?? 'Unknown artwork',
    };
  });

  const totals = managed.reduce(
    (acc, a) => ({
      views: acc.views + a.views_count,
      likes: acc.likes + a.likes_count,
      inquiries: acc.inquiries + Number(a.inquiries_count),
    }),
    { views: 0, likes: 0, inquiries: 0 },
  );

  const newInquiries = inquiries.filter((i) => i.status === 'new').length;

  return (
    <main className="mx-auto max-w-5xl px-6 py-14">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-stone-200 pb-8">
        <div>
          <h1 className="font-serif text-4xl tracking-tight text-stone-900">Studio</h1>
          <p className="mt-1 text-sm text-stone-500">{profile.name ?? user.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {profile.username ? (
            <Link
              href={`/artist/${profile.username}`}
              className="rounded-sm border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:border-stone-800"
            >
              View public profile
            </Link>
          ) : null}
          <Link
            href="/settings"
            className="rounded-sm border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:border-stone-800"
          >
            Settings
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-sm border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:border-stone-800"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <section aria-labelledby="overview" className="py-10">
        <h2 id="overview" className="sr-only">
          Overview
        </h2>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-sm bg-stone-200 sm:grid-cols-4">
          <Stat label="Works" value={managed.length} />
          <Stat label="Views" value={totals.views} />
          <Stat label="Likes" value={totals.likes} />
          <Stat label="New inquiries" value={newInquiries} highlight={newInquiries > 0} />
        </dl>
      </section>

      <Section title="Publish new work">
        <UploadDropzone />
      </Section>

      <Section title="Your works">
        <ArtworkManager artworks={managed} />
      </Section>

      <Section title="Inquiries">
        <InquiryList inquiries={inquiries} />
      </Section>
    </main>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`px-5 py-6 ${highlight ? 'bg-amber-50' : 'bg-[#faf7f2]'}`}>
      <dt className="text-xs uppercase tracking-[0.15em] text-stone-500">{label}</dt>
      <dd className="mt-2 font-serif text-3xl tabular-nums text-stone-900">
        {value.toLocaleString()}
      </dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-stone-200 py-10">
      <h2 className="mb-6 font-serif text-2xl text-stone-900">{title}</h2>
      {children}
    </section>
  );
}
