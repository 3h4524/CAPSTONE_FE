# Rule 05 — Data Fetching & Mutations (TanStack Query)

## 1. SSR policy

- **App thuần tương tác → không cần SEO nhiều → KHÔNG dùng SSR làm data layer.** Mọi trang là client component; data fetch bằng **TanStack Query + axios** phía client — cache sẵn, không tốn chi phí server render.
- SSR CHỈ khi: (a) màn public cần SEO/indexable, (b) cần server-only data, (c) cần `generateMetadata`.

## 2. API client duy nhất

- Mọi HTTP call qua axios instance `api` từ `src/api/client.ts` (`api.get/post/patch/delete`).
- Client tự lo cross-cutting:
  - Gắn `Authorization: Bearer <accessToken>` lấy từ **localStorage** vào mọi request.
  - Nhận **401** → gọi refresh endpoint (refresh token cũng ở localStorage) → **retry request gốc đúng 1 lần**; refresh fail → clear tokens.
- **Component/hook KHÔNG gọi `fetch` hay tự tạo axios instance.**

## 3. TanStack Query (client data)

- Client data → TanStack Query (`hooks/queries/` + `hooks/mutations/`).
- Query key dùng factory export (`xxxQueryKey(...)`), không string inline.

```ts
// ✅ Đúng — query key factory
export const productQueryKey = (params: ProductListParams) => ["products", params] as const

// ❌ Sai — string inline
["products-list", "user-123"]
```

## 4. Server-only boundary

- Code chạm backend server-side phải ở `src/server/` + `import "server-only"`.

## 5. Mutation: ưu tiên `mutate()` — không dùng async

- Gọi mutation qua `mutate(data, { onSuccess, onError })` — **KHÔNG** dùng `mutateAsync` + `await` trong handler thông thường.
- `mutateAsync` chỉ dùng khi thật sự cần await kết quả.

```tsx
// ✅ Đúng — destructure + fire via mutate
const { mutate: createProduct } = useCreateProduct()
const onSubmit = (values: ProductFormValues) => {
  createProduct(values, {
    onSuccess: () => { /* đóng dialog, toast, reset form... */ },
    onError: (err) => { /* hiển thị lỗi */ },
  })
}
```

## 6. Callbacks truyền tại call-site (component)

- `onSuccess` / `onError` làm việc liên quan state component → truyền **ngay tại component**.
- Side-effect chung cho toàn app → mặc định trong hook.

## 7. Ưu tiên cập nhật state/cache — không refetch lại

**Sau mutation, ưu tiên cập nhật cache + state sẵn có thay vì refetch lại.**

| Tình huống | Cách xử lý |
|---|---|
| Response trả đủ dữ liệu mới | `setQueryData` cập nhật đúng entry trong cache |
| Cần phản hồi ngay, không chờ server | **Optimistic update** + rollback |
| Dữ liệu liên quan phức tạp | `invalidateQueries` — dùng cuối cùng |

## 8. Query & Mutation — custom hook wrapper + bắt buộc destructure

### 8.1 Hook wrapper 2 tầng

- **Component CẤM gọi `useQuery`/`useMutation` trực tiếp** — phải qua custom hook riêng.
- Custom hook feature bên trong gọi **wrapper gốc của project** (`hooks/queries/use-query.ts`, `hooks/mutations/use-mutation.ts`) — **KHÔNG import trực tiếp từ `@tanstack/react-query`**.
- Notify lỗi mặc định qua `showToast("error", rawMessage)`; tắt bằng `suppressErrorToast: true`.

### 8.2 Dùng hook — BẮT BUỘC destructure

- Khi dùng hook: **phải destructure** ra đúng cái cần.
- Component gọi **nhiều hook cùng lúc** → dùng **alias**.

```tsx
// ✅ Đúng
const { data: products, isPending: isLoadingProducts } = useProductList(params)
const { mutate: updateProduct, isPending: isUpdating } = useUpdateProduct()

// ❌ Sai
const productsQuery = useProductList(params)
const updateMutation = useUpdateProduct()
updateMutation.mutate(values)
```

### 8.3 File & scope

- 1 file 1 hook: `hooks/queries/use-product-list.ts`, `hooks/mutations/use-update-product.ts`.
- CẤM logic nghiệp vụ trong component.
