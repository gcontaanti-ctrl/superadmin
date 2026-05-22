# Superadmin production deploy

## Architecture

- Frontend/SSR: Cloudflare Workers, deployed with `npm run deploy:frontend`.
- DB2 API: Node service, deployed from `backend_api.cjs` with `npm run start:api`.
- Supabase: stores DB2 connection config in `public.erp_db_config`.

Supabase hosts the database/config layer for this project. The DB2 API needs a Node host because it uses the native `ibm_db` driver, and the frontend needs a web host that serves the TanStack/Vite app.

## Required secrets

Set these only in the hosting dashboards, never in Git:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_USERNAME=admin
ADMIN_PASSWORD=
SESSION_SECRET=
DB2_HOSTNAME=
DB2_PORT=30231
DB2_UID=
DB2_PWD=
DB2_USE_EXTERNAL_HOST=true
DB2_EXTERNAL_HOST=
DB2_EXTERNAL_PORT=
API_BASE_URL=
```

## Deploy order

1. Push this repository to GitHub.
2. Apply `supabase/migrations/20260522153000_create_erp_db_config.sql` in Supabase SQL Editor.
3. Create the API service using `render.yaml` or an equivalent Node host.
4. Set `ADMIN_PASSWORD` and `SESSION_SECRET` in the API host.
5. Copy the public API URL and set it as `API_BASE_URL` in Cloudflare Worker variables.
6. Run `npm run deploy:frontend`.

## Local checks

```bash
npm run build
node --check backend_api.cjs
```
