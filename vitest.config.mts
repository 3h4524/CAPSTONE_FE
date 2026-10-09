import { fileURLToPath } from "node:url";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

import react from "@vitejs/plugin-react";

const resolveFromRoot = (path: string): string =>
  fileURLToPath(new URL(path, import.meta.url));

const SERVER_ONLY_STUB = resolveFromRoot("./src/test/mocks/server-only-stub.ts");
const NEXT_NAVIGATION_MOCK = resolveFromRoot("./src/test/__mocks__/next/navigation.ts");
const NEXT_HEADERS_MOCK = resolveFromRoot("./src/test/__mocks__/next/headers.ts");

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    // `server-only` throws on import outside the React Server Components bundler, so any helper
    // guarding server-only code would take the whole suite down. Stub it until a real server-only
    // module shows up.
    //
    // Next exposes no public provider for `next/navigation` / `next/headers`, and Vitest only
    // auto-resolves a `__mocks__` folder that sits next to node_modules. Aliasing keeps the mocks
    // inside src/test where the rest of the harness lives, and makes `vi.mock("next/navigation")`
    // unnecessary in every component test.
    alias: [
      { find: /^server-only$/, replacement: SERVER_ONLY_STUB },
      { find: /^next\/navigation$/, replacement: NEXT_NAVIGATION_MOCK },
      { find: /^next\/headers$/, replacement: NEXT_HEADERS_MOCK },
    ],
  },
  test: {
    environment: "jsdom",
    globals: false,
    // Vitest's default glob would also collect the Playwright specs under e2e/ and run them in
    // jsdom, where every Playwright fixture is undefined.
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts"],
    // Explicit even though Vitest 5 already defaults to true: mocks registered at module scope or
    // in beforeAll otherwise lose their call history between tests.
    clearMocks: true,
    // Next ships ESM-only subpath exports; leaving them external triggers a pre-bundling
    // SyntaxError instead of letting Vitest load them natively.
    server: { deps: { inline: [/^next\//] } },
    env: {
      NEXT_PUBLIC_API_BASE_URL: "http://localhost:5191",
    },
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.d.ts", "src/test/**", "src/app/**"],
      reporter: ["text", "html"],
      thresholds: {
        // Global floor is a ratchet over the whole src/ tree. Most of it is components with no
        // tests yet, so this can only move up. Real enforcement lives in the per-glob rules below.
        lines: 12,
        branches: 8,
        functions: 11,
        // Pure business logic is cheap to test and holds the rules that matter, so it is gated
        // per directory. Ratchet these up as the gaps close; they are floors, not targets.
        "src/schemas/**": { lines: 95, branches: 95, functions: 85 },
        "src/helpers/**": { lines: 87, branches: 88, functions: 92 },
        "src/utils/**": { lines: 75, branches: 68, functions: 65 },
        "src/stores/**": { lines: 90, branches: 88, functions: 90 },
      },
    },
  },
});