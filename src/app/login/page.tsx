import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { safeRedirectPath } from '@/lib/auth/redirect';
import { AuthForm } from '@/components/auth/AuthForm';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Sign in — ArtSpace',
  robots: { index: false },
};

const ERRORS: Record<string, string> = {
  oauth: 'Google sign-in could not be started. Please try again.',
  auth_failed: 'That sign-in link is invalid or has expired.',
  missing_code: 'That sign-in link is incomplete. Please try again.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string; mode?: string };
}) {
  const next = safeRedirectPath(searchParams.next, '/');

  // Already signed in — no reason to show the form.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(next);

  const errorMessage = searchParams.error ? ERRORS[searchParams.error] : null;

  return (
    <main className="mx-auto flex min-h-[100svh] max-w-md flex-col justify-center px-6 py-16">
      <Link
        href="/"
        className="font-serif text-2xl tracking-tight text-stone-900 hover:text-stone-600"
      >
        ArtSpace
      </Link>

      {errorMessage ? (
        <p role="alert" className="mt-6 border-l-2 border-red-400 pl-3 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      <div className="mt-8">
        <AuthForm next={next} />
      </div>
    </main>
  );
}
