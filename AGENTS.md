# SmartChalk agent instructions

## Product direction

SmartChalk is in a **static-first stabilization phase**. Its immediate goal is to make the hosted, browser-local application logic work correctly before any offline packaging or database project begins.

The deployed application is a static React/Vite site. User content is stored locally in IndexedDB and backed up through JSON export/import. The system does **not** currently require a server database, server synchronization, Supabase, Vercel Blob, or remote file storage.

## Visual design direction

SmartChalk’s interface should feel **modern, bold, confident, and educational**. The primary visual language is black and yellow with warm neutral support colors. Use a restrained palette built around near-black `#111111`, charcoal `#1F1F1F`, SmartChalk yellow `#FFC400`, bright highlight yellow `#FFD21F`, warm white `#FFFDF7`, and neutral gray `#6B7280` for secondary text and borders.

Do not use the former Apex-associated green anywhere in the SmartChalk theme. Avoid green, mint, teal, turquoise, lime, or green-tinted gradients in backgrounds, buttons, badges, charts, status states, illustrations, or generated educational materials. Success states should use a high-contrast black-and-yellow or neutral treatment rather than green. Keep the visual system consistent across the dashboard, generators, settings, template cards, headers, footers, and exported outputs.

Preferred styling characteristics are strong black surfaces for the dark theme, yellow emphasis lines and controls, crisp white or warm-white content panels for the light theme, high-contrast typography, generous spacing, rounded but not playful cards, and clear editorial hierarchy. Yellow should be used as a deliberate accent rather than covering every surface. Preserve accessible contrast and visible keyboard focus states.

The **dark theme** should follow the Concept 1 direction: a near-black application shell, charcoal content panels, warm-white text, yellow active navigation, yellow primary actions, and subtle charcoal separation. It should feel powerful, focused, and premium without becoming visually noisy.

The **light theme** should follow the Concept 3 direction: a warm-white or very light neutral page, a restrained black header or footer, thin charcoal borders, warm-white content cards, yellow active indicators and primary controls, and minimal black structural elements. Do not place a large black block behind the main content in the light theme. Black should be limited to navigation, header/footer structure, text, borders, and small high-impact controls.

Both themes must avoid green, mint, teal, turquoise, lime, and green-tinted gradients. The light theme must remain calm and spacious; the dark theme may be more dramatic but must preserve readability and accessible contrast.

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
