# Rule 09 — Metadata (1 loại duy nhất)

Mọi route định nghĩa metadata bằng ** đúng 1 cách**: helper `getPageMetadata` từ
`data/metadata.ts`, gán static trong file `page.tsx` (hoặc `not-found.tsx`) của route đó.

```tsx
import type { Metadata } from "next";

import { getPageMetadata } from "@/data/metadata";

export const metadata: Metadata = getPageMetadata({
  title: "API keys",
  description: "Review your connected services and workspace readiness.",
  pathname: "/api-keys",
  robots: { index: false, follow: false },
});
```

Export `metadata` BẮT BUỘC annotate tường minh kiểu `Metadata` từ `"next"`.

## Quy tắc

1. **Title để bare** — KHÔNG tự gắn suffix `" | APCS"`. Root layout đã khai báo
   `title.template = "%s | APCS"`, Next tự ráp. Hardcode suffix render ra title double.
2. **`pathname`** = path public của route (canonical + OG url). Route không có URL ổn
   định (`not-found`) được bỏ qua.
3. **Route cần login** (mọi page dưới `(private)`, `(admin)`, trang auth) BẮT BUỘC
   `robots: { index: false, follow: false }`.
4. **Root layout giữ `getSiteMetadata()`** — group layout và page KHÔNG redefine base
   (applicationName, icons, OG image, twitter...).
5. **CẤM object `Metadata` inline** trong route (`export const metadata = { title: ... }`).
6. **CẤM `generateMetadata` dạng function** khi không cần params/async — dùng static const.
   Chỉ dùng function khi metadata phụ thuộc params hoặc data fetch.
