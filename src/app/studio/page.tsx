import type { Metadata } from 'next';
import { StudioApp } from '@/components/studio/StudioApp';

export const metadata: Metadata = {
  title: 'Studio — ArtSpace',
  description: 'Create an account, upload your work, and set your prices — a live demo.',
};

export default function StudioPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <StudioApp />
    </main>
  );
}
