# API Reference

Base URL: `http://localhost:5000/api`

All responses return JSON payloads with the following shape:
```json
{ "success": true, "data": ... }
```
In case of errors, the payload returns:
```json
{ "success": false, "error": "Error details" }
```

---

## Endpoints

### GET /todos

List all tasks. Supports filtering, searching, and sorting via query parameters.

**Query Parameters**

| Parameter | Type | Values | Default |
|-----------|------|--------|---------|
| `status` | string | `all`, `active`, `completed`, `archived`, `deleted` | `all` |
| `priority`| string | `all`, `high`, `medium`, `low` | `all` |
| `category`| string | `all`, category name | `all` |
| `search` | string | Search keyword | - |
| `sortBy` | string | `order`, `createdAt`, `dueDate`, `priority`, `title` | `order` |

**Example Request**
```
GET /api/todos?status=active&priority=high&sortBy=dueDate
```

---

### GET /todos/:id

Fetch a single task by its UUID.

**Example Response**
```json
{
  "success": true,
  "data": {
    "id": "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
    "title": "Design Landing Page",
    "description": "Create desktop and mobile layouts",
    "completed": false,
    "priority": "medium",
    "dueDate": "2026-07-01",
    "tags": ["design"],
    "category": "Work",
    "createdAt": "2026-06-27T10:00:00.000Z",
    "updatedAt": "2026-06-27T10:00:00.000Z",
    "completedAt": null,
    "subtasks": [],
    "notes": "",
    "kanbanStatus": "todo"
  }
}
```

---

### POST /todos

Create a new task.

**Request Body**
```json
{
  "title": "Buy groceries",
  "description": "Milk, eggs, bread",
  "priority": "medium",
  "dueDate": "2026-07-01",
  "tags": ["errands"],
  "category": "Shopping",
  "kanbanStatus": "todo"
}
```

---

### PUT /todos/:id

Fully update an existing task. Send all fields you want to update (omitted properties will remain unchanged).

---

### PATCH /todos/:id

Partially update task fields (e.g. toggle completion or update notes).

---

### DELETE /todos/:id

Move a task to the trash or permanently delete it if it is already inside the trash.

---

### DELETE /todos

Bulk delete tasks based on a list of IDs.

**Request Body**
```json
{ "ids": ["uuid1", "uuid2"] }
```

---

### GET /health

Backend status health check.
```json
{ "status": "ok", "timestamp": "2026-06-27T10:00:00.000Z" }
```
