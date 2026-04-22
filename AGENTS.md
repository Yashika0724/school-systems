# AGENTS.md

A reference for AI coding agents (Claude Code, Cursor, etc.) working on this repository. Read this before making changes — it explains *what* the app is, *how* the pieces fit together, and the conventions you should follow.

---

## 1. What this app is

**School Connect Hub** is a multi-role school management web app with four user types — **Student, Parent, Teacher, Admin** — each with their own login, dashboard, and feature surface. It also offers no-auth **demo dashboards** so prospects can explore each role without signing up, and a **public admissions portal** for prospective applicants.

Core capabilities (per role):
- **Student** — attendance, marks, exams (offline + **online**), homework, timetable, library, fees (with **Razorpay** checkout), leave, transport, announcements, messages, notifications, **hall tickets**, **report cards**, **re-evaluation requests**, **remedial sessions**, **badges**, learning resources
- **Parent** — view child's attendance/marks/homework/fees, library, leave, transport, messages, notifications, **report cards**, **PTM meeting requests**, children switcher
- **Teacher** — classes, schedule, attendance entry + **justification approvals**, marks entry + **bulk marks upload**, homework, session planning, leave (own + approvals), announcements, messages, notifications, **question bank** + **AI question generator**, **online exam builder**, **re-evaluation handling**, **PTM slots**, analytics
- **Admin** — full CRUD over users, classes, exams, fees, library, transport, timetable, attendance, announcements, **admissions intake**, **notifications composer**, **proctor console** for online exams, **seat allocations**, **grading scales**, **eligibility rules**, **result workflow**, **re-evaluation queue**, analytics, reports, system settings
- **Public (no auth)** — `/admissions` landing, application form, status check

---

## 2. Tech stack

| Layer | Tech |
|---|---|
| Build tool | **Vite 5** (`@vitejs/plugin-react-swc`) on port **8080** |
| Language | **TypeScript** (strict-ish; see `tsconfig.*.json`) |
| UI framework | **React 18** + **React Router 6** |
| Component library | **shadcn/ui** (Radix primitives) under [src/components/ui/](src/components/ui/) |
| Styling | **Tailwind CSS** + `tailwindcss-animate` + `@tailwindcss/typography` |
| Forms | `react-hook-form` + `zod` (via `@hookform/resolvers`) |
| Data fetching | **TanStack Query** (`@tanstack/react-query`) — `QueryClient` is created in [src/App.tsx](src/App.tsx) |
| Backend | **Supabase** (Postgres + Auth + Edge Functions) |
| PDF generation | **`@react-pdf/renderer`** — components live in [src/components/pdf/](src/components/pdf/), triggered via [src/lib/pdfDownload.ts](src/lib/pdfDownload.ts) |
| Payments | **Razorpay** checkout — wrapper in [src/lib/razorpay.ts](src/lib/razorpay.ts), order/verify in edge functions |
| CSV | `papaparse` (bulk imports: attendance, marks) |
| QR codes | `qrcode` / `qrcode.react` (hall tickets, admissions status) |
| Toasts | both `sonner` and the shadcn `Toaster` are mounted; prefer `sonner` for new code |
| Icons | `lucide-react` |
| Animations | `framer-motion` |
| Charts | `recharts` |

Path alias: `@/*` → `src/*` (configured in [vite.config.ts](vite.config.ts) and [tsconfig.json](tsconfig.json)).

---

## 3. Repo layout

```
src/
  App.tsx                  # Router, providers (QueryClient, Auth, Demo, Tooltip, Toasters)
  main.tsx                 # Vite entry
  index.css, App.css       # Tailwind layers + globals

  pages/
    Landing.tsx            # Marketing/landing page (uses landing/* components)
    AdminSetup.tsx         # First-admin bootstrap flow
    NotFound.tsx
    login/                 # {Student,Parent,Teacher,Admin}Login.tsx
    demo/                  # {Student,Parent,Teacher,Admin}Demo.tsx — no-auth tours
    dashboards/            # {Student,Parent,Teacher,Admin}Dashboard.tsx — real, authed
    admissions/            # PUBLIC: AdmissionsLanding, ApplyPage, StatusPage

  components/
    ui/                    # shadcn primitives — DO NOT modify unless intentional
    auth/                  # LoginForm, ProtectedRoute
    landing/               # HeroSection, FeaturesSection, LoginCards, Footer
    admin/                 # Admin feature pages (UserManagement, FeeManagement,
                           # AdmissionsQueuePage, AdmissionDetailDrawer,
                           # AdmissionsSettingsPage, EligibilityRulesPage,
                           # AttendanceAnalyticsPage, AttendanceBulkImportPage,
                           # AttendanceHolidaysPage, AttendanceSettingsPage,
                           # ExamAnalyticsPage, GradingScalesPage,
                           # ProctorConsolePage, ReevalQueuePage,
                           # ResultWorkflowPage, SeatAllocationPage,
                           # AdminMessagesPage, ...)
    teacher/ student/ parent/   # Role-specific feature pages (see §11 for new pages)
    notifications/         # NotificationBell, NotificationsInboxPage, NotificationComposerPage
    pdf/                   # @react-pdf/renderer docs: AttendanceReportPDF,
                           # HallTicketPDF, ReportCardPDF
    shared/                # AnnouncementCarousel, ComingSoonPage
    DemoBanner.tsx, NavLink.tsx

  contexts/
    AuthContext.tsx        # Supabase auth + role lookup from `user_roles` table
    DemoContext.tsx        # Toggles demo mode (mock data via lib/demo-data.ts)

  hooks/                   # One hook per domain. Most wrap TanStack Query against Supabase.
                           # See §6 for a list of the domain hooks.

  integrations/supabase/
    client.ts              # Reads VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY
    types.ts               # AUTO-GENERATED Database types — never hand-edit

  lib/
    utils.ts               # cn() helper
    demo-data.ts           # Static fixtures used by /demo/* routes
    export-utils.ts        # CSV/PDF export helpers
    attendance.ts          # Attendance status constants, threshold helpers
    pdfDownload.ts         # Triggers @react-pdf/renderer download via Blob URL
    razorpay.ts            # Razorpay checkout wrapper calling edge functions
    reportCardBuilder.ts   # Aggregates marks + grading bands into ReportCardPDF data

supabase/
  config.toml              # project_id + edge function settings
  migrations/              # SQL migrations (see §9 for the new exam/admissions/notifications set)
  functions/
    _shared/cors.ts        # Shared CORS preflight helper for edge functions
    admin-setup/           # Bootstraps the very first admin user
    create-user/           # Admin-only user creation (used by CreateUserDialog)
    enroll-applicant/      # Converts an approved admission into a real user + profile
    ai-question-generator/ # Server-side AI generation for QuestionBank
    razorpay-create-order/ # Creates a Razorpay order for an invoice
    razorpay-verify/       # Verifies signature + records payment
```

---

## 4. Routing model

All routes live in [src/App.tsx](src/App.tsx):

- `/` — public landing
- `/admissions`, `/admissions/apply`, `/admissions/status` — **public** admissions portal (no auth)
- `/login/{student|parent|teacher|admin}` — login pages
- `/admin/setup` — only works when no admin exists yet
- `/demo/{student|parent|teacher|admin}/*` — public, mock-data dashboards
- `/{student|parent|teacher|admin}/*` — real dashboards, wrapped in `<ProtectedRoute allowedRole="...">`
- `*` — `NotFound`

`ProtectedRoute` ([src/components/auth/ProtectedRoute.tsx](src/components/auth/ProtectedRoute.tsx)) reads `userRole` from `AuthContext` and redirects unauthorized users.

After login, `useRoleRedirect` in [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx) sends the user to `/{role}/dashboard`.

---

## 5. Auth & roles

- Supabase Auth handles email/password.
- Roles live in a separate `user_roles` table (NOT on `profiles`) — this is intentional for RLS security. See migration [20260109205937_*.sql](supabase/migrations/20260109205937_b52e5f8d-f9ff-464d-9911-cce731b226c7.sql).
- `app_role` enum: `'student' | 'parent' | 'teacher' | 'admin'`.
- `AuthContext` fetches the role with a `setTimeout(..., 0)` after sign-in — this is **deliberate** to avoid a Supabase auth-state-change deadlock. Don't "clean up" the timeout.
- Standard user creation goes through the `create-user` edge function, invoked from [src/components/admin/CreateUserDialog.tsx](src/components/admin/CreateUserDialog.tsx).
- **Admissions → enrollment** uses the `enroll-applicant` edge function: admin approves an admission row in `AdmissionsQueuePage`, the function provisions a Supabase auth user + profile + role. Do not duplicate that flow inline.

---

## 6. Data layer conventions

- **Always** import the client as `import { supabase } from "@/integrations/supabase/client"`.
- **Never** edit [src/integrations/supabase/types.ts](src/integrations/supabase/types.ts) by hand — regenerate it from the Supabase CLI / MCP after schema changes.
- Domain hooks (`src/hooks/use*.ts`) are the seam between UI and Supabase. New feature data should go through a hook, not be queried inline in a component.
- Hooks follow this shape:
  - Use `useQuery` / `useMutation` from TanStack Query.
  - Invalidate the relevant query keys on mutation success.
  - Surface errors via `sonner` toasts.

**Domain hooks currently in [src/hooks/](src/hooks/)** (non-exhaustive; check the directory for the source of truth):
`useAdmissions`, `useAnnouncements`, `useAttendance`, `useAttendanceSettings`, `useBadges`, `useClassRanks`, `useEligibility`, `useExamAnalytics`, `useExams`, `useFeeManagement`, `useGradingScales`, `useHomework`, `useLeaveManagement`, `useLibrary`, `useMessaging`, `useNotifications`, `useOnlineExam`, `usePtm`, `useQuestionBank`, `useReevaluation`, `useResources`, `useResultPublications`, `useSchoolSettings`, `useSeatAllocations`, `useTimetable`, `useTopicMastery`, `useTransportation`, plus the `use{Role}Dashboard` / `use{Role}Data` hooks per role.

---

## 7. Demo mode

`/demo/*` routes render the same dashboard shells but pull from [src/lib/demo-data.ts](src/lib/demo-data.ts) instead of Supabase. `DemoContext` flags this; `DemoBanner` is shown at the top. When adding a new feature, mirror it in demo data so the demo tour stays complete.

---

## 8. PDFs, payments, notifications, messaging

These cross-cutting subsystems have conventions of their own:

- **PDFs** — generated client-side with `@react-pdf/renderer`. Document components live in [src/components/pdf/](src/components/pdf/) (`AttendanceReportPDF`, `HallTicketPDF`, `ReportCardPDF`). Trigger downloads via `downloadPdf(doc, filename)` from [src/lib/pdfDownload.ts](src/lib/pdfDownload.ts). Report card data is assembled by [src/lib/reportCardBuilder.ts](src/lib/reportCardBuilder.ts) (marks + grading bands → `ReportCardData`).
- **Payments (Razorpay)** — client flow lives in [src/lib/razorpay.ts](src/lib/razorpay.ts), backed by the `razorpay-create-order` and `razorpay-verify` edge functions. Never call Razorpay's REST API from the client — orders and verification must go through the edge functions so the key secret stays server-side.
- **Notifications** — app-wide system under `src/components/notifications/`. `NotificationBell` mounts in role layouts; admins compose broadcasts via `NotificationComposerPage`. Hook: `useNotifications`. Schema: migration `20260420150000_notifications.sql`.
- **Messaging** — 1:1 + thread messaging is available to all four roles (`{Role}MessagesPage`). Access is RLS-gated; see migration `20260420160000_messages_rls_lockdown.sql` before changing the hook or adding new queries.
- **Online exams** — teacher builds questions in `QuestionBankPage` / `OnlineExamBuilderPage` (optionally generated by the `ai-question-generator` edge function via `AiQuestionGeneratorDialog`). Students attempt in `StudentOnlineAttemptPage`; admin monitors from `ProctorConsolePage`. Hook: `useOnlineExam`.
- **Admissions** — public apply/status pages write to the `admissions` table; admin triages in `AdmissionsQueuePage` and enrolls via the `enroll-applicant` edge function. Hook: `useAdmissions`.

---

## 9. Supabase migrations (recent)

The original bootstrap migrations (`20260109…` → `20260128…`) set up profiles, roles, and base tables. The current wave adds:

- **Exams overhaul (2026-04-19)** — six phased migrations:
  - `20260419120000_exam_phase1_foundation.sql` — core exam tables/enums
  - `20260419130000_exam_phase2_seat_allocations.sql` — seat plan + hall tickets
  - `20260419140000_exam_phase3_class_ranks.sql` — ranking + result publication
  - `20260419150000_exam_phase4_online_exams.sql` — online exam attempts/proctoring
  - `20260419160000_exam_phase5_remedial_reeval.sql` — remedial sessions + re-evaluation
  - `20260419170000_exam_phase6_badges_ptm.sql` — student badges + PTM slots
- **Attendance (2026-04-20)** — `…_attendance_justifications.sql`, `…_attendance_settings_holidays.sql`
- **Admissions (2026-04-20)** — `…_admissions.sql`
- **Notifications (2026-04-20)** — `…_notifications.sql`
- **Messages RLS (2026-04-20)** — `…_messages_rls_lockdown.sql` tightens RLS on the messaging tables

When touching any of these features, read the corresponding migration first — RLS policies decide what your hook can actually read/write.

---

## 10. Edge functions

All six functions are registered in [supabase/config.toml](supabase/config.toml):

| Function | `verify_jwt` | Purpose |
|---|---|---|
| `admin-setup` | `false` | First-admin bootstrap (runs when no admin exists) |
| `create-user` | `false` | Admin-invoked user creation (callable from `CreateUserDialog`) |
| `enroll-applicant` | `true` | Converts approved admission → auth user + profile + role |
| `ai-question-generator` | `true` | Server-side AI question generation for the teacher's question bank |
| `razorpay-create-order` | `true` | Creates a Razorpay order for an invoice |
| `razorpay-verify` | `true` | Verifies Razorpay signature and records payment |

**Required edge-function secrets** (set via `npx supabase secrets set …` or the dashboard — never in client `.env`):

- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` — used by both Razorpay functions
- `GROQ_API_KEY` — used by `ai-question-generator`
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — injected by Supabase automatically

Shared CORS preflight helper lives in [supabase/functions/_shared/cors.ts](supabase/functions/_shared/cors.ts) — import it rather than duplicating headers in each function.

When adding a new edge function: add a folder under [supabase/functions/](supabase/functions/), register it in `config.toml` (set `verify_jwt` appropriately), reuse the shared `corsHeaders`, and always handle the OPTIONS preflight.

---

## 11. Role page index (after the recent expansion)

**Admin** ([src/components/admin/](src/components/admin/))
UserManagement, FeeManagement, AttendanceManagement, AttendanceAnalyticsPage, AttendanceBulkImportPage, AttendanceHolidaysPage, AttendanceSettingsPage, AdmissionsQueuePage, AdmissionDetailDrawer, AdmissionsSettingsPage, EligibilityRulesPage, ExamAnalyticsPage, GradingScalesPage, ProctorConsolePage, ReevalQueuePage, ResultWorkflowPage, SeatAllocationPage, AdminMessagesPage.

**Teacher** ([src/components/teacher/](src/components/teacher/))
AttendancePage, AttendanceJustificationsPage, MarksEntryPage, BulkMarksUploadPage, HomeworkPage, QuestionBankPage, OnlineExamBuilderPage, AiQuestionGeneratorDialog, ReevalHandlerPage, TeacherPtmPage, TeacherAnalyticsPage, TeacherMessagesPage.

**Student** ([src/components/student/](src/components/student/))
StudentAttendancePage, StudentMarksPage, StudentHomeworkPage, StudentPaymentPage, StudentOnlineExamsPage, StudentOnlineAttemptPage, StudentHallTicketPage, StudentReportCardPage, StudentReevalPage, StudentRemedialPage, StudentBadgesPage, StudentResourcesPage, StudentMessagesPage.

**Parent** ([src/components/parent/](src/components/parent/))
ParentAttendancePage, ParentMarksPage, ParentLibraryPage, ParentTransportPage, ParentMessagesPage, ParentChildrenPage, ParentMeetingRequestPage, ParentReportCardPage.

When adding a page, also wire it into the appropriate role sidebar ([AdminSidebar](src/components/dashboard/AdminSidebar.tsx), [TeacherSidebar](src/components/dashboard/TeacherSidebar.tsx), [StudentSidebar](src/components/dashboard/StudentSidebar.tsx), [ParentSidebar](src/components/dashboard/ParentSidebar.tsx)) and the corresponding `{Role}Dashboard.tsx` route list in [src/pages/dashboards/](src/pages/dashboards/).

---

## 12. Styling conventions

- Tailwind first. Compose class lists with `cn()` from [src/lib/utils.ts](src/lib/utils.ts) (uses `clsx` + `tailwind-merge`).
- Use shadcn primitives (`@/components/ui/*`) for all base UI — buttons, dialogs, inputs, tables, cards, etc. Don't roll your own.
- Theme tokens are CSS variables defined in [src/index.css](src/index.css) and mapped in [tailwind.config.ts](tailwind.config.ts).
- Dark mode is wired via `next-themes` (class strategy).

---

## 13. Local setup

```bash
npm install
npm run dev      # http://localhost:8080
npm run build    # production build
npm run lint     # eslint
```

Required env vars (`.env` at repo root):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_SUPABASE_PROJECT_ID=...
```

The Razorpay key id is returned by the `razorpay-create-order` edge function — it is not a `VITE_` env var. Razorpay and any AI provider secrets live in Supabase edge-function secrets (see §10), never in the client `.env`.

The `.env` is gitignored but committed-locally — verify it exists before running `dev`.

**Lint policy:** the project sets `@typescript-eslint/no-explicit-any` to `warn` (not error) because Supabase's auto-generated join types are awkward to thread through hooks. Prefer proper types for new code, but `any` is tolerated where the generated types don't compose cleanly. `@typescript-eslint/no-empty-object-type` and `@typescript-eslint/no-require-imports` are off to accommodate shadcn primitives and `tailwind.config.ts`.

---

## 14. Conventions for agents

**Do**
- Edit existing files; match the surrounding patterns (hook shape, component layout, naming).
- Use the `@/` alias in imports.
- Use `sonner` for toasts in new code.
- Add new Supabase access through a hook in `src/hooks/`.
- When adding a feature for one role, check whether the other roles need a counterpart (e.g., teacher creates → student/parent views, admin composes notification → role inboxes).
- Mirror new features into `lib/demo-data.ts` so `/demo/*` keeps working.
- Register any new page in the role sidebar + `{Role}Dashboard.tsx` route list.
- Run `npm run lint` and `npm run build` before declaring work done.

**Don't**
- Don't hand-edit `src/integrations/supabase/types.ts`.
- Don't modify `src/components/ui/*` to add app-specific behavior — wrap them instead.
- Don't put role logic in `profiles` — roles belong in `user_roles`.
- Don't remove the `setTimeout` in `AuthContext.fetchUserRole` (prevents auth deadlock).
- Don't add a second router, query client, or auth provider — they're singletons in `App.tsx`.
- Don't call Razorpay's REST API from the client — go through `razorpay-create-order` / `razorpay-verify`.
- Don't bypass the `enroll-applicant` edge function to create users from an admission row.
- Don't commit secrets. `VITE_SUPABASE_PUBLISHABLE_KEY` is the public anon key; the service-role key, Razorpay secret, and any AI provider key must never appear in client code.

**When in doubt**
- For a new admin feature → start in [src/components/admin/](src/components/admin/) and a hook in [src/hooks/](src/hooks/).
- For a new DB table/column → add a SQL migration in [supabase/migrations/](supabase/migrations/), regenerate types, then build the hook.
- For a new edge function → add a folder under [supabase/functions/](supabase/functions/), register it in [supabase/config.toml](supabase/config.toml), and reuse [supabase/functions/_shared/cors.ts](supabase/functions/_shared/cors.ts).
- For a new PDF → add a document component under [src/components/pdf/](src/components/pdf/) and trigger it via `downloadPdf()`.
