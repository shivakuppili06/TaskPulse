# Contributing to todoapp

Thank you for your interest! This guide covers setup, development workflow, and conventions.

---

## Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9

---

## Local Setup

```bash
# 1. Clone the repo
git clone <repo-url>
cd todo-app

# 2. Backend
cd backend
cp .env.example .env        # copy env template
npm install
npm run dev                 # starts on http://localhost:5000

# 3. Frontend (in a separate terminal)
cd ../frontend
npm install
npm run dev                 # starts on http://localhost:3000
```

The Vite dev server proxies `/api/*` requests to the Express backend automatically via `vite.config.js`.

---

## Project Structure

```
todo-app/
├── backend/
│   ├── src/
│   │   ├── server.js          # Express app entry, graceful shutdown
│   │   ├── store.js           # JSON file read/write helpers
│   │   └── routes/
│   │       ├── todos.js       # CRUD + export + reorder endpoints
│   │       └── stats.js       # Dashboard stats endpoint
│   ├── data/
│   │   └── todos.json         # Persisted todos (gitignored)
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/        # Reusable React components
│   │   ├── pages/             # Route-level page components
│   │   ├── styles/            # Global CSS variables + animations
│   │   ├── api.js             # Fetch wrapper for all API calls
│   │   └── App.jsx            # Router + providers root
│   └── index.html
└── docs/
    └── todoapp.postman_collection.json
```

---

## Branch Naming

| Type        | Pattern                      | Example                       |
|-------------|------------------------------|-------------------------------|
| Feature     | `feat/<short-description>`   | `feat/recurring-tasks`        |
| Bug fix     | `fix/<short-description>`    | `fix/tag-filter-case`         |
| Docs        | `docs/<short-description>`   | `docs/update-readme`          |
| Refactor    | `refactor/<description>`     | `refactor/extract-api-client` |
| Chore       | `chore/<description>`        | `chore/update-deps`           |

---

## Commit Style

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add recurring task support
fix: correct tag filter case sensitivity
docs: add architecture diagram to README
chore: bump vite to 5.4
```

---

## Adding a New API Endpoint

1. Add the route handler in `backend/src/routes/todos.js` or `stats.js`
2. Add the corresponding method in `frontend/src/api.js`
3. Add a request example to `docs/todoapp.postman_collection.json`

---

## Running Tests

No automated test suite yet — contributions welcome! Verify manually using the Postman collection in `docs/`.
