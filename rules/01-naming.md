# Rule 01 — Naming Conventions

## 1. Files & directories

| Đối tượng | Rule | Ví dụ |
|---|---|---|
| File TS/TSX | `kebab-case` | `format.ts`, `use-cart.ts`, `product-card.tsx` |
| Hook | `use-*.ts` | `use-cart.ts`, `use-product-search.ts` |
| Test file | `*.test.ts`, `*.spec.ts` | `format.test.ts` |
| Thư mục | kebab-case, phân theo domain/feature | `components/product/`, `components/cart/` |

## 2. Components (FE)

- File component: `kebab-case.tsx`.
- **1 file = 1 component**.
- Component trong folder domain **không lặp prefix domain**: `cart/cart-item.tsx` (không phải `cart-item-component`).
- Component dùng chung ≥ 2 màn hình → `components/commons/<sub>/`.

## 3. Code (JS/TS)

| Đối tượng | Rule | Ví dụ |
|---|---|---|
| Variable | `camelCase` | `cartCount` |
| Boolean | prefix `is` / `has` / `can` / `should` | `isLoading`, `hasItems`, `canCheckout` |
| Hàm | động từ, mô tả hành động | `calculateTotal()`, `formatPrice()` |
| Class | `PascalCase` + suffix | `CartService`, `ProductDto` |
| Interface | `PascalCase` | `CartItem`, `ProductVariant` |
| Constant | `UPPER_SNAKE_CASE` | `MAX_CART_ITEMS`, `API_BASE_URL` |
| Enum value | lowercase string value | `enum OrderStatus { PENDING = 'pending' }` |
| Type (TS) | `PascalCase` | `OrderStatus` |

## 4. Endpoints & routing

- REST: **plural noun**: `GET/POST /products`, `GET /orders`.
- CẤM action trong URL: `POST /products/create`.
- HTTP status chuẩn: POST → 201, GET → 200, PUT/PATCH → 200, DELETE → 204.

## 5. Function naming (A/HC/LC pattern)

Cấu trúc: `prefix? + action (A) + high context (HC) + low context? (LC)`.

- Phân biệt rõ: `get` (truy cập ngay) / `set` / `fetch` (request mất thời gian) / `remove` (bỏ khỏi tập hợp) / `delete` (xoá vĩnh viễn).
- S-I-D: name phải **S**hort, **I**ntuitive, **D**escriptive.
- CẤM viết tắt, cấm lặp context.
- Tên luôn tiếng Anh.
