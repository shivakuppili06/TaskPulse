# API Reference

Base URL: `http://localhost:5000/api`

All responses are JSON with the shape:
```json
{ "success": true, "data": ... }
// or on error:
{ "success": false, "error": "message" }
```

---

## Endpoints

### `GET /todos`

List all todos. Supports query parameters for filtering, searching, and sorting.

**Query Parameters**

| Parameter | Type   | Values                          | Default      |
|-----------|--------|---------------------------------|--------------|
| `status`  | string | `all`, `active`, `completed`    | `all`        |
| `priority`| string | `all`, `high`, `medium`, `low`  | `all`        |
| `search`  | string | any text                        | —            |
| `sortBy`  | string | `createdAt`, `dueDate`, `priority` | `createdAt` |
| `order`   | string | `asc`, `desc`                   | `desc`       |

**Example**
```
GET /api/todos?status=active&priority=high&sortBy=dueDate
```

**Response**
```json
{
  "success": true,
  "data": [ ...todos ],
  "total": 3
}
```

---

### `GET /todos/:id`

Get a single todo by its UUID.

**Response**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Buy groceries",
    "description": "Milk, eggs, bread",
    "completed": false,
    "priority": "medium",
    "dueDate": "2026-07-01",
    "tags": ["errands"],
    "category": "Shopping",
    "createdAt": "2026-06-27T10:00:00.000Z",
    "updatedAt": "2026-06-27T10:00:00.000Z",
    "completedAt": null,
    "subtasks": [],
    "notes": ""
  }
}
```

---

### `POST /todos`

Create a new todo.

**Body**
```json
{
  "title": "Buy groceries",        // required
  "description": "...",            // optional
  "priority": "high",              // optional: "high" | "medium" | "low" (default: "medium")
  "dueDate": "2026-07-01",         // optional: ISO date string
  "tags": ["tag1", "tag2"],        // optional: array of strings
  "category": "Shopping"           // optional (default: "General")
}
```

**Response** — `201 Created`
```json
{ "success": true, "data": { ...newTodo } }
```

---

### `PUT /todos/:id`

Fully update a todo. Send all fields you want to keep (fields omitted retain existing values).

**Body** — same fields as POST, plus:
```json
{
  "completed": true,
  "subtasks": [{ "id": "...", "text": "...", "done": false }],
  "notes": "Some notes"
}
```

**Response**
```json
{ "success": true, "data": { ...updatedTodo } }
```

---

### `PATCH /todos/:id`

Partially update a todo. Only send fields you want to change.

**Common use cases:**
- Toggle complete: `{ "completed": true }`
- Update notes: `{ "notes": "new notes" }`
- Update subtasks: `{ "subtasks": [...] }`

**Response**
```json
{ "success": true, "data": { ...updatedTodo } }
```

---

### `DELETE /todos/:id`

Delete a single todo by ID.

**Response**
```json
{ "success": true, "message": "Todo deleted" }
```

---

### `DELETE /todos`

Bulk delete todos.

**Body — delete specific IDs:**
```json
{ "ids": ["uuid1", "uuid2"] }
```

**Body — delete all completed (send empty body or `{}`):**
```json
{}
```

**Response**
```json
{ "success": true, "message": "Todos deleted" }
```

---

### `GET /health`

Health check endpoint.

**Response**
```json
{ "status": "ok", "timestamp": "2026-06-27T10:00:00.000Z" }
```

---

## Todo Object Schema

| Field         | Type            | Description                              |
|---------------|-----------------|------------------------------------------|
| `id`          | string (UUID)   | Unique identifier                        |
| `title`       | string          | Task title (required)                    |
| `description` | string          | Optional longer description              |
| `completed`   | boolean         | Whether the task is done                 |
| `priority`    | string          | `high`, `medium`, or `low`               |
| `dueDate`     | string or null  | ISO date string (`YYYY-MM-DD`)           |
| `tags`        | string[]        | Array of tag strings                     |
| `category`    | string          | Category label                           |
| `createdAt`   | ISO datetime    | When the todo was created                |
| `updatedAt`   | ISO datetime    | When the todo was last modified          |
| `completedAt` | ISO datetime or null | When the todo was marked complete   |
| `subtasks`    | object[]        | Array of `{ id, text, done }` objects    |
| `notes`       | string          | Free-form notes text                     |

---

## Error Responses

| Status | Meaning                       |
|--------|-------------------------------|
| 400    | Validation error (e.g. missing title) |
| 404    | Todo not found                |
| 500    | Internal server error         |
