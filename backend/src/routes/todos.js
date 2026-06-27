const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readTodos, writeTodos } = require('../store');

const router = express.Router();

// GET /api/todos — list all todos, with optional filter/search
router.get('/', (req, res) => {
  try {
    let todos = readTodos();

    const { status, priority, search, sortBy, order } = req.query;

    if (status && status !== 'all') {
      todos = todos.filter(t =>
        status === 'completed' ? t.completed : !t.completed
      );
    }

    if (priority && priority !== 'all') {
      todos = todos.filter(t => t.priority === priority);
    }

    if (search) {
      const q = search.toLowerCase();
      todos = todos.filter(
        t =>
          t.title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.tags && t.tags.some(tag => tag.toLowerCase().includes(q)))
      );
    }

    // Sorting
    const sortField = sortBy || 'createdAt';
    const sortOrder = order === 'asc' ? 1 : -1;
    todos.sort((a, b) => {
      if (sortField === 'dueDate') {
        const da = a.dueDate ? new Date(a.dueDate) : new Date('9999');
        const db = b.dueDate ? new Date(b.dueDate) : new Date('9999');
        return (da - db) * sortOrder;
      }
      if (sortField === 'priority') {
        const order = { high: 0, medium: 1, low: 2 };
        return (order[a.priority] - order[b.priority]) * sortOrder;
      }
      return (new Date(b.createdAt) - new Date(a.createdAt)) * sortOrder;
    });

    res.json({ success: true, data: todos, total: todos.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/todos/:id — get a single todo
router.get('/:id', (req, res) => {
  try {
    const todos = readTodos();
    const todo = todos.find(t => t.id === req.params.id);
    if (!todo) return res.status(404).json({ success: false, error: 'Todo not found' });
    res.json({ success: true, data: todo });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/todos — create a todo
router.post('/', (req, res) => {
  try {
    const { title, description, priority, dueDate, tags, category } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }

    const todo = {
      id: uuidv4(),
      title: title.trim(),
      description: description ? description.trim() : '',
      completed: false,
      priority: ['high', 'medium', 'low'].includes(priority) ? priority : 'medium',
      dueDate: dueDate || null,
      tags: Array.isArray(tags) ? tags.map(t => t.trim()).filter(Boolean) : [],
      category: category ? category.trim() : 'General',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
      subtasks: [],
      notes: '',
    };

    const todos = readTodos();
    todos.unshift(todo);
    writeTodos(todos);

    res.status(201).json({ success: true, data: todo });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/todos/:id — fully update a todo
router.put('/:id', (req, res) => {
  try {
    const todos = readTodos();
    const idx = todos.findIndex(t => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Todo not found' });

    const existing = todos[idx];
    const { title, description, priority, dueDate, tags, category, completed, subtasks, notes } = req.body;

    if (title !== undefined && !title.trim()) {
      return res.status(400).json({ success: false, error: 'Title cannot be empty' });
    }

    const wasCompleted = existing.completed;
    const nowCompleted = completed !== undefined ? Boolean(completed) : existing.completed;

    todos[idx] = {
      ...existing,
      title: title !== undefined ? title.trim() : existing.title,
      description: description !== undefined ? description.trim() : existing.description,
      priority: priority !== undefined ? priority : existing.priority,
      dueDate: dueDate !== undefined ? dueDate : existing.dueDate,
      tags: tags !== undefined ? tags : existing.tags,
      category: category !== undefined ? category : existing.category,
      completed: nowCompleted,
      subtasks: subtasks !== undefined ? subtasks : existing.subtasks,
      notes: notes !== undefined ? notes : existing.notes,
      updatedAt: new Date().toISOString(),
      completedAt: !wasCompleted && nowCompleted ? new Date().toISOString() : existing.completedAt,
    };

    writeTodos(todos);
    res.json({ success: true, data: todos[idx] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/todos/:id — partial update (toggle complete, etc.)
router.patch('/:id', (req, res) => {
  try {
    const todos = readTodos();
    const idx = todos.findIndex(t => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Todo not found' });

    const existing = todos[idx];
    const patch = req.body;

    const wasCompleted = existing.completed;
    const nowCompleted = patch.completed !== undefined ? Boolean(patch.completed) : existing.completed;

    todos[idx] = {
      ...existing,
      ...patch,
      completed: nowCompleted,
      updatedAt: new Date().toISOString(),
      completedAt: !wasCompleted && nowCompleted ? new Date().toISOString() : existing.completedAt,
    };

    writeTodos(todos);
    res.json({ success: true, data: todos[idx] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/todos/:id
router.delete('/:id', (req, res) => {
  try {
    const todos = readTodos();
    const idx = todos.findIndex(t => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Todo not found' });

    todos.splice(idx, 1);
    writeTodos(todos);
    res.json({ success: true, message: 'Todo deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/todos — bulk delete completed
router.delete('/', (req, res) => {
  try {
    const { ids } = req.body;
    let todos = readTodos();

    if (Array.isArray(ids)) {
      todos = todos.filter(t => !ids.includes(t.id));
    } else {
      // delete all completed
      todos = todos.filter(t => !t.completed);
    }

    writeTodos(todos);
    res.json({ success: true, message: 'Todos deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
