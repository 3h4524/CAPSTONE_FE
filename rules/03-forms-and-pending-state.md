# Rule 03 — Forms, Validation & Pending State

## 1. RHF + zod BẮT BUỘC ngay từ đầu

- Mọi form dùng `react-hook-form` + `zodResolver` (deps đã cài sẵn) — không có ngoại lệ.
- **CẤM** useState thủ công + manual validation + FormData thủ công cho form.
- Field UI dùng shadcn (`Form`, `Input`, `Field`... sau khi add component tương ứng).

## 2. Schema tách riêng — CẤM duplicate

| Tầng | Nơi để schema |
|---|---|
| FE | `src/schemas/<domain>.ts` — type dùng `z.infer` |

- CẤM khai báo schema zod trùng ở 2 nơi.
- CẤM cast string → enum chưa validate (phải qua zod hoặc type guard).

## 3. Ví dụ chuẩn

```tsx
// src/schemas/product.ts
export const productSchema = z.object({
  name: z.string().min(3),
  price: z.coerce.number().min(0),
})
export type ProductFormValues = z.infer<typeof productSchema>

// Component
const form = useForm<ProductFormValues>({ resolver: zodResolver(productSchema) })
const mutation = useCreateProduct()
const onSubmit = (values: ProductFormValues) => {
  mutation.mutate(values, { onSuccess: () => form.reset() })
}
```

## 4. Nút pending: chỉ `disabled`

- Khi submit/pending, nút chỉ cần `disabled={...}` (+ spinner nhỏ tùy chọn).
- **CẤM** đổi text nút từ verb → verb_ing. Text nút BẤT BIẾN.

```tsx
// ✅ Đúng
<Button type="submit" disabled={isSubmitting}>Submit</Button>

// ❌ Sai — đổi text nút khi pending
<Button type="submit" disabled={isSubmitting}>
  {isSubmitting ? "Submitting" : "Submit"}
</Button>
```

## 5. Nguồn pending chuẩn

| Loại | Nguồn |
|---|---|
| Form | `isSubmitting` từ react-hook-form |
| Mutation | `isPending` từ TanStack Query mutation |
| Query | loading state của query hook |

- **CẤM** useState boolean thủ công chỉ để đổi text nút.

## 6. Loading list/data

- Dùng loading state của query hook.
- **Loading UI mặc định = skeleton** — dùng shadcn `Skeleton` cho list/table/card/detail/page.
- Spinner chỉ dùng cho action nhỏ gọn (nút, icon action).

```tsx
// ✅ Đúng — skeleton theo layout data
{isPending ? (
  <div className="space-y-2">
    <Skeleton className="h-4 w-2/3" />
    <Skeleton className="h-4 w-1/2" />
  </div>
) : (
  <ProductList items={data} />
)}
```
