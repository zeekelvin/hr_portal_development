# Tinash HR Portal

Next.js + Supabase HR portal with admin (HR) and employee self-service views. Includes reconciliation tooling to ingest CareCenta/HHAeX exports and compare runs, plus training, credentials, applications, scheduling, and reporting pages.

## Tech Stack
- Next.js 14 (App Router), React 18, TypeScript
- TailwindCSS for styling
- Supabase for auth, Postgres, and storage
- Recharts for charts
- Vitest + Testing Library for tests

## Getting Started
1) Install deps: `npm install`
2) Copy env: `cp .env.example .env.local` and fill Supabase keys.
3) Dev server: `npm run dev`
4) Build: `npm run build`
5) Lint: `npm run lint`
6) Tests: `npm test`

## Environment
Required vars (see `.env.example`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Supabase Usage
- Auth: Supabase Auth (email/password). Each `auth.users` row links to `employees.auth_user_id`.
- DB: key tables include `employees`, `credentials`, `employee_credentials`, `trainings`, `employee_trainings`, `incidents`, `applications`, and reconciliation tables `reconciliation_runs` + `reconciliation_rows`.
- Storage: `applications` bucket for uploaded/assigned application files.
- `lib/supabaseClient.ts` (client) and `lib/supabaseAdmin.ts` (admin, if present) initialize clients from env vars.

## Auth & Roles
- Emails ending with `@tinashhomecareservices.com` are treated as HR/admin by default (plus role column in `employees`).
- Hooks/components:
  - `useCurrentEmployee` returns `{ employee, loading, error }`.
  - `RequireAuth` gate keeps authenticated routes.
  - `RequireHR` restricts HR-only pages (employees, credentials, incidents, training, scheduling, reports, admin applications view, reconciliation).
- Sidebar renders HR vs employee menu based on role and email domain.

## Key Features (App Router pages)
- `/` Dashboard (HR)
- `/employees`, `/employees/[id]` (HR)
- `/credentials` (HR)
- `/incidents` (HR)
- `/training` (HR)
- `/scheduling` (HR)
- `/reports` (HR)
- `/applications` (HR library/assignment)
- `/reconciliation` (HR): ingest exports, filter, visualize variance, download CSV, delete runs
- `/reconciliation/upload` (HR): upload combined or dual files to create runs
- `/reconciliation/compare` (HR): select two runs and see deltas (clients, employees, dates)
- Employee self-service: `/my`, `/my/training`, `/my/schedule`, `/my/credentials`, `/my/applications`
- Auth: `/login`, `/signup`

## Reconciliation Workflow
- Upload combined or dual CareCenta/HHAeX exports at `/reconciliation/upload`. This creates a `reconciliation_runs` row and `reconciliation_rows` for each line.
- View a run at `/reconciliation`: pick a run, filter by date/client/employee, see charts/tables, export CSV, or delete run.
- Compare runs at `/reconciliation/compare`: choose Run A (base) and Run B (target) to see GitHub-style diffs by client, employee, and service date, plus headline deltas.
- API routes:
  - `POST /api/reconciliation/ingest` handles uploads.
  - `DELETE /api/reconciliation/run?id=...` deletes a run and its rows.
  - `GET /api/reconciliation/summary` returns aggregates; marked dynamic because it reads `request.url`.

## Linting & Formatting
- ESLint configured via `.eslintrc.json` (Next core web vitals), relaxed on `any` and unused vars for velocity.
- Run: `npm run lint`

## Testing
- Vitest + Testing Library are set up.
- Run: `npm test`

## Deployment Notes
- Next.js 14 App Router. `next.config.mjs` keeps default settings (strict mode).
- If Vercel logs “Dynamic server usage” for `/api/reconciliation/summary`, it is expected; add `export const dynamic = "force-dynamic"` to silence.
- Ensure `package-lock.json` matches `package.json` (`eslint-config-next` should be 14.x to pair with eslint 8.x). If lockfile is missing, reinstall to regenerate before deploying.

## Folder Structure (high level)
- `app/` – App Router pages and API routes
- `components/` – shared UI (Sidebar, Topbar, layouts, guards)
- `lib/` – Supabase clients, hooks, helpers
- `public/` – static assets
- `__tests__/` – tests
- Configs: `tsconfig.json`, `tailwind.config.ts`, `.eslintrc.json`, `next.config.mjs`

## Dev Tips
- Sidebar is sticky and scrollable on desktop; stacks on mobile (AppLayout uses column flex).
- Use `/reconciliation/compare` when you need to diff runs; the main page also links to it.
- Backups may exist under `_backup_*`; ignored by lint/TS.
