const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const isStaticDemo = process.env.NEXT_PUBLIC_STATIC_DEMO === '1';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // GitHub Pages export. No server, so the image optimiser (which needs one)
  // is disabled and every asset is emitted under the project sub-path.
  ...(isStaticDemo
    ? { output: 'export', basePath, assetPrefix: basePath, trailingSlash: true }
    : {}),
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
    unoptimized: isStaticDemo,
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
