# SmartChalk

SmartChalk is an education-content workspace for creating and exporting tests, exams, homework, lesson plans, and presentation materials. The current release is intentionally a **hosted, database-free static application**: it focuses on making the client-side product logic reliable before adding server-side infrastructure.

## Current operating model

The production website is a Vite/React single-page application. Content is stored in the user’s browser through IndexedDB, and users can export or import a JSON backup from **Settings**. AI-assisted generation uses a provider key configured by the user in the browser.

> **Current priority:** make user-facing logic, creation workflows, validation, exports, and browser-local persistence dependable. Do not reintroduce a backend database, server synchronization, Supabase, Vercel Blob, or other hosted persistence during this phase unless the user explicitly changes the roadmap.

| Area | Current implementation | Intended result |
|---|---|---|
| Application hosting | Static Vite deployment | Reliable, low-operations public website |
| Persistence | Browser-local IndexedDB | Per-device local workspace with JSON backup/restore |
| AI generation | User-configured Gemini, OpenAI, or Ollama provider | Generation without storing provider keys on a server |
| Exports | Client-side document-generation workflows | Usable educational materials without backend dependence |
| Database | Deliberately deferred | Added only after core logic has been stabilized |

## Staged roadmap

### Phase 1 — Stabilize hosted static logic **(current)**

Future work should prioritize the existing user experience. Test and improve the test, exam, homework, lesson, and slides workflows; verify browser-local saving/loading; ensure exports include the current SmartChalk branding; improve error states; and keep Settings export/import reliable. New work should be compatible with static hosting.

### Phase 2 — Offline migration **(later, only when requested)**

After the hosted static workflows are stable, package or adapt the application for offline-first use. Preserve the browser-local data model, ensure AI-provider configuration is understandable in an offline context, and retain portable JSON backup/restore. Do not assume an offline migration requires a database.

### Phase 3 — Database and multi-user architecture **(later, only when requested)**

Add a database only after the product logic and offline requirements are known. This phase should begin with a data migration design, account and authorization model, server-side secret handling, backup strategy, and concurrency/load testing. The intended persistence should be an internal database controlled by the SmartChalk deployment—not Supabase or other managed application-database integrations unless the user explicitly chooses otherwise.

## Instructions for future AI agents

Before changing architecture, read this README and `AGENTS.md`. Treat the static-first roadmap as the active product requirement. Keep work focused on functional correctness, reliable local persistence, export quality, and accessible UI behavior. If a task appears to require server state, propose a client-side or export/import alternative first; ask for user approval before adding any persistent backend service or external database.

## Run locally

**Prerequisites:** Node.js 22 or later.

1. Install dependencies:
   ```bash
   npm install
   ```
2. Optionally configure an AI provider key in `.env.local` for development, for example:
   ```bash
   GEMINI_API_KEY=your_key_here
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Create a production build:
   ```bash
   npm run build
   ```

## Static deployment

The application is configured to build to `dist` and use SPA routing. Deploy it as a static Vite site. No application database, server API, or server-side upload storage is required for the current phase.

## Data responsibility

Browser-local content belongs to the user’s current browser profile. Users should use the JSON export feature before clearing browser data, switching devices, or using private browsing. The later database phase must include a deliberate migration path from these exports.
