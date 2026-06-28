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

    if (status === 'deleted') {
      todos = todos.filter(t => !!t.deletedAt);
    } else if (status === 'archived') {
      todos = todos.filter(t => t.archived && !t.deletedAt);
    } else {
      // For all non-deleted/non-archived views, filter out deleted and archived
      todos = todos.filter(t => !t.deletedAt && !t.archived);
      
      if (status === 'active') {
        todos = todos.filter(t => !t.completed);
      } else if (status === 'completed') {
        todos = todos.filter(t => t.completed);
      }
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
    if (req.query.dueDate && req.query.dueDate !== 'all') {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
      
      todos = todos.filter(t => {
        if (!t.dueDate) return false;
        const d = new Date(t.dueDate);
        if (req.query.dueDate === 'overdue') return d < today;
        if (req.query.dueDate === 'today') return d >= today && d < tomorrow;
        if (req.query.dueDate === 'upcoming') return d >= tomorrow;
        return true;
      });
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
      return (new Date(a.createdAt) - new Date(b.createdAt)) * dir;
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
      archived: false,
      deletedAt: null,
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
    const { title, description, priority, dueDate, tags, category, completed, subtasks, notes, pinned, timeEstimate, timeSpent, repeat, archived, deletedAt } = req.body;
    if (title !== undefined && !title?.trim()) return res.status(400).json({ success: false, error: 'Title cannot be empty' });

    const wasCompleted = existing.completed;
    const nowCompleted = completed !== undefined ? Boolean(completed) : existing.completed;

    const updatedTodo = {
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
      archived: archived !== undefined ? Boolean(archived) : existing.archived,
      deletedAt: deletedAt !== undefined ? deletedAt : existing.deletedAt,
      updatedAt: new Date().toISOString(),
      completedAt: !wasCompleted && nowCompleted ? new Date().toISOString() : existing.completedAt,
    };
    todos[idx] = updatedTodo;

    // Auto-create next occurrence for recurring tasks
    if (!wasCompleted && nowCompleted && updatedTodo.repeat) {
      const next = {
        ...updatedTodo,
        id: uuidv4(),
        completed: false,
        completedAt: null,
        dueDate: nextDueDate(updatedTodo.dueDate, updatedTodo.repeat),
        subtasks: updatedTodo.subtasks ? updatedTodo.subtasks.map(st => ({ ...st, done: false })) : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        order: -1,
      };
      todos.unshift(next);
      todos.forEach((t, i) => { t.order = i; });
      logActivity('created', next);
    }

    writeTodos(todos);
    if (!wasCompleted && nowCompleted) logActivity('completed', updatedTodo);
    else logActivity('updated', updatedTodo);

    res.json({ success: true, data: updatedTodo });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/todos/bulk
router.patch('/bulk', (req, res) => {
  try {
    const { action, ids, value } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ success: false, error: 'ids array required' });
    
    let todos = readTodos();
    let newTodos = [];
    todos = todos.map(t => {
      if (!ids.includes(t.id)) return t;
      
      switch (action) {
        case 'archive': return { ...t, archived: true };
        case 'unarchive': return { ...t, archived: false };
        case 'restore': return { ...t, deletedAt: null };
        case 'complete': 
          if (!t.completed && t.repeat) {
            newTodos.push({
              ...t,
              id: uuidv4(),
              completed: false,
              completedAt: null,
              dueDate: nextDueDate(t.dueDate, t.repeat),
              subtasks: t.subtasks ? t.subtasks.map(st => ({ ...st, done: false })) : undefined,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              order: -1
            });
          }
          return { ...t, completed: true, completedAt: new Date().toISOString() };
        case 'uncomplete': return { ...t, completed: false, completedAt: null };
        case 'priority': return { ...t, priority: value };
        default: return t;
      }
    });
    
    if (newTodos.length > 0) {
      todos.unshift(...newTodos);
      todos.forEach((t, i) => { t.order = i; });
    }
    
    writeTodos(todos);
    res.json({ success: true, message: `Bulk ${action} applied` });
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

    const updatedTodo = {
      ...existing,
      ...patch,
      completed: nowCompleted,
      updatedAt: new Date().toISOString(),
      completedAt: !wasCompleted && nowCompleted ? new Date().toISOString() : existing.completedAt,
    };
    todos[idx] = updatedTodo;

    // Auto-create next occurrence for recurring tasks
    if (!wasCompleted && nowCompleted && updatedTodo.repeat) {
      const next = {
        ...updatedTodo,
        id: uuidv4(),
        completed: false,
        completedAt: null,
        dueDate: nextDueDate(updatedTodo.dueDate, updatedTodo.repeat),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        order: -1,
      };
      todos.unshift(next);
      todos.forEach((t, i) => { t.order = i; });
      logActivity('created', next);
    }

    writeTodos(todos);
    if (!wasCompleted && nowCompleted) logActivity('completed', updatedTodo);

    res.json({ success: true, data: updatedTodo });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/todos/:id
router.delete('/:id', (req, res) => {
  try {
    const todos = readTodos();
    const idx = todos.findIndex(t => t.id === req.params.id);
    if (idx === -1) return res.json({ success: true, message: 'Todo already deleted' });
    
    if (!todos[idx].deletedAt) {
      // Soft delete
      todos[idx].deletedAt = new Date().toISOString();
      logActivity('deleted', todos[idx]);
    } else {
      // Hard delete
      const [deleted] = todos.splice(idx, 1);
      logActivity('permanently_deleted', deleted);
    }
    writeTodos(todos);
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
      todos = todos.map(t => {
        if (ids.includes(t.id)) {
          if (!t.deletedAt) return { ...t, deletedAt: new Date().toISOString() };
          return null; // mark for hard delete
        }
        return t;
      }).filter(Boolean); // removes the hard-deleted ones
    } else {
      // clear completed (soft delete)
      todos = todos.map(t => (t.completed && !t.deletedAt) ? { ...t, deletedAt: new Date().toISOString() } : t);
    }
    writeTodos(todos);
    res.json({ success: true, message: 'Todos deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


module.exports = router;
