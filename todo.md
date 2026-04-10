# Onchat TODO

## What the app does

Onchat is a Supabase-backed workspace app built with Vite and React. It combines:

- workspace switching and a shared app shell
- chat channels with realtime message updates
- page editing with rich text and AI assistance
- task tracking with a simple kanban flow
- unified workspace search
- a public landing page for unauthenticated visitors

## Improvements to prioritize

### 1. Stabilize the data model and API layer

- Replace the generic `db.entities.*` wrapper with feature-specific services so each domain can validate payloads and hide table details.
- Align the `entities/*` schema files, frontend assumptions, and actual Supabase tables. There are signs of drift around workspace ownership and timestamps.
- Add runtime validation with `zod` for data crossing the network boundary.

### 2. Move sensitive AI work off the client

- The Groq API key is read directly in the frontend. This should be moved to a server-side function or Supabase Edge Function immediately.
- Centralize AI prompt construction so page AI and assistant AI share one safe interface with consistent error handling, token limits, and auditability.

### 3. Harden auth and account lifecycle

- Add an auth state subscription instead of relying only on the initial session check.
- Replace the current client-side `deleteAccount` placeholder with a real backend flow. `supabase.auth.admin.deleteUser` should not be called from the browser.
- Define explicit behavior for unauthenticated, expired-session, and unregistered-user states.

### 4. Add real test coverage

- Add unit tests for helpers and feature services.
- Add integration tests for auth gating, workspace selection, search, task creation, and page creation.
- Add one end-to-end smoke test for the main happy path: login, create workspace, create page, create task, send chat message.

### 5. Fix encoding and content hygiene

- Several files contain mojibake or copied marketing text artifacts. Standardize all files to UTF-8 and clean affected UI strings.
- Audit emoji-heavy literals and keep only the ones that are intentional.

### 6. Improve error handling and UX resilience

- Surface API failures with visible toasts instead of only `console.error`.
- Add loading and empty states consistently across workspace-scoped views.
- Prevent silent failures on mutations like send message, create workspace, create task, and AI actions.

### 7. Reduce bundle size

- The production bundle is over 1 MB before gzip for the main JS chunk.
- Lazy-load heavy routes and libraries such as `react-quill`, markdown rendering, and AI-related screens.
- Configure manual chunking for editor, charts, and rarely used UI modules.

### 8. Clean up the codebase structure

- Standardize casing and naming across `Pages`, `components`, and file imports.
- Remove unused imports and dead code paths as part of each feature touch.
- Decide whether this is a JS project with selective typing or a TS project, then finish that migration consistently.

### 9. Improve search and collaboration depth

- Move search to server-side/full-text search for scalability.
- Add deep links into chats and tasks from search results instead of routing to the top-level page only.
- Consider unread counts, mentions, and message grouping/pagination in chat.

### 10. Add operational basics

- Add environment validation on startup.
- Add CI for `lint`, `typecheck`, and `build`.
- Document Supabase setup, required tables, and local development expectations more clearly in `README.md`.
