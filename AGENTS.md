# SmartChalk agent instructions

## Product direction

SmartChalk is in a **static-first stabilization phase**. Its immediate goal is to make the hosted, browser-local application logic work correctly before any offline packaging or database project begins.

The deployed application is a static React/Vite site. User content is stored locally in IndexedDB and backed up through JSON export/import. The system does **not** currently require a server database, server synchronization, Supabase, Vercel Blob, or remote file storage.

## Required implementation priorities

1. Prioritize correctness and usability in the test, exam, homework, lesson, slide, manual-builder, local saving/loading, and export workflows.
2. Keep SmartChalk branding consistent in the UI and generated materials.
3. Preserve browser-local persistence and verify backup/restore behavior whenever models or save formats change.
4. Keep the website deployable as a static Vite application.
5. Prefer client-side approaches, portable export/import, and clearly scoped local state over adding infrastructure.

## Architecture boundaries

Do not introduce a database, backend API dependency, Supabase, Vercel Blob, server synchronization, or other managed persistence service without explicit user approval. If new functionality appears to need server state, first identify whether it can be solved with IndexedDB, local files, or JSON export/import.

AI provider integration is allowed only as a user-configured client-side feature in the current phase. Do not expose hard-coded provider keys, and do not add server-side secret handling unless the user has approved the future database/server architecture phase.

## Later phases — do not start early

### Offline migration

Only after static workflows are stable, adapt the application for offline-first operation. Retain portable local data and a clear backup/restore path.

### Internal database and multi-user architecture

Only after the user requests it, design a database migration. Begin with an explicit data model, migration from IndexedDB/JSON exports, authentication and authorization requirements, backup/recovery, encrypted secret handling, and load/concurrency tests. The default target is an internal database controlled by SmartChalk, not a third-party managed application database.

## Validation expectations

For frontend changes, run `npm run build`. Validate the relevant browser workflow. For persistence changes, verify that data can be created, saved, loaded, exported, and restored without a backend.
