# Rule 08 — Forbidden Practices & Compliance Check

## Phần 1 — CẤM KỴ

### Code

1. **CẤM comment trong code** — code tự diễn giải qua tên biến/hàm.
2. **CẤM `any`, `as any`, `as unknown as`, `@ts-ignore`, `@ts-nocheck`**.
3. **CẤM cast string → enum** chưa validate.
4. **CẤM `[0]!`** non-null assertion — dùng defensive check.
5. **CẤM đổi text nút verb → verb_ing** khi pending — chỉ `disabled`, text BẤT BIẾN.
6. **CẤM useState thủ công + manual validation** cho form khi có thể dùng RHF + zod.
7. **CẤM logic nghiệp vụ trong component**.
8. **CẤM schema zod duplicate**.
9. **CẤM tạo folder `lib/` mới** — dùng `server/ api/ helpers/ schemas/ utils/`.
10. **CẤM empty catch** — phải log.
11. **CẤM dead code** — export không dùng phải xóa.
12. **CẤM `console.log`** trong production code — dùng logger.
13. **CẤM default export** ngoài Next.js convention files + config files.
14. **CẤM parent-relative import `../*`** — dùng alias `@/`.
15. **CẤM `var`**, magic numbers, viết tắt tên biến khó hiểu.
16. **CẤM over-engineering**.

### Git / Workflow

17. **CẤM commit `.env`, secrets**; CẤM `git add .`.
18. **CẤM comment lên GitHub PR**.
19. **CẤM commit trực tiếp / force push lên `main`**.
20. **CẤM sửa code ngoài scope feature** — trừ khi task refactor được yêu cầu.

## Phần 2 — POST-IMPLEMENTATION COMPLIANCE CHECK (BẮT BUỘC)

### Bắt buộc sau khi code xong

Trước khi xem task là xong, phải **verify code vừa viết tuân thủ toàn bộ rule & convention**:

1. **Rule chung** — `rules/README.md` + các file `rules/*.md`.
2. **Rule per-project** — `rules/projects/capstone.md`.
3. Chạy lại các **grep check nhanh** trên code mới.
4. Kiểm tra **code cũ bị đụng tới** không bị phá vỡ.

### Checklist verify trước khi kết thúc

```markdown
- [ ] Naming: file kebab-case, class PascalCase, biến camelCase, constant UPPER_SNAKE_CASE
- [ ] 1 file = 1 component; không logic nghiệp vụ trong component
- [ ] Component nằm đúng folder màn hình; dùng chung → commons/<sub>/; folder đông file có sub-folder
- [ ] UI dùng shadcn primitives — cấm tự viết/thay thư viện khác
- [ ] Loading data dùng skeleton (không spinner cho vùng data lớn)
- [ ] Trang không cần SEO → client component, không SSR
- [ ] Form dùng RHF + zod; schema ở src/schemas/
- [ ] Không `any`, `as any`, `@ts-ignore`, cast string → enum
- [ ] Mutation dùng `mutate()` (không async); onSuccess/onError tại call-site
- [ ] Mutation/Query nằm trong custom hook wrapper
- [ ] Hook được destructure khi dùng, alias khi nhiều hook
- [ ] Mutation ưu tiên cập nhật cache/state — không refetch
- [ ] Nút pending chỉ `disabled`, text bất biến
- [ ] CẤM comment trong code
- [ ] Không import parent-relative `../*`; dùng alias `@/`
- [ ] Không commit secrets/.env
- [ ] Gates chạy pass: lint → typecheck → build → test
- [ ] UI change → browser verify (snapshot + screenshot)
```

### Kiểm tra nhanh (commands)

```bash
# any / cast
grep -rEn "as any|as unknown as|@ts-ignore|@ts-nocheck|: any" src --include="*.ts" --include="*.tsx"

# Text-swap verb → verb_ing trên nút
grep -rEn "isPending \? |isSubmitting \?" src --include="*.tsx"

# Comment trong code
grep -rEn "^\s*//\s*[A-Za-zÀ-ỹ]" src --include="*.ts" --include="*.tsx" | grep -v "// eslint" | grep -v "// @"
```

### Khi phát hiện vi phạm

- **Code vừa viết** vi phạm → sửa ngay trước khi kết thúc task.
- **Code cũ (legacy)** vi phạm → KHÔNG sửa ngoài scope, báo reviewer.
