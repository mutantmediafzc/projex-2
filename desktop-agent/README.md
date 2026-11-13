# Mutant CRM Tracker (desktop app)

A small tray app for Windows and macOS. When a team member is **checked in on the CRM**, it records:

- the app in front of them, and its window title (optional, on by default)
- the website domain, for supported browsers on macOS
- whether they are active or idle (no keyboard or mouse input for the idle threshold, 5 minutes by default)
- screenshots at random points in each interval (optional, **off by default**, blurred by default)

It records nothing while the person is checked out, and nothing until they accept the monitoring notice in the app. Key presses and mouse movements themselves are never recorded.

Admins see everything in the CRM under **HR > Activity Monitor** (`/admin/activity`).

## How it fits together

```
CRM header: Check in / Check out ──► work_sessions (Supabase)
                                         ▲
Desktop app (tray) ── every 5 s: sample active window + idle state
                   ── every 30 s: POST /api/activity/heartbeat ─┘ (segments + live state)
                   ── optional:   POST /api/activity/screenshot ──► private storage bucket
Admin: /admin/activity ── Live / Reports / Settings
```

- The app signs in with the user's normal CRM email and password (Supabase auth). The session is stored encrypted with the OS keychain.
- Samples are held back for the idle threshold before upload, so when the PC reports "idle for 5 minutes" those 5 minutes are re-labelled idle instead of counted as active.
- Uploads that fail (no internet) are queued on disk and retried. The server ignores duplicates.
- Sessions with no tracker contact for 12 hours are closed automatically at the last activity, so a forgotten check-out does not inflate hours.
- Data older than the retention period (90 days by default) is deleted automatically.

## 1. Database

Paste `supabase/migrations/20261113_create_activity_tracking.sql` into the Supabase SQL editor and run it. It only creates new tables and a private storage bucket (`activity-screenshots`). It does not change existing tables and is safe to run twice.

## 2. Deploy the CRM

Deploy this branch as usual. Optional environment variable:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_TRACKER_DOWNLOAD_URL` | Link shown in the CRM header when someone is checked in but the tracker is not running, e.g. a shared drive link to the installers. |

## 3. Build the installers

### Option A: GitHub Actions (no local setup)

1. In GitHub, go to **Settings > Secrets and variables > Actions > Variables** and add:
   - `TRACKER_CRM_URL`: the live CRM address, e.g. `https://crm.example.com`
   - `TRACKER_SUPABASE_URL`: same as `NEXT_PUBLIC_SUPABASE_URL`
   - `TRACKER_SUPABASE_ANON_KEY`: same as `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the public anon key, **never** the service role key)
2. Open **Actions > Build desktop tracker > Run workflow**.
3. Download the `.exe` (Windows) and `.dmg` (macOS) from the run's artifacts.

### Option B: build on your own machine

```bash
cd desktop-agent
npm install
```

Edit `config.json` with the three values above, then on Windows run:

```bash
npm run dist:win
```

or on a Mac run:

```bash
npm run dist:mac
```

Installers are written to `desktop-agent/dist/`. Build the Windows installer on Windows and the Mac one on a Mac.

To try it without building, run `npm start`.

## 4. Install on each PC

- **Windows:** run the `.exe`. Until the installer is code-signed, SmartScreen shows "Windows protected your PC": click **More info > Run anyway**.
- **macOS:** open the `.dmg` and drag the app to Applications. Until it is signed and notarised, right-click the app and choose **Open** the first time. Then grant **System Settings > Privacy & Security > Screen Recording** (needed for window titles and screenshots) and **Accessibility**, and reopen the app.

The person signs in with their CRM email and password and accepts the monitoring notice. The app then starts with the computer and sits in the tray.

For company-wide rollout without warnings, buy a Windows code-signing certificate and an Apple Developer account and add signing to the build. electron-builder supports both.

## Admin settings (`/admin/activity` > Settings)

| Setting | Default |
|---|---|
| Idle after | 5 minutes |
| Record window titles | On |
| Take screenshots | Off |
| Screenshot every | 10 minutes |
| Blur screenshots | On |
| Keep data for | 90 days |

Turning on screenshots or window titles, or turning off blur, issues a new notice version. Every user must accept it in the app before tracking continues.

## Legal checklist before rollout (UAE)

- Issue a written monitoring policy that says what is collected, why, who can see it and for how long, and get each employee's acknowledgement. The in-app notice is a record of this, not a replacement for it.
- If the company is registered in DIFC or ADGM, check against their data protection laws, which are stricter than the federal PDPL.
- Keep screenshots off or blurred unless there is a clear need. Window titles and screenshots can contain personal chats, banking details or patient data.
- Limit admin access to the people who need it.

## Development

```bash
npm test
```

runs the unit tests for the sampling and idle logic in `src/activityBuffer.js`.
