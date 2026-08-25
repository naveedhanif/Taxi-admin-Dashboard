import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    define: {
      // Bakes the deployed commit SHA + build time directly into the
      // bundle at build time, so the running app can show a version
      // badge — makes it obvious which commit a live Vercel deployment
      // is actually running, instead of guessing from the UI.
      // process.env.VERCEL_GIT_COMMIT_SHA is auto-populated by Vercel on
      // every deploy (read here in Node during the build, not through
      // Vite's client-side VITE_ prefix rules) and falls back to
      // "local" for `npm run dev`.
      __APP_COMMIT_SHA__: JSON.stringify(process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'local'),
      __APP_BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
  };
});
