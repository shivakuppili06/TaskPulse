# Features & Functionality - Taska

Taska contains a series of interactive, clean layout workspaces designed for task tracking.

---

## Workspace Layouts

### 1. Dashboard View
* **Workspace Metrics:** Displays cards highlighting Total, Active, Completed, and Overdue task numbers.
* **Completion Progress:** Visual ring chart indicating overall task completion percentages.
* **Recent Activity Feed:** Scrollable log showing the last five updates synchronized from the database.
* **Upcoming Deadlines:** Displays tasks sorted by upcoming dates.

### 2. Task Workspace (List, Grid, and Board Views)
* **View Modes:** Toggle between List, Grid, and Board layouts. Preference persists via local storage.
* **Filter and Sort:** Real-time search across task titles and descriptions. Filters for priorities (High, Medium, Low), category tags, and due dates. Sorting order includes custom dragging, newest created, due date, priority levels, and alphabetical order.
* **Task Pinning:** Highlighted tasks remain locked at the top of the workspace.
* **Bulk Operations:** Multi-select check rows for bulk deletion, archivation, and priority updates.
* **Inline Board Creation:** Quick-add text inputs inside Board columns allow rapid task creation.

### 3. Task Details View
* **Checklists:** Manage subtask steps with completion checkboxes and a visual completion percentage bar.
* **Notes Area:** Rich text descriptions and notes saved instantly to the database.
* **Metadata details:** Access exact creation timestamps, modified history, UUID tags, and priority details.

---

## Backend Infrastructure

* **API Client:** Standardized REST routes handling filtering, sorting, reordering, and activity logs.
* **File Database Storage:** Custom JSON file read/write methods saving details to a gitignored file.
* **Security Middleware:** CORS setups, rate-limiting handlers, and custom error boundaries configured to prevent crashes.
* **Data Exporters:** Downloads all tasks as a structured CSV or JSON file.
