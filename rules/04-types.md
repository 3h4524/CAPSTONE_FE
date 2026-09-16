# Rule 04 — Types & TypeScript Strictness

## 1. Cấm tuyệt đối

- `any`, `as any`, `as unknown as`, `@ts-ignore`, `@ts-nocheck`.
- Cast string → enum chưa validate (dùng zod hoặc type guard).
- `[0]!` / non-null assertion (`!`) khi có `noUncheckedIndexedAccess` — dùng defensive check.
- `@ts-expect-error` chỉ khi thật sự bất khả kháng, có kèm lý do.

## 2. Bắt buộc

- `import type` cho type-only imports (`verbatimModuleSyntax: true`).
- `z.infer` cho form/request types; `interface` cho object shapes public.
- `type` cho: union, intersection, mapped types, type aliases.
- `strict: true`, `noUncheckedIndexedAccess: true`, `verbatimModuleSyntax: true`.

## 3. Rules phụ

- CẤM implicit `any` trong tham số (khai báo type rõ ràng).
- `unknown` thay cho `any` khi parse dữ liệu chưa biết, rồi narrow bằng zod/type guard.
- Enum: dùng `const enum`/union string (prefer zod enum / union type).
- Avoid `any` trong catch block.
- Không lạm dụng `!` — dùng optional chaining / nullish coalescing.
