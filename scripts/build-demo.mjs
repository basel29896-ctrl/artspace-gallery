#!/usr/bin/env node
/**
 * Builds the static GitHub Pages demo.
 *
 * GitHub Pages serves files, not a Node server, so everything that needs a
 * request context has to come out of the build: route handlers, server actions,
 * auth pages, and middleware. Those paths are moved aside, `next build` runs
 * with `output: 'export'`, and they are moved back — restored in a `finally`
 * so an aborted or failing build cannot leave the repository gutted.
 *
 * Usage: node scripts/build-demo.mjs
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, cpSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const PARK = join(ROOT, '.demo-parked');
const OUT = join(ROOT, 'out');
const DOCS = join(ROOT, 'docs');
const BASE_PATH = '/artspace-gallery';

/** Paths that cannot exist in a static export. */
const SERVER_ONLY = [
  'src/app/api',
  'src/app/auth',
  'src/app/login',
  'src/app/settings',
  'src/app/dashboard',
  'src/middleware.ts',
  // These import the parked server actions. TypeScript checks every file in
  // the project, not only the ones reachable from a route, so they must go too.
  'src/components/auth',
];

const moved = [];

function park() {
  mkdirSync(PARK, { recursive: true });
  for (const rel of SERVER_ONLY) {
    const from = join(ROOT, rel);
    if (!existsSync(from)) continue;
    const to = join(PARK, rel.replace(/[\\/]/g, '__'));
    // Copy-then-delete rather than rename: on Windows a directory rename fails
    // with EPERM whenever any process still holds a handle inside it.
    cpSync(from, to, { recursive: true });
    rmSync(from, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    moved.push({ from, to });
    console.log(`  parked  ${rel}`);
  }
}

function restore() {
  for (const { from, to } of moved.reverse()) {
    if (!existsSync(to)) continue;
    mkdirSync(join(from, '..'), { recursive: true });
    if (existsSync(from)) rmSync(from, { recursive: true, force: true, maxRetries: 5 });
    cpSync(to, from, { recursive: true });
    console.log(`  restored ${from.replace(ROOT, '.')}`);
  }
  rmSync(PARK, { recursive: true, force: true });
}

try {
  console.log('Parking server-only routes…');
  park();

  console.log('\nBuilding static export…');
  rmSync(join(ROOT, '.next'), { recursive: true, force: true });
  rmSync(OUT, { recursive: true, force: true });

  execSync('npx next build', {
    stdio: 'inherit',
    env: {
      ...process.env,
      NEXT_PUBLIC_STATIC_DEMO: '1',
      NEXT_PUBLIC_BASE_PATH: BASE_PATH,
      // The demo has no backend; these exist only to satisfy schema validation
      // at module load. No request is ever made with them.
      NEXT_PUBLIC_SUPABASE_URL: 'https://static-demo.invalid',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'static-demo',
      NEXT_PUBLIC_SITE_URL: `https://basel29896-ctrl.github.io${BASE_PATH}`,
    },
  });
} finally {
  console.log('\nRestoring server-only routes…');
  restore();
}

console.log('\nPublishing to docs/…');
// Keep the concept page; replace everything else with the exported app.
const CONCEPT = join(ROOT, '.concept-tmp');
rmSync(CONCEPT, { recursive: true, force: true });
if (existsSync(join(DOCS, 'concept'))) {
  cpSync(join(DOCS, 'concept'), CONCEPT, { recursive: true });
}

rmSync(DOCS, { recursive: true, force: true });
cpSync(OUT, DOCS, { recursive: true });

if (existsSync(CONCEPT)) {
  cpSync(CONCEPT, join(DOCS, 'concept'), { recursive: true });
  rmSync(CONCEPT, { recursive: true, force: true });
}

// Without this, GitHub Pages runs the output through Jekyll, which silently
// drops every directory beginning with an underscore — including _next.
writeFileSync(join(DOCS, '.nojekyll'), '');

console.log('Done. docs/ now contains the static app.');
