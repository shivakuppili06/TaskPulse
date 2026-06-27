# Features & Functionality — Taska v2.0

This document covers every documented feature. All undocumented features are listed as "bonus" and marked accordingly.

---

## Pages

### Page 1 — Todo List (`/`)

#### Create Tasks
- Click **New Task** button (top right) or press **`N`** anywhere on the page.
- Fields: Title (required), Description, Priority, Due Date, Category, Time Estimate (minutes), Tags, Pin toggle.
- Press `Enter` in the title field to save quickly.

#### View Tasks — List & Grid mode
- Toggle between **list view** and **grid view** using the icons next to the New Task button, or press **`G`**.
- Preference is saved to `localStorage` and persists across sessions.
- Pinned tasks always appear at the top of the list, highlighted with a gold top border.

#### Complete Tasks
- Click the **circle checkbox** left of each task to toggle completion.
- Optimistic UI update — the task updates instantly, then syncs to the server.
- Toast notification confirms "Task completed! 🎉" or "Marked as active".

#### Pin / Unpin Tasks
- Click the 📌 button (appears on hover) to pin any task.
- Pinned tasks float to the top of any filtered/sorted view.
- Toast confirms pin/unpin action.

#### Edit Tasks
- Hover a task → click the **pencil icon** → modal opens pre-filled.

#### Delete Tasks
- Hover a task → click the **trash icon** → confirmation prompt → deleted with toast.
- Optimistic delete: task disappears immediately; rolled back if server fails.

#### Search
- Real-time debounced search (300ms) across **title**, **description**, **tags**, and **category**.
- Press **`/`** to focus the search bar from anywhere.
- Clear button (×) resets search.

#### Filter by Status
- **All / Active / Completed** toggle buttons.
- Keyboard shortcuts **`1`**, **`2`**, **`3`** for each filter.

#### Filter by Priority
- **All / ↑ High / → Med / ↓ Low** toggle buttons.

#### Sort
- **Newest first** (default), **Due Date**, **Priority**, **Title A–Z**.
- Sorting is applied server-side.

#### Bulk Operations
- Select individual tasks via the checkbox on each card.
- **Select all** checkbox selects all currently visible tasks.
- **Delete selected (N)** — bulk delete with confirmation.
- **Clear completed (N)** — clears all done tasks with confirmation.

#### Due Date Indicators
- 🔴 **Overdue** — red, with animation pulse on the header badge.
- 🟡 **Due today** — amber.
- 📅 **Due tomorrow/later** — accent color.
- Overdue count shown in the page header as an animated badge.

#### Keyboard Shortcuts
Press **`?`** to toggle the shortcuts panel. Full list:

| Key | Action |
|-----|--------|
| `N` | New task |
| `/` | Focus search |
| `G` | Toggle grid/list |
| `1` | All tasks |
| `2` | Active tasks |
| `3` | Completed tasks |
| `Esc` | Close modal |
| `?` | Toggle shortcuts panel |

#### Stats Dashboard
- Collapsible dashboard panel at the top of the list.
- **KPIs**: Total, Active, Done, Overdue, Due Today — each color-coded.
- **Completion rate donut chart** with "completed this week" count.
- **Priority breakdown** horizontal bar chart.
- **Top 5 categories** bar chart.
- Stats fetched live from `/api/stats`.

#### Subtask Progress (on cards)
- If a task has subtasks, a thin progress bar and `done/total` ratio is shown on the card.

---

### Page 2 — Todo Detail (`/todo?id=<uuid>`)

#### URL Pattern
```
/todo?id=3f2504e0-4f89-11d3-9a0c-0305e82c3301
```
The ID is passed as a query parameter. Sharing the URL gives the recipient a direct link to the task.

#### Hero Section
- Large title (strike-through when complete).
- Priority badge, Category badge, Due date badge with status (overdue / today / on time).
- **Mark Complete / Mark Incomplete** toggle.
- **Delete** button with confirmation and toast.

#### Subtasks
- Add via the input + `Enter` or **Add** button.
- Toggle individual subtask completion.
- Delete subtask on hover.
- **Progress bar** shows completion ratio.
- All subtask changes auto-save to the backend via PATCH.

#### Notes
- Free-form text notes field.
- Click **Edit / + Add** to enter edit mode.
- **Save** — persists immediately.
- **Cancel** — reverts to last saved value.
- Toast confirms save.

#### Metadata Panel
- Status (Active / Completed), Priority, Category, Due Date, Created, Updated, Completed timestamps, Task ID.

#### Tags Panel
- All tags shown as chips.

---

## Backend Features

### REST API (see `docs/API.md` for full reference)
- `GET /api/todos` — list with search, filter, sort, **pagination** (`?page=&limit=`).
- `GET /api/todos/activity` — returns last 100 activity log entries.
- `GET /api/todos/:id` — single todo.
- `POST /api/todos` — create (now also accepts `pinned`, `timeEstimate`).
- `PUT /api/todos/:id` — full update.
- `PATCH /api/todos/:id` — partial update (toggle, subtasks, notes, pin).
- `DELETE /api/todos/:id` — delete one.
- `DELETE /api/todos` — bulk delete or clear completed.
- `GET /api/stats` — aggregated dashboard statistics.
- `GET /api/health` — health check with version.

### Security & Reliability
- **Helmet.js** — sets secure HTTP headers (XSS, MIME sniffing, etc.).
- **Rate limiting** — 200 requests/minute per IP on all `/api/` routes.
- **Morgan** — HTTP request logging to stdout.
- **Global error handler** — catches unhandled errors and returns clean JSON.
- **404 handler** — returns JSON instead of Express default HTML.

### Activity Log
- Every create, update, complete, and delete is logged with action, todo ID, title, and timestamp.
- Stored in `backend/src/data/activity.json`, capped at 100 entries.
- Accessible via `GET /api/todos/activity`.

### Pagination
- `GET /api/todos?page=1&limit=20` for paginated results.
- Response includes `meta: { total, page, limit, pages }`.

---

## Data Model

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique identifier |
| `title` | string | Task title (required) |
| `description` | string | Optional description |
| `completed` | boolean | Completion state |
| `priority` | string | `high` / `medium` / `low` |
| `dueDate` | string or null | ISO date (`YYYY-MM-DD`) |
| `tags` | string[] | Tag list |
| `category` | string | Category label |
| `pinned` | boolean | Whether task is pinned to top |
| `timeEstimate` | number or null | Estimated minutes to complete |
| `timeSpent` | number | Minutes spent (for future use) |
| `createdAt` | ISO datetime | Creation time |
| `updatedAt` | ISO datetime | Last modification time |
| `completedAt` | ISO datetime or null | Completion time |
| `subtasks` | object[] | `[{ id, text, done }]` |
| `notes` | string | Free-form notes |

---

## Toast Notifications

Every user action emits a toast notification in the bottom-right corner:
- ✓ Green — success (create, update, complete, save, delete)
- ✕ Red — error (network failure, validation)
- ℹ Blue — info (pin/unpin)

Toasts auto-dismiss after 3 seconds with slide-up animation.
