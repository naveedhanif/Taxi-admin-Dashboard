/// <reference types="vite/client" />

// Globals injected by vite.config.ts's `define` block at build time —
// see that file for where these actually come from (Vercel's
// VERCEL_GIT_COMMIT_SHA system env var). Declared here so TypeScript
// doesn't complain about referencing them in App.tsx.
declare const __APP_COMMIT_SHA__: string;
declare const __APP_BUILD_TIME__: string;
