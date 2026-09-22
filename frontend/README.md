# Kebab Gyros frontend

Next.js App Router public site. The page requests live restaurant settings, menu categories, menu items and hours from the separate backend. The site shows an unavailable state if the backend cannot be reached; ordering uses the configured restaurant URL, with the existing SkyTab URL as a fallback.

## Local setup

```bash
cd backend
cp .env.example .env
npm ci
# Configure MySQL and bootstrap the admin as described in backend/README.md
npm run dev
```

In another terminal:

```bash
cd frontend
cp .env.example .env.local
npm ci
npm run dev
```

Backend: http://localhost:4000. Frontend: http://localhost:3000. `API_BASE_URL` is read by the frontend server only. Admin-uploaded images need a backend URL reachable from visitors' browsers or a production proxy.

The Lovable ZIP was used as a design reference. The admin interface remains to be implemented. Backend seed hours and email differ from the supplied restaurant details; verify and update those records before release. Live end-to-end checks require configured MySQL and backend environment variables.
