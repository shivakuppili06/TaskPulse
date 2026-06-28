# Changelog

All notable changes to this project are documented here.

---

## [2.1.0] - 2026-06-27

### Added - Frontend
* **Drag-and-drop reordering:** Reorder tasks directly. Order persists to the backend via `POST /api/todos/reorder`.
* **Recurring tasks:** Completed recurring tasks auto-create the next occurrence based on the `repeat` interval (daily, weekly, monthly).
* **Dark & Light theme toggle:** Theme preference is saved to `localStorage` and toggled via the sidebar.
* **Optimistic undo delete:** Deletes are handled optimistically with a 5-second undo toast before the API call is processed.
* **Confetti feedback:** Adds a confetti burst when all active tasks in the workspace are completed.
* **Loading skeletons:** Replaces loading spinners with shimmer skeletons for cards.
* **React Error Boundary:** Fallback UI renders instead of a blank screen when React components crash.

### Added - Backend
* `GET /api/todos/export?format=csv|json` - Export all tasks as a CSV or JSON file.
* `POST /api/todos/reorder` - Persists custom task order from payload `{ ids: [...] }`.
* Support for `repeat` configuration across task updates.
* Automatically creates the next recurring instance when a task completes.
* `.env` file configuration using `dotenv`.
* Clean shutdown logic handling `SIGTERM` and `SIGINT` signals.

---

## [2.0.0] - Initial v2 release

### Added
* Refactored client from vanilla JavaScript to React 18 and Vite.
* Express backend with JSON file storage layer.
* Subtasks checklists, metadata, and task notes.
* Pinned task priority.
* Completion stats dashboard.
* Activity logger (restricted to the last 100 actions).
* Bulk edit and clear operations.
* Keyboard shortcut binds (`N`, `/`, `Esc`).
