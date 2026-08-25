# Capstone FE — Print-on-Demand Frontend

Frontend của dự án capstone: web app **print-on-demand** xây trên **Next.js 16 (App Router)**.

**Vì sao client-side?** App thuần tương tác (cần đăng nhập, thao tác liên tục trên sản phẩm/cart/checkout)
→ **không cần SEO nhiều**, nên mọi trang là **client component** và data fetch bằng
**TanStack Query + Axios** phía client — cache sẵn, không tốn chi phí server render.

> Repo backend (`CAPSTONE_BE`) sẽ nằm cạnh repo này trong workspace `~/fpt/capstone/`.

## 🚀 Tech Stack

- **Framework:** [Next.js 16 (App Router)](https://nextjs.org/) + React 19
- **Language:** TypeScript
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Components:** [shadcn/ui](https://ui.shadcn.com/)
- **Data Fetching:** [TanStack Query](https://tanstack.com/query/latest) + [Axios](https://axios-http.com/) (tự động gắn token + retry sau refresh 401)
- **State Management:** [Zustand](https://zustand.docs.pmnd.rs/) (thuần zustand cho client/UI state)
- **Forms:** [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **Toasts:** [Sonner](https://sonner.emilkowal.ski/) qua helper `showToast(type, message)`
- **Linting & Formatting:** ESLint (Flat Config), Prettier

## Project structure

```
src/
├── app/                    # App Router pages + SEO convention files (sitemap, robots, manifest, og-image...)
├── api/
│   └── client.ts           # HttpClient duy nhất (axios) + refresh-token retry (localStorage)
├── components/
│   ├── ui/                 # shadcn primitives — chỉ output của `shadcn add`
│   ├── commons/
│   │   ├── icons/          # SVG icon dùng chung (logo)
│   │   ├── layout/         # Container
│   │   └── toast/          # GlobalToast (sonner Toaster)
│   ├── seo/                # JsonLdScripts, OgImageCard, OrganizationJsonLd
│   └── landing/            # Màn landing (HeroSection)
├── helpers/                # Utility theo chủ đề (log.ts, toast.ts, error-message.ts)
├── hooks/
│   ├── queries/            # use-query.ts wrapper gốc + feature query hooks
│   └── mutations/          # use-mutation.ts wrapper gốc + feature mutation hooks
├── utils/                  # Tiện ích low-level (cn.ts, uuid.ts)
├── constants/              # site.ts
├── data/                   # Metadata kernel (getSiteMetadata, getPageMetadata)
├── providers/global/       # ReactQueryProvider
├── types/                  # Shared types
└── styles/                 # globals.css
```

### Component convention

- **1 màn hình = 1 folder**: màn mới (product, cart, checkout...) → tạo folder riêng trong `components/`.
- Dùng chung ≥ 2 màn hình → `commons/<sub>/` (luôn có sub-folder).
- Mọi folder đông file → chia tiếp sub-folder theo chủ đề.
- Form bắt buộc **React Hook Form + Zod ngay từ đầu**, schema để ở `schemas/` (tạo khi có form đầu tiên).

## Single sources of truth

- `src/constants/site.ts` — `SITE_CONFIG` (name, description, base URL, locale).

## 🛠 Prerequisites

- **Node.js**: `>=22.0.0`
- **pnpm**: `>=10.0.0`

## Setup

```bash
pnpm install
cp .env.example .env.local
```

## ⚡️ Development

```bash
pnpm dev        # http://localhost:3000
pnpm lint       # eslint --fix --max-warnings=0 && tsc --noEmit (tự động fix)
pnpm build
```

## Commit convention

[Conventional Commits](https://www.conventionalcommits.org/) — `type(scope): subject`,
ví dụ `feat(cart): add cart drawer`, `fix: correct nav active state`.

## Rules & conventions

Chi tiết coding conventions nằm trong [`rules/`](./rules/README.md) — đọc trước khi viết code mới.
