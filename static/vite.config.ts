import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Static build — output is a plain folder of files, deployable to Vercel/Netlify.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: { outDir: 'dist', assetsInlineLimit: 0 },
  test: {
    // The logic layer is pure and has no DOM, so the default node environment
    // is all it needs. Add jsdom here when component tests arrive.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
