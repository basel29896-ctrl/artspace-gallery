import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Set a new password — ArtSpace',
  robots: { index: false },
};

export default async function ResetPasswordPage() {
  // Reached via the reset link, which the callback already exchanged for a
  // session. No session → the link was invalid or expired.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?error=auth_failed');

  return (
    <main className="mx-auto flex min-h-[100svh] max-w-md flex-col justify-center px-6 py-16">
      <Link href="/" className="font-serif text-2xl tracking-tight text-stone-900 hover:text-stone-600">
        ArtSpace
      </Link>
      <h1 className="mt-8 font-serif text-3xl leading-tight tracking-tight text-stone-900">
        Set a new password
      </h1>
      <p className="mt-2 text-sm text-stone-600">Choose a new password for your account.</p>
      <ResetPasswordForm />
    </main>
  );
}
