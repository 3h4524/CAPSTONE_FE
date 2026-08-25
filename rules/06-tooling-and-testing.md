# Rule 06 — Tooling, Quality Gates & Testing

## 1. ESLint

- Flat config thật + `lint` script — **CẤM placeholder `echo && exit 0`**.
- `--max-warnings=0` (0 warning được phép).
- Rules bắt buộc:
  - `@typescript-eslint/consistent-type-imports: error`
  - `simple-import-sort` (import group: react/next → external → `@/` → relative)
  - `import/no-default-export` — cấm default export trừ Next.js convention files + config files
  - `no-restricted-imports` — cấm parent-relative `../*` (dùng alias `@/`)
  - `no-unused-vars` với `argsIgnorePattern: '^_'`
  - `react/jsx-key`, `import/first`, `import/no-duplicates`, `import/newline-after-import`
  - Tailwind: `tailwindcss/no-contradicting-classname` error
  - `no-console` (warn)

## 2. TypeScript config chuẩn (mục tiêu)

- `strict: true`
- `verbatimModuleSyntax: true`
- `noUncheckedIndexedAccess: true`
- `noImplicitOverride`, `noFallthroughCasesInSwitch`, `forceConsistentCasingInFileNames`
- `noUnusedLocals` / `noUnusedParameters`

> Config hiện tại mới bật `strict` — các flag còn lại là mục tiêu khi refactor tiếp; code mới viết phải an toàn với cả các flag này.

## 3. Quality gates — thứ tự bắt buộc

```bash
verify rule compliance   # code mới tuân thủ rules
pnpm lint                # eslint --max-warnings=0 + tsc --noEmit
pnpm build
pnpm test                # khi có test suite
```

- Chạy gates trước khi kết thúc task / trước PR.
- Browser verify sau UI change (snapshot + screenshot).

## 4. Testing — nguyên tắc (khi có test suite)

- Testing bắt buộc — test pyramid: **Unit > Integration > E2E**.
- Test tên mô tả behavior; nhóm bằng `describe`; dùng **AAA pattern** (Arrange / Act / Assert).
- Test cả success + error cases; edge/boundary cases.
- Mock dependencies (không real I/O / network).
- CẤM comment narration trong test.
- Ưu tiên table-driven tests khi có nhiều input/output.

### Frontend (Vitest — dự kiến)

- Test colocated với source: `*.test.ts(x)` cạnh file.
- Environment: jsdom cho component test.

### E2E (Playwright — dự kiến)

- Test trong `e2e/`; chromium; baseURL local dev server.
- Test critical user flows (cart, checkout...).
- Sau UI change: browser verify bằng snapshot + screenshot.
