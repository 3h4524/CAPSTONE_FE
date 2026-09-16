# Capstone FE — Rules & Conventions

> Rules cho repo `CAPSTONE_FE` (print-on-demand frontend). Mỗi rule là 1 file riêng.
> Repo này là **frontend duy nhất** của workspace `~/fpt/capstone` (`CAPSTONE_BE` sẽ nằm cạnh sau).

---

## ⚠️ Phạm vi áp dụng

- Các rule áp dụng cho **code mới / code được viết từ nay về sau**.
- **KHÔNG** refactor code cũ để ép theo rule, **trừ khi** có task refactor được yêu cầu.
- Khi sửa file cũ: code mới thêm vào file đó phải theo rule; code cũ không buộc phải sửa lại.

---

## 1. Rules

| # | Rule | File chi tiết |
|---|---|---|
| 1 | Đặt tên nhất quán (file/component/hook) | [`01-naming.md`](./01-naming.md) |
| 2 | Cấu trúc component: screen-based, sub-folder, không logic trong component | [`02-component-structure.md`](./02-component-structure.md) |
| 3 | Forms: RHF + zod ngay từ đầu; loading/pending state chuẩn | [`03-forms-and-pending-state.md`](./03-forms-and-pending-state.md) |
| 4 | Types: cấm `any`, `import type`, strictness | [`04-types.md`](./04-types.md) |
| 5 | Data fetching & mutations: API client, TanStack Query, `mutate()` không async | [`05-data-fetching-and-mutations.md`](./05-data-fetching-and-mutations.md) |
| 6 | Tooling, quality gates & testing | [`06-tooling-and-testing.md`](./06-tooling-and-testing.md) |
| 7 | Git workflow, commit conventions & security | [`07-git-and-security.md`](./07-git-and-security.md) |
| 8 | Cấm kỵ tổng hợp + post-implementation compliance check | [`08-forbidden-and-compliance.md`](./08-forbidden-and-compliance.md) |

---

## 2. Project — Capstone Print-on-Demand Frontend

- **Type**: Frontend-only (Next.js App Router)
- **Stack**: Next.js 16 + React 19 + shadcn/ui + Tailwind CSS v4 + TanStack Query + React Hook Form + Zod
- **SSR**: Không cần — chủ yếu tương tác, trang là client component. SSR CHỈ khi cần SEO/server-only data/`generateMetadata`
- **Component Pattern**: **Screen-based** (chi tiết ở [`02-component-structure.md`](./02-component-structure.md))

### Folder structure hiện tại

```
src/
├── app/              # Next.js App Router pages (1 màn hình = 1 route group/folder)
├── api/
│   └── client.ts     # HttpClient duy nhất (axios) + refresh-token retry
├── components/
│   ├── ui/           # shadcn primitives
│   ├── commons/      # icons/, layout/, toast/, ... (dùng chung ≥ 2 màn hình)
│   ├── seo/          # JSON-LD, OG image card
│   └── landing/      # Màn landing
├── hooks/
│   ├── queries/      # use-query.ts wrapper gốc + feature query hooks
│   └── mutations/    # use-mutation.ts wrapper gốc + feature mutation hooks
├── helpers/          # Pure utility theo chủ đề (log, toast/notify, error-message...)
├── utils/            # Tiện ích low-level (cn, uuid)
├── constants/        # site.ts
├── types/            # TypeScript types
├── providers/        # React providers (global/)
├── data/             # Metadata kernel
└── styles/           # Global styles
```

Folder `schemas/`, `stores/` sẽ được thêm khi có form/state thực tế.

### Tech decisions

- **State management**: **thuần Zustand** — mọi client/UI state (cart, preferences, UI flags...) qua zustand stores (`stores/<domain>.ts`). Store là state-only: KHÔNG gọi API trực tiếp trong store; server state/cache do TanStack Query quản lý.
- **Styling**: Tailwind CSS v4 + shadcn/ui primitives (bắt buộc dùng shadcn, cấm thư viện khác).
- **Forms**: React Hook Form + Zod resolver + zod schema tách riêng `schemas/<domain>.ts`.
- **Data fetching**: TanStack Query + axios (`api/client.ts`) — HTTP đi qua HttpClient duy nhất, tự động gắn access token từ localStorage và retry sau refresh 401.
- **Notify**: `showToast(type, message)` từ `helpers/toast.ts`.
- **Icons**: Lucide React + custom SVG trong `commons/icons/`.
- **Logging**: consola qua `helpers/log.ts` — cấm `console.log`.

---

## 3. Tóm tắt nhanh (must-know)

1. **CẤM comment trong code** — code tự diễn giải qua tên biến/hàm.
2. **Commit format**: `type(scope): description` — scope optional.
3. **Chỉ commit/push/PR khi user yêu cầu.** Dùng `gh` cho PR.
4. **Quality gates trước khi kết thúc task**: verify compliance → `lint` → `typecheck` → `build` → `test`.
5. **Browser verify sau UI change**: snapshot + screenshot.
6. **CẤM** `any`, `as any`, `as unknown as`, `@ts-ignore`, `@ts-nocheck`.
7. **CẤM** commit `.env`, secrets, credentials.
8. Trò chuyện/plan bằng **tiếng Việt**; code, tên biến, commit, PR giữ **tiếng Anh**.
9. Mọi form dùng **RHF + zod** ngay từ đầu. Nút pending chỉ `disabled`, text BẤT BIẾN.
10. Component organization: **screen-based** — 1 màn hình = 1 folder; dùng chung → `commons/<sub>/`; folder đông file → chia sub-folder.
11. Mutation: ưu tiên `mutate()` không async; `onSuccess`/`onError` truyền tại call-site.
12. **Loading luôn skeleton** (shadcn `Skeleton`) cho list/table/card/detail.
13. **Không cần SEO → không SSR** — trang là client component.
14. **Query/Mutation luôn là custom hook wrapper** — component CẤM gọi `useQuery`/`useMutation` trực tiếp.
