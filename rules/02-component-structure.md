# Rule 02 — Component & File Structure

## 1. shadcn/ui primitives — BẮT BUỘC

- Dự án có shadcn/ui → **mọi UI building block bắt buộc dùng shadcn primitives** (`Button`, `Input`, `Dialog`, `Select`, `Card`, `Table`, `Skeleton`, `Form`...).
- **CẤM** tự viết component UI từ scratch hoặc dùng thư viện khác khi shadcn đã có sẵn.
- Thiếu component → install qua `npx shadcn@latest add <component>`.

### Customize shadcn — được phép sửa khi cần

- **ĐƯỢC PHÉP sửa shadcn source file** khi cần customize **global**.
- **Dùng riêng vài chỗ** → ưu tiên dùng `variant` hoặc truyền `className` tại chỗ.
- Khi sửa source shadcn: sửa có chủ đích, giữ cấu trúc/API của shadcn.

## 2. 1 file = 1 component

- Mỗi file chỉ chứa 1 component.
- Exception DUY NHẤT:
  - `components/ui/*` shadcn compound components.
  - Next.js convention files (page/layout/loading/error/not-found/route/template/default).

## 3. KHÔNG logic nghiệp vụ trong component

Component chỉ phối hợp: JSX + hook + handler đơn giản.

| Loại logic | Nơi để |
|---|---|
| Fetch / query / mutation | `hooks/queries/` + `hooks/mutations/` |
| HTTP call | `api/client.ts` (HttpClient duy nhất, khi có backend) |
| Format / transform | `helpers/` |
| Validation | `schemas/` |
| Constants | `constants/` |
| State dùng chung | `stores/` (zustand, state-only) |

CẤM: `useEffect` + `setState` + fetch thủ công khi đã có TanStack Query; logic map/transform phức tạp ngay trong JSX.

## 4. Chia component

- Block `.map()` render JSX > ~30 dòng → tách sub-component riêng.
- Component > ~150 dòng → xem xét tách phần render phụ hoặc tách logic ra hook/helper.
- Component chịu trách nhiệm đúng 1 việc rõ ràng (single responsibility).

## 5. Sub-folder — quy tắc chung cho MỌI folder

Mọi folder (không riêng `commons/`) khi chứa nhiều nhóm nội dung khác nhau → **chia sub-folder theo chủ đề**, không đổ hết file vào 1 nơi.

- `commons/icons/`, `commons/layout/`, `commons/toast/`
- Screen lớn: `checkout/steps/`, `product/detail/`, `landing/sections/`
- `hooks/queries/` + `hooks/mutations/`
- `providers/global/`

Nguyên tắc: mở folder lên phải nhìn ra ngay cấu trúc; nhóm ≥ 2-3 file cùng chủ đề → gom sub-folder. Sub-folder = noun lowercase kebab-case.

## 6. Tổ chức components — Screen-based

Components chia theo **màn hình (screen)**: mỗi màn hình có folder riêng chứa toàn bộ component của màn hình đó. KHÔNG dùng atomic design, KHÔNG chia theo abstraction level.

```
components/
├── ui/                  # shadcn primitives (compound được phép)
├── commons/             # dùng chung ≥ 2 màn hình — LUÔN có sub-folder
│   ├── icons/           # logo, social-icons...
│   ├── layout/          # container, nav, shell...
│   └── toast/           # global-toast
├── seo/                 # SEO-only components
├── landing/             # Màn landing: hero-section...
└── (từng màn mới)       # product/, cart/, checkout/, order/, user/... = 1 folder / màn hình
```

### Quy tắc

1. **Chia theo màn hình**: component chỉ xuất hiện ở 1 màn hình → nằm trong folder màn hình đó. Ví dụ màn checkout có `CheckoutForm`, `OrderSummary`, `PaymentMethods` → tất cả bỏ vào `checkout/`.
2. **Dùng chung ≥ 2 màn hình → `commons/<sub>/`**: bắt buộc qua sub-folder, KHÔNG bỏ file lỏng trực tiếp trong `commons/`.
3. `ui/` = shadcn output only; `seo/` = SEO-only.
4. Component trong folder **không lặp prefix folder**: `landing/hero-section.tsx` (không phải `landing/landing-hero.tsx`).

### Cấu trúc hiện tại

```
src/components/
├── ui/                        # shadcn: button, input, label, separator, spinner, textarea
├── commons/
│   ├── icons/                 # Logo
│   ├── layout/                # Container
│   └── toast/                 # GlobalToast
├── seo/                       # JsonLdScripts, OgImageCard, OrganizationJsonLd
└── landing/                   # HeroSection
```

## 7. Tách file rõ ràng (separate files)

- Hook: 1 file 1 hook (`hooks/queries/use-product-list.ts`).
- Helper: 1 file 1 chủ đề (`helpers/log.ts`, `helpers/toast.ts`); tiện ích low-level để `utils/` (`utils/cn.ts`, `utils/uuid.ts`).
- Schema: `schemas/<domain>.ts`, type dùng `z.infer`.
- Constants: 1 file 1 chủ đề (`constants/routes.ts`, `constants/site.ts`).
