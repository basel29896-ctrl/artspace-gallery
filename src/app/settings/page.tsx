import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/app/auth/actions';
import { ProfileForm } from '@/components/auth/ProfileForm';
import { BecomeArtistButton } from '@/components/auth/BecomeArtistButton';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Settings — ArtSpace', robots: { index: false } };

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login?next=/settings');

  const { data: profile } = await supabase
    .from('users')
    .select('role, name, username, bio, plan, website, instagram, avatar_url')
    .eq('id', user.id)
    .single();

  return (
    <main className="mx-auto max-w-2xl px-6 py-14">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-stone-200 pb-8">
        <div>
          <h1 className="font-serif text-4xl tracking-tight text-stone-900">Settings</h1>
          <p className="mt-1 text-sm text-stone-500">{user.email}</p>
        </div>
        <div className="flex gap-2">
          {profile?.role === 'artist' ? (
            <Link
              href="/dashboard"
              className="rounded-sm border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:border-stone-800"
            >
              Studio
            </Link>
          ) : null}
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

      <section className="border-b border-stone-200 py-10">
        <h2 className="mb-6 font-serif text-2xl text-stone-900">Profile</h2>
        <ProfileForm
          defaults={{
            name: profile?.name ?? '',
            username: profile?.username ?? '',
            bio: profile?.bio ?? '',
            website: profile?.website ?? '',
            instagram: profile?.instagram ?? '',
            avatarUrl: profile?.avatar_url ?? null,
          }}
        />
      </section>

      <section className="py-10">
        <h2 className="mb-2 font-serif text-2xl text-stone-900">Account</h2>

        <dl className="mb-6 divide-y divide-stone-200 border-y border-stone-200 text-sm">
          <div className="flex justify-between py-2.5">
            <dt className="text-stone-500">Account type</dt>
            <dd className="capitalize text-stone-800">{profile?.role ?? 'visitor'}</dd>
          </div>
          <div className="flex justify-between py-2.5">
            <dt className="text-stone-500">Plan</dt>
            <dd className="capitalize text-stone-800">{profile?.plan ?? 'free'}</dd>
          </div>
        </dl>

        {profile?.role === 'artist' ? (
          <p className="text-sm text-stone-600">
            You have an artist account.{' '}
            {profile.username ? (
              <Link href={`/artist/${profile.username}`} className="underline underline-offset-4">
                View your public profile
              </Link>
            ) : (
              'Set a username above to get a public profile page.'
            )}
          </p>
        ) : (
          <div>
            <p className="mb-4 text-sm leading-relaxed text-stone-600">
              Artist accounts can publish work, receive buyer inquiries, and track views. It is free
              to switch, but it cannot be undone from here.
            </p>
            <BecomeArtistButton />
          </div>
        )}
      </section>
    </main>
  );
}
