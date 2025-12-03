# Tinash HR Portal

Next.js + Supabase based HR portal for Tinash Homecare Services.

## Getting Started

```bash
npm install
cp .env.example .env.local   # fill in Supabase values
npm run dev
```

Visit http://localhost:3000



# Tinash Homecare HR Portal – Developer README

## 1. Overview

The **Tinash Homecare HR Portal** is a web-based HRIS-style system designed for a homecare agency. It supports CHRO/HR operations, caregiver workflows, and compliance tracking in one place.

**Tech stack:**
- **Next.js 14+ (App Router)** – frontend & routing
- **TypeScript + React** – UI & client logic
- **TailwindCSS** – styling
- **Supabase** – Auth, Postgres DB, Storage, RLS
- **Deployed** as a typical Next app (Vercel or similar, not yet finalized)

**Key goals:**
- Single HR cockpit for Tinash Homecare’s CHRO/HR team
- Separate, limited employee self-service portal
- Everything auditable, secure, and compliant-friendly (RLS enforced)
- Extensible foundation: we can keep bolting on new HR, payroll, and reporting features

---

## 2. High-Level Features

### 2.1 Authentication & Roles
- Email/password auth via **Supabase Auth**
- Each `auth.users` record is linked to an `employees` row
- Role-based logic:
  - Emails ending with `@tinashhomecareservices.com` → treated as **HR / admin** (plus specific `role` column in `employees`)
  - Regular caregivers (e.g. Gmail/Yahoo) → **employee** view
- Role & identity are surfaced via a custom hook:

```ts
// lib/useCurrentEmployee.ts (concept)
const { user } = supabase.auth.getUser();
const { data: employee } = supabase
  .from("employees")
  .select("*")
  .eq("auth_user_id", user.id)
  .single();

RequireAuth: gate any page that needs a logged-in user

RequireHR: gate HR-only pages (employees, credentials, incidents, training, scheduling, reports, admin applications view)

2.2 HR vs Employee Views

HR / Admin View Includes:

Dashboard (CHRO cockpit)

Employees

Credentials

Incidents

Training

Scheduling

Reports

Applications (HR management/assignment)

Employee View Includes:

My Profile

My Training

My Schedule

My Credentials

My Applications

The Sidebar checks if the current user is HR vs employee and renders different menus accordingly.

3. Project Structure

Rough top-level layout:

app/
  layout.tsx
  page.tsx                  # Dashboard (HR)
  login/page.tsx
  signup/page.tsx
  employees/page.tsx        # HR-only
  credentials/page.tsx      # HR-only
  incidents/page.tsx        # HR-only
  training/page.tsx         # HR-only
  scheduling/page.tsx       # HR-only
  reports/page.tsx          # HR-only
  applications/page.tsx     # HR-only library + assignment

  my/
    applications/page.tsx   # Employee-facing "My Applications"
    # (could also include my/profile, my/training, etc.)

components/
  AppLayout.tsx
  Sidebar.tsx
  Topbar.tsx
  RequireAuth.tsx
  RequireHR.tsx

lib/
  supabaseClient.ts
  useCurrentEmployee.ts
  # utils (date helpers, status helpers, etc.)

public/
  tinash-logo.png

4. Supabase Schema (Key Tables)
4.1 Employees
CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid REFERENCES auth.users (id),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text UNIQUE,
  phone text,
  role text,            -- e.g. 'HHA', 'RN', 'hr', 'admin'
  status text,          -- e.g. 'active', 'inactive'
  location text,
  created_at timestamptz DEFAULT now()
);


Usage:

HR: CRUD all employees

Employees: can view & edit their own profile only

4.2 Trainings & Employee Trainings
CREATE TABLE public.trainings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.employee_trainings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES public.employees (id),
  training_id uuid REFERENCES public.trainings (id),
  status text DEFAULT 'assigned',  -- 'assigned', 'in_progress', 'completed'
  assigned_at timestamptz DEFAULT now(),
  completed_at timestamptz
);


HR can:

Maintain a Training Library

Assign trainings to employees

View training compliance metrics

Employees can:

See their own assigned trainings

Update status (depending on UX choices)

4.3 Credentials & Employee Credentials
CREATE TABLE public.credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  type text NOT NULL,  -- e.g. 'license', 'certification'
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.employee_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES public.employees (id),
  credential_id uuid REFERENCES public.credentials (id),
  issued_date date,
  expiry_date date,
  status text DEFAULT 'active',  -- 'active', 'expired', 'pending'
  notes text
);


Used for:

License tracking

Dashboard widget: Credential Expirations (next 60 days)

4.4 Incidents & Employee Incidents
CREATE TABLE public.incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.employee_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES public.employees (id),
  incident_id uuid REFERENCES public.incidents (id),
  status text DEFAULT 'open',  -- 'open', 'resolved'
  occurred_at timestamptz DEFAULT now(),
  notes text
);


HR logs incidents, employees see their own record.

4.5 Scheduling & Employee Schedules
CREATE TABLE public.shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  location text,
  notes text
);

CREATE TABLE public.employee_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES public.employees (id),
  shift_id uuid REFERENCES public.shifts (id),
  status text DEFAULT 'assigned', -- 'assigned', 'completed', 'missed'
  created_at timestamptz DEFAULT now()
);


Used for:

Scheduling UI

Dashboard: coverage gaps & open shifts

4.6 Applications & Employee Applications

Core of the new feature.

CREATE TABLE public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  storage_path text,        -- path in storage bucket `applications` (nullable)
  form_url text,           -- external fillable form URL (nullable)
  created_at timestamptz DEFAULT now()
);

-- IMPORTANT: storage_path is nullable
-- ALTER TABLE public.applications ALTER COLUMN storage_path DROP NOT NULL;

-- Optional guard:
-- ALTER TABLE public.applications
--   ADD CONSTRAINT applications_file_or_url
--   CHECK (storage_path IS NOT NULL OR form_url IS NOT NULL);


employee_applications:

CREATE TABLE public.employee_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES public.employees (id),
  application_id uuid REFERENCES public.applications (id),
  status text DEFAULT 'assigned',  -- 'assigned', 'submitted'
  assigned_at timestamptz DEFAULT now(),
  submitted_at timestamptz,
  submitted_storage_path text      -- completed form in storage
);

5. Storage Layout (Supabase Storage)

Bucket: applications

applications/
  templates/
    <uuid>.pdf                 # HR uploaded forms
  completed/
    <employee_id>/
      <uuid>.pdf               # Employee uploaded completed forms


HR flow:

Uploads fillable PDF → stored under templates/

Optionally sets form_url to an external Adobe/DocuSign link

Assigns to employees via employee_applications

Employee flow:

Sees assigned applications under My Applications

Buttons:

Open fillable form → form_url if set

Download fillable form → storage_path if set

Upload completed form → uploads to completed/<employee_id>/<uuid>.pdf

On upload:

employee_applications.submitted_storage_path set

employee_applications.status = submitted

submitted_at timestamp set

6. RLS (Row-Level Security) – Overview

Employees:

RLS ensures employees only see:

Their own employees row

Their own related records in:

employee_trainings

employee_credentials

employee_incidents

employee_schedules

employee_applications

HR users (Tinash domain + HR roles):

RLS or application logic allows:

Full read/write across tables

HR-only pages are also gated in the UI via RequireHR

Storage:

Bucket applications has policies:

Allow public or authenticated read for templates/*

Allow authenticated upload for completed/{employee_id}/* where:

auth.uid() matches employee.auth_user_id for that employee

7. Frontend Components/Patterns
7.1 RequireAuth

Wraps any page that needs a logged-in user

Uses supabase.auth.getSession() to check auth

Shows “Checking access…” while loading

7.2 RequireHR

Checks user email domain & employee role

If not HR:

Show “Access restricted” message or redirect

7.3 AppLayout

Layout shell:

Sidebar

Topbar

Main content area

7.4 Sidebar

Shows Tinash logo

For HR: Dashboard, Employees, Credentials, Incidents, Training, Scheduling, Reports, Applications

For Employee: My Profile, My Training, My Schedule, My Credentials, My Applications

Uses useCurrentEmployee() + auth user email to choose variant

8. Dashboard Widgets (HR)

Active Employees: count from employees where status='active'

Open Incidents: employee_incidents where status='open'

Open Schedules / Shifts: employee_schedules with future shifts and status='assigned'

Turnover (90D) (planned): employees terminated/changed to inactive in last 90 days

Training Compliance (planned): completed trainings / total assigned

Credential Expirations (next 60 days): upcoming expiry_date in employee_credentials

Coverage Gaps & Open Shifts: future shifts with no assigned employee_schedules

9. Running Locally

Install dependencies

npm install


Configure environment

Create .env.local:

NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...


Run dev server

npm run dev


Open http://localhost:3000

10. Future Enhancements (Backlog)

Onboarding packets (bundle forms + checklist)

Digital signatures tracking

Time & attendance / clock-in

EVV integration

Payroll export and integration

Notifications (email/SMS) for expiring credentials, new trainings, open shifts

Mobile app (React Native) or PWA optimization


---

## 2️⃣ Context / System Overview Doc (for new chat + Word)

Use this as a **“master context”** for any future chat. Save as Word (`Tinash_HR_Portal_Context`) *and* paste into a brand new ChatGPT conversation whenever you want to continue coding on this project.

```markdown
# Tinash HR Portal – System Context Summary

This is a **homecare HR portal** for Tinash Homecare Services. It is built with:

- Next.js 14+ (App Router)
- TypeScript + React
- TailwindCSS
- Supabase (Auth, Postgres, Storage, RLS)

The app provides two main experiences:

1. **HR/Admin Portal**
2. **Employee Self-Service Portal**

---

## 1. Roles & Access

- Auth via **Supabase Auth**
- Each user in `auth.users` is linked to `public.employees(auth_user_id)`
- HR/Admin detection:
  - Email domain: `@tinashhomecareservices.com`
  - Or `employees.role IN ('hr','admin','chro','scheduler','manager')`

### HR-Only Pages

- `/` (Dashboard)
- `/employees`
- `/credentials`
- `/incidents`
- `/training`
- `/scheduling`
- `/reports`
- `/applications`

These are wrapped in:

```tsx
<RequireAuth>
  <RequireHR>
    <AppLayout>...</AppLayout>
  </RequireHR>
</RequireAuth>

Employee Pages

/my/applications

(optionally /my/profile, /my/training, /my/schedule, /my/credentials)

Wrapped in:

<RequireAuth>
  <AppLayout>...</AppLayout>
</RequireAuth>


useCurrentEmployee() is used to read the linked employees row.

2. Key Database Tables

All tables live in public schema:

employees

credentials

employee_credentials

trainings

employee_trainings

incidents

employee_incidents

shifts

employee_schedules

applications

employee_applications

Applications Table (Important)
CREATE TABLE public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  storage_path text,  -- nullable: path for fillable PDF in `applications` bucket
  form_url text,      -- nullable: external Adobe / DocuSign / Jotform URL
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.applications
  ALTER COLUMN storage_path DROP NOT NULL;

Employee Applications
CREATE TABLE public.employee_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES public.employees (id),
  application_id uuid REFERENCES public.applications (id),
  status text DEFAULT 'assigned', -- 'assigned', 'submitted'
  assigned_at timestamptz DEFAULT now(),
  submitted_at timestamptz,
  submitted_storage_path text     -- completed form in storage
);

3. Storage Layout

Supabase storage bucket: applications

Structure:

applications/
  templates/
    <uuid>.pdf             # HR-uploaded forms (fillable PDFs)
  completed/
    <employee_id>/
      <uuid>.pdf           # Employee-uploaded completed forms


HR Flow:

In /applications:

Can upload fillable PDFs → templates/

Can set a form_url (Adobe / DocuSign / Jotform, etc.)

Can assign an application to any employee → creates row in employee_applications

Employee Flow:

In /my/applications:

Sees all employee_applications where employee_id = their own

For each:

If application.form_url → button “Open fillable form”

If application.storage_path → “Download fillable form” (PDF)

Can upload completed form:

File uploaded to completed/{employee_id}/{uuid}.pdf

submitted_storage_path updated

status updated to submitted

submitted_at set

HR can then see the uploaded completed file from /applications in the assignments list.

4. RLS (High Level)

RLS enabled on all main tables (employees, employee_*, applications, etc.)

Employees can:

Only view/update rows where employee_id matches their own

HR users:

Allowed broad access (via RLS or via Supabase service role used in a secure context)

Storage:

Read policy for applications/templates/*

Insert policy for applications/completed/{employee_id}/*

Based on auth.uid() matching employees.auth_user_id

5. Current State of Frontend Modules
5.1 Applications – HR View (/applications)

Shows Application Library:

Title, Description, Download PDF (if storage_path), Open URL (if form_url)

HR “New Application” form allows:

Title + description

Optional PDF upload (fillable)

Optional URL to online fillable form

HR “Assign Application” form:

Select Employee

Select Application

Inserts into employee_applications

Shows recent assignments:

Employee name

Application title

Status

Download/view completed file link (if submitted_storage_path)

5.2 Applications – Employee View (/my/applications)

Lists assigned applications:

Title

Description

Status

Submitted timestamp (if any)

For each application:

If form_url → Open fillable form

If storage_path → Download fillable form

Upload completed copy:

Uses Supabase Storage applications bucket

Updates employee_applications accordingly

If submitted_storage_path → View my uploaded form

6. Dashboard (HR) – Logic Summary

The main dashboard (root /) includes:

Active Employees count → from employees where status='active'

Open incidents count → from employee_incidents where status='open'

Open/assigned shifts → from employee_schedules / shifts

Future planned tiles:

Turnover (90D)

Training Compliance

Credential Expirations (Next 60 days)

Coverage Gaps & Open Shifts

Implementations should use Supabase queries in client components (or move to server components later).

7. UX / Components

AppLayout:

Wraps each page with:

Sidebar (Tinash logo, nav based on HR vs Employee)

Topbar (title, description, signed-in info)

Sidebar:

Shows “Tinash Homecare Services”

HR menu vs Employee menu

Topbar:

Receives title and description props

Shows context text (“Tinash HR Dashboard”, etc.)

Local Development
1. Install dependencies
npm install

2. Environment

Create .env.local:

NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

3. Run dev server
npm run dev


Go to: http://localhost:3000