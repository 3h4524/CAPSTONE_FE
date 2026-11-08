import importPlugin from "eslint-plugin-import";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import tailwindcss from "eslint-plugin-tailwindcss";
import tseslint from "typescript-eslint";

import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";

// Dark mode: light-mode-only neutrals (slate/gray/white) stay light when the theme flips.
// Use the adaptive tokens instead: ink-50…900, card, background, foreground, muted, border.
// Classes behind a `dark:` variant, translucent white overlays (bg-white/10) and the dark half of
// the scale (always-dark islands such as video players) are allowed.
const HARDCODED_NEUTRAL = String.raw`(^|\s)((?!dark:)[a-z0-9\-\[\]&@*>.=]+:)*(text-(slate|gray|zinc|neutral|stone)-(300|400|500|600|700|800|900|950)|(bg|border|border-[trblxy]|divide|ring|from|via|to)-(slate|gray|zinc|neutral|stone)-(50|100|200|300|400)|bg-white(?=\s|$|\x2F[5-9]\d))(?![\w-])`;
const HARDCODED_NEUTRAL_MESSAGE =
  "Hard-coded light neutral breaks dark mode. Use ink-* / bg-card / text-foreground tokens (see src/styles/globals.css).";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      ".next/**",
      "**/.next/**",
      "out/**",
      "public/**",
      ".gitignore",
      "**/dist/**",
      "**/build/**",
      ".agent/**",
    ],
  },
  {
    files: ["**/*.{js,jsx,mjs,cjs,mts,ts,tsx}"],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2020,
      },
    },
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      prettierRecommended,
      tailwindcss.configs["flat/recommended"],
    ],
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      "react-hooks": reactHooks,
      "@next/next": nextPlugin,
      "simple-import-sort": simpleImportSort,
      import: importPlugin,
      react: reactPlugin,
      tailwindcss,
    },
    settings: {
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
        },
      },
      tailwindcss: {
        callees: ["clsx", "cn"],
        config: false,
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      "prettier/prettier": "off",
      "no-console": "warn",
      "require-await": "error",
      // React rules
      "react/jsx-key": "error",
      // TypeScript rules
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Simple Import Sort rules
      "simple-import-sort/exports": "error",
      "simple-import-sort/imports": [
        "error",
        {
          groups: [
            ["^react$", "^next", "^[a-z]"],
            ["^@"],
            ["^~"],
            ["^\\.\\.(?!/?$)", "^\\.\\./?$"],
            ["^\\./(?=.*/)(?!/?$)", "^\\.(?!/?$)", "^\\./?$"],
            ["^.+\\.s?css$"],
            ["^\\u0000"],
          ],
        },
      ],
      "import/first": "error",
      "import/newline-after-import": "error",
      "import/no-duplicates": "error",
      "import/no-default-export": "error",
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../*"],
              message: "Use the '@/' alias instead of parent relative imports.",
            },
          ],
        },
      ],
      // Tailwind CSS v4 rules
      "tailwindcss/classnames-order": "warn",
      "tailwindcss/enforces-negative-arbitrary-values": "warn",
      "tailwindcss/enforces-shorthand": "warn",
      "tailwindcss/migration-from-tailwind-2": "off", // Not needed for v4
      "tailwindcss/no-arbitrary-value": "off",
      "tailwindcss/no-contradicting-classname": "error",
      "tailwindcss/no-custom-classname": "off",
      "tailwindcss/no-unnecessary-arbitrary-value": "warn",
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      "**/*.test.{ts,tsx}",
      // Always-dark surfaces (video players, dark insight panel) intentionally use fixed slate.
      "src/components/dashboard/growth-insights.tsx",
      "src/components/workflows/media/storyboard-player.tsx",
      "src/components/workflows/media/preloaded-video.tsx",
      "src/components/workflows/media/video-preview-frame.tsx",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        { selector: `Literal[value=/${HARDCODED_NEUTRAL}/]`, message: HARDCODED_NEUTRAL_MESSAGE },
        { selector: `TemplateElement[value.raw=/${HARDCODED_NEUTRAL}/]`, message: HARDCODED_NEUTRAL_MESSAGE },
      ],
    },
  },
  // Playwright keeps shared helpers in e2e/support/ and the specs in per-project folders, so a spec
  // has to reach upward to reach them. The '@/' alias only maps into src/, which must not contain
  // E2E helpers, so the parent-relative import is the only option here.
  {
    files: ["e2e/**/*.ts"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  // Allow default export in Next.js convention files
  {
    files: [
      "**/page.{js,jsx,ts,tsx}",
      "**/layout.{js,jsx,ts,tsx}",
      "**/loading.{js,jsx,ts,tsx}",
      "**/error.{js,jsx,ts,tsx}",
      "**/not-found.{js,jsx,ts,tsx}",
      "**/template.{js,jsx,ts,tsx}",
      "**/default.{js,jsx,ts,tsx}",
      "**/route.{js,ts}",
    ],
    rules: {
      "import/no-default-export": "off",
    },
  },
  // Allow default export in config files
  {
files: [
      "**/*.config.{js,ts,mjs,cjs,mts,cts}",
      "eslint.config.{js,ts,mjs,cjs,mts,cts}",
      "next.config.{js,ts,mjs,cjs,mts,cts}",
      "postcss.config.{js,ts,mjs,cjs,mts,cts}",
      "tailwind.config.{js,ts,mjs,cjs,mts,cts}",
      "**/i18n/request.{js,ts,mjs,mts}",
    ],
    rules: {
      "import/no-default-export": "off",
    },
  }
);
