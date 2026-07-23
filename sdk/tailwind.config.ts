import type { Config } from 'tailwindcss';

// Scans both the SDK shell and the shared editor/embed source it renders.
const config: Config = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../src/components/space/**/*.{ts,tsx}',
    '../src/embed/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
