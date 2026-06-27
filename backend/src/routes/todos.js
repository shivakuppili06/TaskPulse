const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readTodos, writeTodos, readActivity, writeActivity } = require('../store');

const router = express.Router();

function logActivity(action, todo) {
  const log = readActivity();
  log.unshift({ id: uuidv4(), action, todoId: todo.id, todoTitle: todo.title, timestamp: new Date().toISOString() });
  writeActivity(log.slice(0, 100));
}

/** Compute the next due date for a recurring task */
function nextDueDate(dueDate, repeat) {
  if (!dueDate || !repeat) return null;
  const d = new Date(dueDate);
  if (repeat === 'daily')   d.setDate(d.getDate() + 1);
  if (repeat === 'weekly')  d.setDate(d.getDate() + 7);
  if (repeat === 'monthly') d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

// GET /api/todos
router.get('/', (req, res) => {
  try {
    let todos = readTodos();
    const { status, priority, search, sortBy, order, category, tag } = req.query;

    if (status && status !== 'all') {
      todos = todos.filter(t => status === 'completed' ? t.completed : !t.completed);
    }
    if (priority && priority !== 'all') {
      todos = todos.filter(t => t.priority === priority);
    }
    if (category && category !== 'all') {
      todos = todos.filter(t => t.category === category);
    }
    if (tag) {
      todos = todos.filter(t => t.tags?.some(tg => tg.toLowerCase() === tag.toLowerCase()));
    }
    if (search) {
      const q = search.toLowerCase();
      todos = todos.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.tags && t.tags.some(tg => tg.toLowerCase().includes(q))) ||
        (t.category && t.category.toLowerCase().includes(q))
      );
    }

    const sortField = sortBy || 'order';
    const dir = order === 'asc' ? 1 : -1;
    todos.sort((a, b) => {
      if (sortField === 'order') {
        // Use custom order field; fall back to createdAt for items without order
        const oa = a.order ?? Number.MAX_SAFE_INTEGER;
        const ob = b.order ?? Number.MAX_SAFE_INTEGER;
        if (oa !== ob) return oa - ob;
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      if (sortField === 'dueDate') {
        const da = a.dueDate ? new Date(a.dueDate) : new Date('9999');
        const db = b.dueDate ? new Date(b.dueDate) : new Date('9999');
        return (da - db) * dir;
      }
      if (sortField === 'priority') {
        const p = { high: 0, medium: 1, low: 2 };
        return (p[a.priority] - p[b.priority]) * dir;
      }
      if (sortField === 'title') {
        return a.title.localeCompare(b.title) * dir;
      }
      return (new Date(b.createdAt) - new Date(a.createdAt)) * dir;
    });

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const total = todos.length;
    const start = (page - 1) * limit;
    const paginated = todos.slice(start, start + limit);

    res.json({
      success: true,
      data: paginated,
      meta: { total, page, limit, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/todos/export?format=csv|json
router.get('/export', (req, res) => {
  try {
    const todos = readTodos();
    const format = (req.query.format || 'json').toLowerCase();

    if (format === 'csv') {
      const headers = ['id','title','description','completed','priority','category','dueDate','tags','repeat','createdAt','completedAt'];
      const rows = todos.map(t =>
        headers.map(h => {
          const v = t[h];
          if (Array.isArray(v)) return `"${v.join(';')}"`;
          if (typeof v === 'string' && v.includes(',')) return `"${v}"`;
          return v ?? '';
        }).join(',')
      );
      const csv = [headers.join(','), ...rows].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="todos.csv"');
      return res.send(csv);
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="todos.json"');
    return res.json({ success: true, exportedAt: new Date().toISOString(), count: todos.length, data: todos });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/todos/activity
router.get('/activity', (req, res) => {
  try {
    res.json({ success: true, data: readActivity() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/todos/reorder — persist drag-and-drop order
router.post('/reorder', (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ success: false, error: 'ids must be an array' });

    const todos = readTodos();
    const orderMap = {};
    ids.forEach((id, i) => { orderMap[id] = i; });

    const updated = todos.map(t => ({
      ...t,
      order: orderMap[t.id] !== undefined ? orderMap[t.id] : (t.order ?? 9999),
    }));
    writeTodos(updated);
    res.json({ success: true, message: 'Order saved' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/todos/:id
router.get('/:id', (req, res) => {
  try {
    const todo = readTodos().find(t => t.id === req.params.id);
    if (!todo) return res.status(404).json({ success: false, error: 'Todo not found' });
    res.json({ success: true, data: todo });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/todos
router.post('/', (req, res) => {
  try {
    const { title, description, priority, dueDate, tags, category, subtasks, notes, pinned, repeat } = req.body;
    if (!title?.trim()) return res.status(400).json({ success: false, error: 'Title is required' });

    const todos = readTodos();
    const todo = {
      id: uuidv4(),
      title: title.trim(),
      description: description?.trim() || '',
      completed: false,
      priority: ['high', 'medium', 'low'].includes(priority) ? priority : 'medium',
      dueDate: dueDate || null,
      tags: Array.isArray(tags) ? tags.map(t => t.trim()).filter(Boolean) : [],
      category: category?.trim() || 'General',
      pinned: Boolean(pinned),
      repeat: ['daily', 'weekly', 'monthly'].includes(repeat) ? repeat : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
      subtasks: Array.isArray(subtasks) ? subtasks : [],
      notes: notes || '',
      timeEstimate: req.body.timeEstimate || null,
      timeSpent: 0,
      order: 0, // new todos go to top; reorder endpoint will fix positions
    };

    // Prepend & fix order indices
    todos.unshift(todo);
    todos.forEach((t, i) => { t.order = i; });
    writeTodos(todos);
    logActivity('created', todo);

    res.status(201).json({ success: true, data: todo });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/todos/:id
router.put('/:id', (req, res) => {
  try {
    const todos = readTodos();
    const idx = todos.findIndex(t => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Todo not found' });

    const existing = todos[idx];
    const { title, description, priority, dueDate, tags, category, completed, subtasks, notes, pinned, timeEstimate, timeSpent, repeat } = req.body;
    if (title !== undefined && !title?.trim()) return res.status(400).json({ success: false, error: 'Title cannot be empty' });

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
      pinned: pinned !== undefined ? Boolean(pinned) : existing.pinned,
      repeat: repeat !== undefined ? ((['daily','weekly','monthly'].includes(repeat) ? repeat : null)) : existing.repeat,
      timeEstimate: timeEstimate !== undefined ? timeEstimate : existing.timeEstimate,
      timeSpent: timeSpent !== undefined ? timeSpent : existing.timeSpent,
      updatedAt: new Date().toISOString(),
      completedAt: !wasCompleted && nowCompleted ? new Date().toISOString() : existing.completedAt,
    };

    // Auto-create next occurrence for recurring tasks
    if (!wasCompleted && nowCompleted && todos[idx].repeat) {
      const next = {
        ...todos[idx],
        id: uuidv4(),
        completed: false,
        completedAt: null,
        dueDate: nextDueDate(todos[idx].dueDate, todos[idx].repeat),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        order: -1,
      };
      todos.unshift(next);
      todos.forEach((t, i) => { t.order = i; });
      logActivity('created', next);
    }

    writeTodos(todos);
    if (!wasCompleted && nowCompleted) logActivity('completed', todos[idx]);
    else logActivity('updated', todos[idx]);

    res.json({ success: true, data: todos[idx] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/todos/:id
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

    // Auto-create next occurrence for recurring tasks
    if (!wasCompleted && nowCompleted && todos[idx].repeat) {
      const next = {
        ...todos[idx],
        id: uuidv4(),
        completed: false,
        completedAt: null,
        dueDate: nextDueDate(todos[idx].dueDate, todos[idx].repeat),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        order: -1,
      };
      todos.unshift(next);
      todos.forEach((t, i) => { t.order = i; });
      logActivity('created', next);
    }

    writeTodos(todos);
    if (!wasCompleted && nowCompleted) logActivity('completed', todos[idx]);

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
    const [deleted] = todos.splice(idx, 1);
    writeTodos(todos);
    logActivity('deleted', deleted);
    res.json({ success: true, message: 'Todo deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/todos — bulk
router.delete('/', (req, res) => {
  try {
    const { ids } = req.body;
    let todos = readTodos();
    if (Array.isArray(ids)) {
      todos = todos.filter(t => !ids.includes(t.id));
    } else {
      todos = todos.filter(t => !t.completed);
    }
    writeTodos(todos);
    res.json({ success: true, message: 'Todos deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
