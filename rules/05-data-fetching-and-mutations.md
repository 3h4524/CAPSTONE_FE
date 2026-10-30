# Rule 05 — Data Fetching & Mutations (TanStack Query)

## 1. SSR policy

- **App thuần tương tác → không cần SEO nhiều → KHÔNG dùng SSR làm data layer.** Mọi trang là client component; data fetch bằng **TanStack Query + axios** phía client — cache sẵn, không tốn chi phí server render.
- SSR CHỈ khi: (a) màn public cần SEO/indexable, (b) cần server-only data, (c) cần `generateMetadata`.

## 2. API client duy nhất

- Mọi HTTP call tới backend qua axios instance `api` từ `src/api/client.ts` (`api.get/post/put/patch/delete`).
- Auth dùng **HttpOnly cookie** do backend set khi login/refresh. Client JS **không đọc, không lưu token** (không localStorage, không header `Authorization` tự gắn).
- Client tự lo cross-cutting:
  - `withCredentials: true` → browser tự gắn access/refresh cookie (cross-origin).
  - Nhận **401** → `refreshAccessTokenOnce()` (dedup mọi request đang chờ, gọi `/api/auth/refresh`) → **retry request gốc đúng 1 lần**; refresh fail → `useAuthStore.getState().clearSession()`.
  - `baseURL` từ `NEXT_PUBLIC_API_BASE_URL`; lỗi trả về là `AxiosError` để `getErrorMessage` đọc được.
- **Component/hook KHÔNG gọi `fetch` trực tiếp tới backend và KHÔNG tự tạo axios instance.** Lý do: `fetch` thô không có `baseURL`, `credentials`, refresh + retry 401 hay shape lỗi chung; mỗi chỗ tự viết lại sẽ lệch nhau và dễ hỏng phiên đăng nhập. Không có "fetch wrapper" riêng — wrapper duy nhất là `api`.
- **Streaming (SSE / chunked)**: vẫn dùng `api`, bật fetch adapter của axios:

  ```ts
  const response = await api.post<ReadableStream<Uint8Array>>(url, body, {
    adapter: "fetch",
    responseType: "stream",
    signal,
  });
  const reader = response.data.getReader();
  ```

  401 bị reject trước khi đọc body nên interceptor refresh + retry vẫn chạy. Parse stream đặt ở `helpers/`, gọi API đặt ở `src/api/<domain>.ts`.
- Ngoại lệ được phép dùng `fetch` thô:
  - URL **không phải backend** (CDN/media công khai để lấy blob), đặt trong `helpers/` hoặc `src/api/`.
  - Server-side (Server Component/route) cần chuyển tiếp cookie của request, ví dụ `src/api/session.ts` (`cookies()` → header `Cookie`).

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
