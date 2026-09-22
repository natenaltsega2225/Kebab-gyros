# Kebab Gyros Enterprise Backend

Backend-only Next.js App Router API using Node.js and MySQL. It is designed to support the restaurant website plus an authenticated admin dashboard.

## Implemented admin capabilities

- Dashboard summary metrics.
- Menu: list, search, add, edit, delete, price changes, active/inactive, Popular flag, reorder, and image upload/change.
- Categories: add, edit, delete, activate/deactivate, reorder.
- Restaurant: update restaurant name, address, phone, email, Google Maps URL, order-online URL, and logo URL.
- Working hours: edit Sunday through Saturday, including closed days, opening/closing time, and notes.
- Admin users: create, edit, deactivate, delete, reset another user's password, roles (`admin` and `manager`).
- Enterprise authentication: username/email login, bcrypt password hashing, failed-login lockout, database-backed sessions, logout, first-login forced password change, forgot-password/reset-password one-time tokens, session revocation after password reset, and audit logs.
- New-user onboarding: an admin creates a user; the backend generates a random temporary password and emails the username + temporary password. The user is marked `mustChangePassword` and cannot use protected management APIs until they change it.

`Popular` is exposed as a virtual public category. Each item has an `is_popular` flag, so an item can remain in `Sandwiches`, `Plates`, etc. while also appearing under `Popular`.

## Installation

1. Copy this entire folder over the repository's `backend/` folder.
2. `cd backend`
3. `cp .env.example .env`
4. Fill in MySQL, JWT, admin and SMTP settings.
5. Install packages: `npm install`
6. For a new DB: `mysql -u root -p < sql/schema.sql`
7. If you previously installed the earlier backend schema, use `sql/upgrade-v1-to-v2.sql` instead of recreating your data. Review it first and back up the database.
8. Create/bootstrap the first administrator: `npm run admin:create`
9. Run: `npm run dev`

Backend default: `http://localhost:4000`.

## SMTP

Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM` so new-user temporary credentials and password-reset links can be sent by email. `ADMIN_APP_URL` should point at the admin frontend, for example `https://yourdomain.com/admin` or the appropriate frontend base URL.

## Authentication flow

### Login
`POST /api/admin/auth/login`

```json
{ "username": "manager1", "password": "TemporaryPassword..." }
```

The response includes `mustChangePassword`. If true, the user must call the change-password endpoint before management endpoints will authorize them.

### First-login / normal password change
`POST /api/admin/auth/change-password`

Bearer token required.

```json
{ "currentPassword": "TemporaryPassword...", "newPassword": "StrongNewPassword1!" }
```

Password policy: at least 12 characters with uppercase, lowercase, number and symbol.

### Forgot password
`POST /api/admin/auth/forgot-password`

```json
{ "email": "manager@example.com" }
```

Always returns a generic response to avoid account enumeration. If the account exists, a one-time expiring reset link is emailed.

### Reset password
`POST /api/admin/auth/reset-password`

```json
{ "token": "one-time-token", "newPassword": "StrongNewPassword1!" }
```

All existing sessions for that user are revoked.

### Logout
`POST /api/admin/auth/logout`

## Admin users

- `GET /api/admin/users`
- `POST /api/admin/users` — generates a temporary password and emails credentials.
- `GET /api/admin/users/:id`
- `PATCH /api/admin/users/:id`
- `DELETE /api/admin/users/:id`
- `POST /api/admin/users/:id/reset-password` — generates and emails a new temporary password and forces first-login password change again.

## Dashboard

- `GET /api/admin/dashboard`
- `GET /api/admin/audit-logs?limit=100`

## Menu

- `GET /api/admin/menu-items`
- `POST /api/admin/menu-items`
- `GET /api/admin/menu-items/:id`
- `PATCH /api/admin/menu-items/:id`
- `DELETE /api/admin/menu-items/:id`
- `POST /api/admin/menu-items/reorder`
- `POST /api/admin/menu-items/upload-image` as `multipart/form-data`, field name `file`.

Image types: JPG, PNG and WebP. Default max size is 5 MB. Files are stored under `storage/uploads/menu` and served via `/api/uploads/menu/...`. For horizontally scaled/cloud production deployments, replace local disk storage with Azure Blob, S3, or another object store.

## Categories

- `GET /api/admin/categories`
- `POST /api/admin/categories`
- `PATCH /api/admin/categories/:id`
- `DELETE /api/admin/categories/:id`
- `POST /api/admin/categories/reorder`

Seeded stored categories: Plates, Sandwiches, Italian, Salads, Side Orders, Drinks, Dessert. Public category output prepends virtual `Popular`.

## Restaurant settings

- `GET /api/admin/restaurant`
- `PUT /api/admin/restaurant`

## Working hours

- `GET /api/admin/hours`
- `PATCH /api/admin/hours/:id`

## Public website endpoints

- `GET /api/health`
- `GET /api/menu/categories`
- `GET /api/menu/items`
- `GET /api/menu/items?category=popular`
- `GET /api/menu/items?category=plates`
- `GET /api/restaurant`
- `GET /api/hours`
- `GET /api/uploads/menu/:filename`

## Production notes

- Use HTTPS.
- Set a long random `JWT_SECRET` (32+ characters).
- Keep `.env` out of Git.
- Configure real SMTP.
- Use managed MySQL backups.
- Prefer object storage for uploaded images in multi-instance production.
- Put the API behind a reverse proxy/WAF and rate-limit authentication endpoints at the edge as well as using the included account lockout.
