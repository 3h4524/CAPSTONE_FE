# Rule 07 — Git Workflow & Security

## 1. Commit format (bắt buộc)

```
type(scope): description
```

- `type` ∈ `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `style`, `ci`, `build`, `revert`, `hotfix`.
- `scope` optional (ticket key hoặc tên phần đang làm); repo chưa gắn ticket system thì bỏ scope.
- Imperative mood, lowercase, không dấu chấm cuối, ≤ 72 ký tự.

```
feat: add product listing page
fix(cart): correct total calculation
```

## 2. Branch

- Tách từ `main`: `feat/*`, `fix/*`, `refactor/*`, `chore/*` — lowercase, hyphen, ≤ 50 chars.
- CẤM commit trực tiếp lên `main`.

## 3. PR

- PR vào `main`.
- **Squash and merge** (ưu tiên).
- Title ngắn gọn (< 70 chars) hoặc `[SCOPE] brief description`.
- Body: Summary, thay đổi chính, checklist đã test local.
- Stage file cụ thể — **KHÔNG `git add .`**.

## 4. Quy trình

- Chỉ commit/push/PR **khi user yêu cầu**.
- Dùng `gh` cho PR.

---

## 5. Secrets & Security

### Cấm tuyệt đối

- **CẤM commit `.env`** — dùng `.env.example` làm template.
- **CẤM commit credentials, secrets, tokens, mật khẩu** dưới mọi hình thức.
- CẤM log secrets/PII.
- CẤM hardcode API keys trong code.

### Bảo vệ

- `.gitignore` luôn chặn `.env*`, `.env.local`, `.env.production`.
- Env vars đọc tập trung qua config/constants — không đọc rải rác trong code.
