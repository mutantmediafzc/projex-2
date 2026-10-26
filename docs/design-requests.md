# Creative / Design Request Management — Implementation Guide

## Overview

A complete **Design Requests** module has been added to Cream CRM, allowing internal employees to generate creative briefs, complete them internally or share them with external clients, assign requests to Design/Content team members, receive notifications, track progress, and provide responses with Dropbox/deliverable links.

The feature follows the existing Cream CRM architecture (Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, Supabase) and reuses the existing authentication, navigation, styling, and UI conventions.

---

## Manual Deployment Step (Required)

**Before the feature can write data, you must run the SQL schema manually in the Supabase SQL editor:**

1. Open the Supabase dashboard → SQL Editor.
2. Open and review `supabase/sql/creative_requests.sql`.
3. Run it. This creates three new tables with RLS policies, indexes, and triggers.
4. To roll back, run `supabase/sql/creative_requests_rollback.sql`.

No existing tables are modified by these scripts.

---

## New Routes

| Route | Type | Auth | Purpose |
|---|---|---|---|
| `/design-requests` | Page | Authenticated | Listing page with search, filters, sort |
| `/design-requests/new` | Page | Authenticated | Generate New Design Request (config + Fill Internally / Share With Client) |
| `/design-requests/[id]` | Page | Authenticated | Request details: brief answers, status, internal notes, comments, deliverable links |
| `/forms/design-request/[token]` | Page | **Public** (no auth) | External client questionnaire form |
| `GET /api/design-requests` | API | Authenticated | List all requests (with search/filter/sort) |
| `POST /api/design-requests` | API | Authenticated | Create a new request |
| `GET /api/design-requests/[id]` | API | Authenticated | Get full request details + responses |
| `PATCH /api/design-requests/[id]` | API | Authenticated | Update status, assignment, internal notes, deadline |
| `GET /api/design-requests/[id]/responses` | API | Authenticated | List comments + deliverable links |
| `POST /api/design-requests/[id]/responses` | API | Authenticated | Add comment / deliverable link |
| `GET /api/design-requests/notifications` | API | Authenticated | List current user's assignment notifications |
| `PATCH /api/design-requests/notifications` | API | Authenticated | Mark notifications as read |
| `GET /api/forms/design-request/[token]` | API | **Public** | Get public form config (company, request type, fields) |
| `POST /api/forms/design-request/[token]` | API | **Public** | Submit public questionnaire answers |

---

## New Pages & Components

| File | Purpose |
|---|---|
| `src/app/design-requests/page.tsx` | Design Requests listing with table, search, status/assignee filters, sort, copy-link |
| `src/app/design-requests/new/page.tsx` | Generate New Design Request: config form + mode selection (Fill Internally / Share With Client) |
| `src/app/design-requests/[id]/page.tsx` | Request details: summary, brief answers, status control, internal notes, comments + deliverable links |
| `src/app/forms/design-request/[token]/page.tsx` | Public client form (no auth) — read-only prefilled fields + editable questionnaire |
| `src/components/CreativeBriefForm.tsx` | Reusable 20-field questionnaire form (shared by internal + public forms) |

## New Backend / Lib

| File | Purpose |
|---|---|
| `src/lib/creativeRequests.ts` | Shared types, questionnaire definition (20 fields, 6 sections), validation, sanitization, constants |
| `src/app/api/design-requests/route.ts` | GET list + POST create |
| `src/app/api/design-requests/[id]/route.ts` | GET details + PATCH update |
| `src/app/api/design-requests/[id]/responses/route.ts` | GET + POST responses (comments + links) |
| `src/app/api/design-requests/notifications/route.ts` | GET + PATCH notifications |
| `src/app/api/forms/design-request/[token]/route.ts` | Public form GET config + POST submission |

## Modified Existing Files

| File | Change |
|---|---|
| `src/components/SidebarNav.tsx` | Added "Design Requests" nav item under "Marketing and Sales" group |
| `src/components/RequireAuth.tsx` | Added `/forms/design-request` to `publicRoutes` array (so public forms skip auth) |

No other existing files were modified. No existing Supabase tables, RLS policies, or data were touched.

---

## New Database Tables

All defined in `supabase/sql/creative_requests.sql` (not executed — run manually).

### `creative_requests`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | Auto-generated |
| `company_id` | uuid FK → `companies(id)` | **Single Client / Brand association** |
| `request_type` | text | One of the Excel Tracker categories |
| `requested_by` | uuid FK → `users(id)` | Internal request creator / owner |
| `assigned_to` | uuid FK → `users(id)` | Design or Content team member |
| `status` | text | `waiting_for_brief`, `in_queue`, `in_progress`, `for_approval`, `need_to_action`, `completed` |
| `submission_source` | text | `internal` or `public` |
| `public_token` | text (unique) | Unguessable 32-byte token for public form URL |
| `answers` | jsonb | The 20-field Creative Request Brief answers |
| `deadline` | date | Target deadline |
| `deadline_notes` | text | TBA / approximate deadline notes |
| `internal_notes` | text | Internal-only notes (never exposed to public) |
| `created_at`, `updated_at`, `submitted_at` | timestamptz | Timestamps |

### `creative_request_responses`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `request_id` | uuid FK → `creative_requests(id)` | Cascade delete |
| `user_id` | uuid FK → `users(id)` | Responding employee |
| `user_name` | text | Denormalized for display |
| `comment` | text | Comment text |
| `deliverable_url` | text | Dropbox / Google Drive / etc. link |
| `created_at`, `updated_at` | timestamptz | |

### `creative_request_notifications`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `request_id` | uuid FK → `creative_requests(id)` | Cascade delete |
| `user_id` | uuid FK → `users(id)` | Assigned user to notify |
| `read_at` | timestamptz | Null = unread |
| `created_at` | timestamptz | |
| | | Unique constraint on `(request_id, user_id)` to prevent duplicates |

### Why a separate notifications table?
The existing notifications system reuses the `tasks` table, whose `source` column has a CHECK constraint limiting values to `('operations', 'admin', 'social_workflow', 'leave', 'document_request')`. Adding a new source value would require modifying the existing `tasks` table constraint — which is prohibited. Therefore, an isolated `creative_request_notifications` table was created instead.

---

## Existing Tables Read by This Feature

| Table | Usage | Modification? |
|---|---|---|
| `companies` | Client / Brand dropdown (read `id`, `name`) | No — read-only FK |
| `users` | Requested By / Assigned To dropdowns (read `id`, `full_name`, `email`) | No — read-only FK |
| `auth.users` | Authentication via `supabaseAdmin.auth.getUser(token)` | No — read-only |

---

## How Request Generation Works

### Option A — Fill Internally
1. Authenticated user opens `/design-requests/new`.
2. Selects **Client / Brand** (single dropdown from existing `companies` records).
3. Selects **Request Type**, **Assigned To**, **Deadline**.
4. Chooses **Fill Internally**.
5. Completes the 20-field Creative Request Brief questionnaire.
6. Submits → `POST /api/design-requests` with `fill_internally: true` and answers.
7. Request is saved with status `in_queue`, `submitted_at` set, and a notification created for the assigned user.
8. User is redirected to the request details page.

### Option B — Share With Client
1. Steps 1–3 same as above.
2. Chooses **Share With Client**.
3. Clicks **Generate Public Form Link** → `POST /api/design-requests` with `share_with_client: true`.
4. A 32-byte unguessable `public_token` is generated; request is saved with status `waiting_for_brief`.
5. The public link `/forms/design-request/{token}` is displayed for copying.
6. The employee shares it externally.

---

## How Public Client Forms Work

1. Client opens `/forms/design-request/{token}` (no login required).
2. `GET /api/forms/design-request/{token}` validates the token server-side and returns:
   - Company name (read-only)
   - Request type (read-only)
   - Request owner name (read-only)
   - The 20 questionnaire fields
3. The client fills the editable fields. Prefilled fields (`client_brand`, `request_type`, `request_owner`) are displayed read-only and **cannot be changed**.
4. On submit → `POST /api/forms/design-request/{token}`:
   - Token is validated server-side.
   - `sanitizeAnswers()` cleans the input.
   - `stripPrefilledFields()` removes any prefilled fields from the client payload (security).
   - Authoritative prefilled values are re-applied from the server.
   - Answers are saved, status set to `in_queue`, `submitted_at` set, `submission_source` set to `public`.
   - The assigned team member receives a notification.
5. The client sees a "Thank You" confirmation page.

### Public Form Security
- Token is 32 bytes of cryptographic randomness (URL-safe base64).
- Prefilled fields are stripped from client input and re-applied server-side.
- No Supabase credentials are exposed to the client.
- No internal user lists, other companies, or other requests are exposed.
- The public API route uses the service-role key server-side only.
- RLS prevents public/anon writes — all writes go through the authenticated API.

---

## How Team Assignment Works

- **Assigned To** is a dropdown populated from the existing `users` table (internal CRM users only).
- No employee names are hardcoded.
- When a request is created or assigned, a row is upserted into `creative_request_notifications` with `onConflict: (request_id, user_id)` to avoid duplicates.
- Assigned users can view their notifications via `GET /api/design-requests/notifications` and mark them read via `PATCH`.

---

## How Notifications Work

- Notifications are stored in `creative_request_notifications` (isolated from the existing `tasks`-based system).
- A notification is created when:
  - A request is created with an assignee.
  - A public form is submitted (if assigned).
  - A request is reassigned via PATCH.
- Duplicate notifications are prevented by the `UNIQUE (request_id, user_id)` constraint.
- The notification links to `/design-requests/{request_id}` for the assigned user to review.

---

## How Comments & Dropbox Links Work

- On the request details page (`/design-requests/[id]`), the **Comments & Deliverable Links** section allows any authenticated internal user to:
  - Enter a comment (textarea).
  - Paste an external deliverable link (Dropbox, Google Drive, Google Sheets, OneDrive, SharePoint, WeTransfer, Box).
- The deliverable URL is validated server-side against a whitelist of HTTPS file-sharing domains.
- Responses are stored in `creative_request_responses` and displayed chronologically with the author name and timestamp.
- Deliverable links are displayed as clickable URLs.

---

## How Status Tracking Works

- The six statuses from the Excel Tracker are implemented: `waiting_for_brief`, `in_queue`, `in_progress`, `for_approval`, `need_to_action`, `completed`.
- Status can be updated on the request details page via a dropdown.
- `PATCH /api/design-requests/[id]` validates the status against the allowed values.
- The listing page supports filtering by status.

---

## How to Run the SQL Manually

1. Go to your Supabase project dashboard.
2. Open the **SQL Editor**.
3. Copy the contents of `supabase/sql/creative_requests.sql`.
4. Review it, then click **Run**.
5. Verify the three tables exist: `creative_requests`, `creative_request_responses`, `creative_request_notifications`.

To roll back:
1. Copy the contents of `supabase/sql/creative_requests_rollback.sql`.
2. Run it in the SQL Editor.

---

## How to Verify the Feature After SQL Deployment

1. **Navigation**: Log in to Cream CRM. "Design Requests" should appear in the sidebar under "Marketing and Sales".
2. **Listing**: Navigate to `/design-requests`. The listing page should load (empty state if no requests).
3. **Create (Internal)**: Click "Generate New Design Request". Select a Client / Brand, Request Type, Assigned To. Choose "Fill Internally". Complete the brief. Submit. Verify the request appears in the listing and the details page shows all answers.
4. **Create (Public)**: Repeat but choose "Share With Client". Copy the generated link. Open it in an incognito window. Verify the form loads with read-only prefilled fields. Complete and submit. Verify the answers appear in the CRM details page.
5. **Notifications**: As the assigned user, check `GET /api/design-requests/notifications` returns a notification.
6. **Comments**: On the details page, add a comment and a Dropbox link. Verify they appear.
7. **Status**: Change the status dropdown. Verify it persists on reload.
8. **Security**: Try submitting the public form with a modified `client_brand` in the payload. Verify the server ignores it and uses the authoritative value.

---

## Tests Executed

| Test | Method | Result |
|---|---|---|
| 20 questionnaire fields present | Local (tsx) | PASS |
| 6 sections in correct order | Local (tsx) | PASS |
| All field labels match Excel workbook | Local (tsx) | PASS |
| Exactly ONE Client / Brand field | Local (tsx) | PASS |
| No Contact Person field | Local (tsx) | PASS |
| 3 prefilled fields correct | Local (tsx) | PASS |
| Status values match Tracker | Local (tsx) | PASS |
| Request types match Tracker | Local (tsx) | PASS |
| sanitizeAnswers trims/drops | Local (tsx) | PASS |
| sanitizeAnswers link arrays | Local (tsx) | PASS |
| sanitizeAnswers rejects bad input | Local (tsx) | PASS |
| stripPrefilledFields security | Local (tsx) | PASS |
| isDesignRequestStatus validation | Local (tsx) | PASS |
| isRequestType validation | Local (tsx) | PASS |
| isValidDeliverableUrl (Dropbox/Drive/Sheets) | Local (tsx) | PASS |
| isValidDeliverableUrl rejects HTTP/evil | Local (tsx) | PASS |
| sanitizeAnswers handles null/undefined/array/string | Local (tsx) | PASS |
| TypeScript compilation | `npm run build` | PASS (compiled successfully) |
| ESLint (new files) | `npm run lint` | PASS (no errors in new files) |

Run tests with: `npx tsx src/lib/creativeRequests.test.ts`

### Tests requiring post-deployment verification (after SQL is applied)
- Database writes (create request, save answers, save responses, create notifications)
- RLS policy enforcement
- Public form token validation against live database
- Notification delivery to assigned users

---

## Assumptions & Notes

1. **Client / Brand is ONE field**: A single dropdown populated from the existing `companies` table. No separate Client or Contact dropdown. The underlying column is `company_id` referencing `companies(id)`.

2. **Requested By defaults to the current authenticated user** and is displayed read-only on the creation form.

3. **Assigned To uses internal CRM users** from the `users` table. No hardcoded names.

4. **No new Admin role** was introduced. All authenticated internal CRM users can generate and submit requests, per the meeting instructions.

5. **Notifications** use a feature-specific table because the existing `tasks`-based notification system cannot be extended without modifying an existing table constraint (prohibited).

6. **Build note**: `npm run build` fails at the "Collecting page data" step due to a **pre-existing** issue — `src/lib/resend.ts` throws at module load when `RESEND_API_KEY` is missing from `.env.local`. This affects pre-existing routes (`/api/emails/send`, `/api/notifications/email`, `/api/notifications/daily-digest`, `/api/social-media/notify-workflow`) and is **not caused by this feature**. TypeScript compilation of all new files passes cleanly.

7. **No Excel sample records** were imported. The example worksheets (Libya Build, Host Libya, etc.) were used only as references for answer formats.

8. **Deadline supports TBA**: The date field includes an optional notes input for approximate/TBA deadlines, and the request config has a separate `deadline_notes` field.

---

## Confirmation

- No existing Supabase tables were modified.
- No existing Supabase data was inserted, updated, or deleted during development.
- No SQL was executed against Supabase.
- No Excel sample records were imported.
- No production test data was created.
- All database additions remain in SQL files for manual review.
- Existing CRM functionality was preserved.
