# Taska — Full Stack Todo Application

A full-stack multi-page Todo app built with **React + Vite** (frontend) and **Node.js + Express** (backend), with file-based JSON persistence.

---

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | React 18, React Router DOM v6, Vite |
| Backend   | Node.js, Express.js                 |
| Storage   | JSON file (`backend/src/data/todos.json`) |
| Styling   | CSS Modules, Google Fonts           |
| ID gen    | `uuid` v4                           |

---

## Project Structure

```
todo-app/
├── backend/
│   ├── src/
│   │   ├── server.js          # Express app entry
│   │   ├── store.js           # File-based read/write helpers
│   │   ├── routes/
│   │   │   └── todos.js       # All CRUD routes
│   │   └── data/
│   │       └── todos.json     # Persisted data (auto-created)
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── main.jsx           # React entry point
│   │   ├── App.jsx            # Router with multiple pages
│   │   ├── api.js             # API helper functions
│   │   ├── styles/
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── Navbar.jsx / .module.css
│   │   │   ├── TodoItem.jsx / .module.css
│   │   │   └── AddTodoModal.jsx / .module.css
│   │   └── pages/
│   │       ├── TodoListPage.jsx / .module.css
│   │       └── TodoDetailPage.jsx / .module.css
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── docs/
│   ├── API.md                 # Full REST API reference
│   └── FEATURES.md            # Feature documentation
└── README.md
```

---

## Quick Start

### 1. Install & Run Backend

```bash
cd backend
npm install
npm start
# Server runs at http://localhost:5000
```

### 2. Install & Run Frontend

```bash
cd frontend
npm install
npm run dev
# App runs at http://localhost:3000
```

The Vite dev server proxies `/api/*` requests to `http://localhost:5000`.

---

## Pages

### `/` — Todo List Page
The main page. Lists all todos with filtering, search, sorting, and bulk actions.

### `/todo?id=<uuid>` — Todo Detail Page
Shows a single todo by its ID (passed as a query parameter). Includes subtask management, notes editing, and full metadata view.

---

## Documentation

- [API Reference](./docs/API.md) — all REST endpoints
- [Features](./docs/FEATURES.md) — full feature list
