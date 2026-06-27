# Features & Functionality

This document covers every documented feature in Taska.

---

## Pages

### Page 1 — Todo List (`/`)

The main task management view.

#### Create Tasks
- Click **New Task** button (top-right) to open the add modal.
- Fields: Title (required), Description, Priority, Due Date, Category, Tags.
- Press `Enter` in the title field to quickly save.

#### View Tasks
- All tasks appear as cards in the list.
- Each card shows: title, priority badge, description snippet, category, tags, subtask count, and due date.
- Click any task card body to navigate to its **Detail Page**.

#### Complete Tasks
- Click the **circle button** on the left of each task to toggle it complete/incomplete.
- Completed tasks appear with a strikethrough and reduced opacity.

#### Edit Tasks
- Hover a task to reveal the **edit (pencil) icon** on the right.
- Clicking it opens the same modal pre-filled with the task's data.

#### Delete Tasks
- Hover a task to reveal the **trash icon**.
- Confirmation dialog prevents accidental deletion.

#### Search
- Real-time search bar at the top of the toolbar.
- Searches across **title**, **description**, and **tags** simultaneously.
- Results update as you type (300ms debounce).
- Clear button (×) resets the search.

#### Filter by Status
- **All** — shows every task.
- **Active** — shows only incomplete tasks.
- **Completed** — shows only completed tasks.

#### Filter by Priority
- **All / High / Medium / Low** — filter by task priority.
- Active priority filter is highlighted in the appropriate color.

#### Sort
- **Newest** — sorts by creation date descending (default).
- **Due Date** — sorts by due date, tasks without a due date appear last.
- **Priority** — sorts High → Medium → Low.

#### Bulk Select & Delete
- **Select all** checkbox selects every visible task.
- Individual checkboxes allow multi-select.
- **Delete selected** button removes all selected tasks (with confirmation).
- Selection count shown inline.

#### Clear Completed
- **Clear completed (N)** button deletes all done tasks in one click (with confirmation).

#### Due Date Indicators
- **Overdue** — shown in red on tasks past their due date.
- **Due today** — shown in amber.
- **Due tomorrow** — shown in muted text.

---

### Page 2 — Todo Detail (`/todo?id=<uuid>`)

Full detail view for a single task, navigated to via the task card on the list page.

#### URL Pattern
The page receives the task ID as a query parameter:
```
/todo?id=3f2504e0-4f89-11d3-9a0c-0305e82c3301
```

#### Hero Section
- Large title with strike-through when completed.
- Priority badge, Category badge, and Due date badge.
- Mark Complete / Mark Incomplete toggle button.
- Delete button with confirmation.

#### Status Badges
- **Overdue** (red) — past due date and not completed.
- **Due today** (amber) — due date is today.
- **Due in N days** — due within 3 days (amber).
- **Completed on time** (green) — task done.

#### Subtasks
- Add subtasks inline with the text input at the bottom of the subtasks card.
- Press `Enter` or click **Add** to add a subtask.
- Click the circle next to a subtask to toggle it done/undone.
- Hover a subtask to reveal the delete (×) button.
- **Progress bar** shows completion ratio (e.g. 2/5 subtasks done = 40%).
- Subtask count badge updates in real-time.

#### Notes
- Free-form text notes field.
- Click **Edit** (or **+ Add** if empty) to enter edit mode.
- **Save** persists notes to the backend immediately.
- **Cancel** reverts to the last saved value.

#### Metadata Panel (right column)
Shows structured info about the task:
- **Status** — Active or Completed (color-coded).
- **Priority** — with color matching the badge.
- **Category**
- **Due Date** (formatted)
- **Created** — full datetime.
- **Updated** — full datetime.
- **Completed** — datetime when the task was marked done (only shown if applicable).
- **Task ID** — the UUID, useful for debugging / direct linking.

#### Tags Panel
- All tags displayed as styled chips in the right column.

#### Navigation
- **← All Tasks** breadcrumb button returns to the list page without reloading.

---

## Data Model

Each todo stores the following fields:

| Field         | Description                                      |
|---------------|--------------------------------------------------|
| `id`          | UUID, unique identifier                          |
| `title`       | Task title                                       |
| `description` | Optional long-form description                   |
| `completed`   | Boolean completion state                         |
| `priority`    | `high`, `medium`, or `low`                       |
| `dueDate`     | Optional ISO date string                         |
| `tags`        | Array of string tags                             |
| `category`    | Category string (e.g. Work, Personal, Shopping)  |
| `createdAt`   | ISO datetime of creation                         |
| `updatedAt`   | ISO datetime of last update                      |
| `completedAt` | ISO datetime when marked complete, or null       |
| `subtasks`    | Array of `{ id, text, done }` objects            |
| `notes`       | Free-form text notes                             |

---

## Categories

Built-in categories available in the create/edit modal:
- General (default)
- Work
- Personal
- Shopping
- Health
- Learning
- Finance
- Other

---

## Persistence

Data is persisted to `backend/src/data/todos.json`. The file is created automatically if it doesn't exist. All CRUD operations read from and write to this file synchronously.

---

## Design System

- **Dark theme** only, using CSS custom properties throughout.
- **Color-coded priorities**: red (high), amber (medium), green (low).
- **CSS Modules** for scoped, collision-free styles.
- **Space Grotesk** for headings, **Inter** for body text.
- Responsive down to mobile (stacked layout on narrow screens).
- Smooth transitions and fade-in animations for list items and modals.
