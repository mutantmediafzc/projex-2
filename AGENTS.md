# Repository Guidelines

## Project Structure & Module Organization

This repository is a Next.js 16 application using the App Router, React 19, TypeScript, Tailwind CSS, and Supabase. Route pages, layouts, and server endpoints live in `src/app/`; API handlers are grouped under `src/app/api/`. Shared React components belong in `src/components/`, while integrations and reusable clients belong in `src/lib/` (for example, `supabaseClient.ts`). Static files are stored in `public/`. Database definitions and chronological migrations live in `supabase/`; keep one-off maintenance or import utilities in `scripts/`. API notes and Postman collections belong in `docs/`.

## Build, Test, and Development Commands

- `npm ci` installs the exact dependency versions in `package-lock.json`.
- `npm run dev` starts the local Webpack development server at `http://localhost:3000`.
- `npm run lint` runs ESLint with Next.js Core Web Vitals and TypeScript rules.
- `npm run build` creates a production build and catches route and type integration failures.
- `npm start` serves the completed production build.

Run lint and build before requesting review. Do not commit generated `.next/` content.

## Coding Style & Naming Conventions

Use TypeScript with strict checking and the `@/*` alias for imports from `src/`. Follow the existing two-space indentation, semicolons, and double quotes. Name React components and component files in PascalCase (`TaskDetailModal.tsx`), utilities in camelCase, and route directories in lowercase kebab-case. Follow Next.js route conventions such as `page.tsx`, `layout.tsx`, `route.ts`, and `[id]`. Keep browser-only modules explicitly marked with `"use client"`; otherwise prefer server components and server-side handling.

## Testing Guidelines

No automated test framework or coverage threshold is currently configured. For every change, run `npm run lint` and `npm run build`, then manually exercise the affected page or API route. If adding tests, colocate them as `*.test.ts` or `*.test.tsx` near the code and add the runner command to `package.json`.

## Database, Security & Configuration

Store secrets only in `.env.local`; never commit Supabase service keys, Resend credentials, or other tokens. Use `NEXT_PUBLIC_` only for values safe to expose in the browser. Add schema changes as new, descriptively named SQL files under `supabase/migrations/` instead of rewriting applied migrations.

## Commit & Pull Request Guidelines

Use concise, imperative commit subjects consistent with history: `Add campaign lead management kanban` or `Fix campaign token verification client`. Keep each commit focused. Pull requests should explain the change and verification performed, link the relevant issue, call out migrations or environment changes, and include screenshots for visible UI updates.
