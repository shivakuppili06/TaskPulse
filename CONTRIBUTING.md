# Contributing to Taska

This guide outlines setup instructions, branch naming conventions, and commit styles for the project.

---

## Prerequisites

* Node.js >= 18
* npm >= 9

---

## Local Development Setup

```bash
# 1. Clone the repository
git clone <repository-url>
cd todo-app

# 2. Start the Backend API
cd backend
cp .env.example .env
npm install
npm run dev

# 3. Start the Frontend client (in a new terminal window)
cd ../frontend
npm install
npm run dev
```

The Vite client server handles API requests by proxying `/api/*` to the Express backend server using configurations inside `vite.config.js`.

---

## Folder Structure

```
todo-app/
├── backend/
│   ├── src/
│   │   ├── server.js          # Express initialization
│   │   ├── store.js           # JSON database access methods
│   │   └── routes/
│   │       ├── todos.js       # Task REST endpoints
│   │       └── stats.js       # Stats aggregation endpoint
│   ├── data/
│   │   └── todos.json         # JSON file store (gitignored)
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/        # Modals, layout wrappers, cards
│   │   ├── pages/             # Dashboard, Settings, Tasks workspace
│   │   ├── styles/            # CSS variables and global rules
│   │   ├── api.js             # API request functions
│   │   └── App.jsx            # Routing configurations
│   └── index.html
└── docs/
    └── todoapp.postman_collection.json
```

---

## Git Branch Convention

| Branch Type | Name Pattern | Example |
|-------------|--------------|---------|
| Feature | `feat/<description>` | `feat/recurring-tasks` |
| Fix | `fix/<description>` | `fix/tag-case-sensitivity` |
| Docs | `docs/<description>` | `docs/update-readme` |
| Refactor | `refactor/<description>` | `refactor/extract-api-client` |
| Chore | `chore/<description>` | `chore/update-deps` |

---

## Commit Style Guide

Please follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add support for recurring tasks
fix: handle case sensitivity in tag searches
docs: add architecture diagram to README
chore: update vite to version 5.4
```

---

## Code Additions Workflow

1. Declare backend route handlers inside `backend/src/routes/todos.js`.
2. Define the equivalent API fetch method inside `frontend/src/api.js`.
3. Add a request mockup in `docs/todoapp.postman_collection.json`.
4. Run `npm run build` inside `frontend` to verify production compilation before submitting code changes.
