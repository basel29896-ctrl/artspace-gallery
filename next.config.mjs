const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Scoped to the public `display` bucket only. Never allow a pattern that
    // could resolve into `originals`.
    remotePatterns: supabaseHost
      ? [
          {
            protocol: 'https',
            hostname: supabaseHost,
            pathname: '/storage/v1/object/public/display/**',
          },
        ]
      : [],
    formats: ['image/avif', 'image/webp'],
  },
  // three.js ships large ESM builds; keeping them external to the server bundle
  // avoids bundling a renderer that only ever runs in the browser.
  transpilePackages: ['three'],

  webpack: (config) => {
    // Konva's Node entry point requires the native `canvas` package for
    // headless rendering. The editor is client-only (dynamic, ssr:false), so
    // nothing ever reaches that path — alias it away instead of adding a
    // native build dependency.
    config.resolve.alias = { ...config.resolve.alias, canvas: false };
    return config;
  },
};

export default nextConfig;
