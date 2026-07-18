/**
 * Static-demo build flag.
 *
 * Set only by `scripts/build-demo.mjs` for the GitHub Pages export. In that
 * build there is no server at all: no API routes, no auth, no database. Fixture
 * data is therefore the *only* data source, which is why it is allowed to run
 * under NODE_ENV=production here and nowhere else.
 *
 * Never set this for a real deployment.
 */
export const IS_STATIC_DEMO = process.env.NEXT_PUBLIC_STATIC_DEMO === '1';

/** GitHub Pages serves the project from a sub-path, not the domain root. */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
