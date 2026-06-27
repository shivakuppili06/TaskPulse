# Changelog

All notable changes to **todoapp** are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [2.1.0] — 2026-06-27

### Added — Frontend
- **Drag-and-drop reordering** — manually reorder tasks; order persists to backend via `POST /api/todos/reorder`
- **Recurring tasks** — `repeat` field (daily / weekly / monthly); completing a recurring task auto-creates the next occurrence
- **Dark / Light theme toggle** — sun/moon button in navbar; preference saved to `localStorage`
- **Optimistic undo delete** — task removed from UI immediately with a 5-second Undo toast; API call fires only if not undone
- **Confetti on all-done** — `canvas-confetti` burst when active task count reaches zero
- **Loading skeletons** — shimmer skeleton cards replace the spinner during initial load
- **Error boundary** — React `<ErrorBoundary>` wraps the whole app; JS crashes show a fallback instead of a white screen

### Added — Backend
- `GET /api/todos/export?format=csv|json` — download all todos as CSV or JSON
- `POST /api/todos/reorder` — accepts `{ ids: [...] }` and persists custom sort order
- `repeat` field on todos — stored and respected across POST / PUT / PATCH
- Auto-creates next recurring occurrence when a recurring task is marked complete
- `dotenv` integration — `PORT` and future config read from `.env`
- Graceful shutdown — `SIGTERM` / `SIGINT` close the HTTP server cleanly before exit
- `.env.example` committed for developer onboarding

### Fixed
- Tag filter already case-insensitive (confirmed correct, no regression)

---

## [2.0.0] — Initial v2 release

### Added
- Complete rewrite from vanilla JS → React 18 + Vite frontend
- Express backend with JSON file store
- Subtasks, notes, time estimates, categories, tags
- Priority levels (high / medium / low)
- Stats dashboard with completion rate
- Activity log (last 100 actions)
- Pinned tasks
- Bulk delete / clear completed
- Grid / list view toggle
- Keyboard shortcuts (N, /, G, 1-3, ?, Esc)
- Pagination support on API
- Rate limiting, helmet, morgan, CORS

---

## [1.0.0] — Legacy

- Single-page vanilla JS todo with localStorage
