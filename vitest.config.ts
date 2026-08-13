import { defineConfig } from "vitest/config";
import path from "path";

// Note: paths point at the root-level Next.js App Router layout (app/,
// components/, lib/, …). The old src/ tree was removed in migration Phase 6.
// JSX is handled by esbuild directly (automatic runtime) — no react plugin
// needed for tests.
export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["test/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./") },
  },
});
