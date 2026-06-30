const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query, pool } = require('../db');

const router = express.Router();

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
router.get('/', async (req, res) => {
  try {
    // Automatically prune soft-deleted todos older than 30 days
    await query("DELETE FROM todos WHERE \"deletedAt\" < NOW() - INTERVAL '30 days'");

    let queryText = 'SELECT * FROM todos WHERE 1=1';
    let params = [];
    const { status, priority, search, sortBy, order, category, tag } = req.query;

    if (status === 'deleted') {
      queryText += ' AND "deletedAt" IS NOT NULL';
    } else if (status === 'archived') {
      queryText += ' AND archived = true AND "deletedAt" IS NULL';
    } else {
      queryText += ' AND archived = false AND "deletedAt" IS NULL';
      
      if (status === 'active') {
        queryText += ' AND completed = false';
      } else if (status === 'completed') {
        queryText += ' AND completed = true';
      }
    }

    if (priority && priority !== 'all') {
      params.push(priority);
      queryText += ` AND priority = $${params.length}`;
    }

    if (category && category !== 'all') {
      params.push(category);
      queryText += ` AND category = $${params.length}`;
    }

    if (tag) {
      params.push(tag);
      queryText += ` AND EXISTS (SELECT 1 FROM unnest(tags) AS tg WHERE LOWER(tg) = LOWER($${params.length}))`;
    }

    if (req.query.dueDate && req.query.dueDate !== 'all') {
      if (req.query.dueDate === 'overdue') {
        queryText += ' AND "dueDate" < CURRENT_DATE';
      } else if (req.query.dueDate === 'today') {
        queryText += ' AND "dueDate" >= CURRENT_DATE AND "dueDate" < CURRENT_DATE + INTERVAL \'1 day\'';
      } else if (req.query.dueDate === 'upcoming') {
        queryText += ' AND "dueDate" >= CURRENT_DATE + INTERVAL \'1 day\'';
      }
    }

    if (search) {
      params.push(`%${search}%`);
      const searchIdx = params.length;
      queryText += ` AND (title ILIKE $${searchIdx} OR description ILIKE $${searchIdx} OR category ILIKE $${searchIdx} OR EXISTS (SELECT 1 FROM unnest(tags) AS tg WHERE LOWER(tg) LIKE LOWER($${searchIdx})))`;
    }

    const sortField = sortBy || 'order';
    const dir = order === 'asc' ? 'ASC' : 'DESC';

    if (sortField === 'order') {
      queryText += ` ORDER BY "order" ASC, "createdAt" DESC`;
    } else if (sortField === 'dueDate') {
      queryText += ` ORDER BY "dueDate" ${dir} NULLS LAST`;
    } else if (sortField === 'priority') {
      queryText += ` ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END ${dir}`;
    } else if (sortField === 'title') {
      queryText += ` ORDER BY title ${dir}`;
    } else {
      queryText += ` ORDER BY "createdAt" ${dir}`;
    }

    // Get overall count for pagination
    const countQueryText = `SELECT COUNT(*) FROM (${queryText}) AS temp`;
    const countRes = await query(countQueryText, params);
    const total = parseInt(countRes.rows[0].count);

    // Apply pagination limit and offset
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    params.push(limit);
    queryText += ` LIMIT $${params.length}`;
    params.push(offset);
    queryText += ` OFFSET $${params.length}`;

    const result = await query(queryText, params);

    res.json({
      success: true,
      data: result.rows,
      meta: { total, page, limit, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/todos/reorder — persist drag-and-drop order
router.post('/reorder', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ success: false, error: 'ids must be an array' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < ids.length; i++) {
        await client.query('UPDATE todos SET "order" = $1 WHERE id = $2', [i, ids[i]]);
      }
      await client.query('COMMIT');
      res.json({ success: true, message: 'Order saved' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/todos/stats
router.get('/stats', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE completed = false AND archived = false AND "deletedAt" IS NULL) as active,
        COUNT(*) FILTER (WHERE completed = true AND archived = false AND "deletedAt" IS NULL) as completed,
        COUNT(*) FILTER (WHERE archived = true AND "deletedAt" IS NULL) as archived,
        COUNT(*) FILTER (WHERE "deletedAt" IS NOT NULL) as deleted
      FROM todos
    `);
    const stats = result.rows[0];
    const activeCount = parseInt(stats.active || 0);
    const completedCount = parseInt(stats.completed || 0);

    res.json({
      success: true,
      data: {
        total: activeCount + completedCount,
        active: activeCount,
        completed: completedCount,
        archived: parseInt(stats.archived || 0),
        deleted: parseInt(stats.deleted || 0)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/todos/trash — permanently delete all soft-deleted todos
router.delete('/trash', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const deletedRes = await client.query('SELECT * FROM todos WHERE "deletedAt" IS NOT NULL');
      for (const todo of deletedRes.rows) {
        await client.query('DELETE FROM todos WHERE id = $1', [todo.id]);
        await client.query(
          'INSERT INTO activity (id, action, "todoId", "todoTitle", timestamp) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)',
          [uuidv4(), 'permanently_deleted', todo.id, todo.title]
        );
      }

      await client.query('COMMIT');
      res.json({ success: true, message: 'Trash emptied', data: { count: deletedRes.rows.length } });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/todos/activity
router.get('/activity', async (req, res) => {
  try {
    const activities = (await query('SELECT * FROM activity ORDER BY timestamp DESC LIMIT 100')).rows;
    res.json({ success: true, data: activities });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/todos/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM todos WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Todo not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/todos
router.post('/', async (req, res) => {
  try {
    const { title, description, priority, dueDate, tags, category, subtasks, notes, pinned, repeat } = req.body;
    if (!title?.trim()) return res.status(400).json({ success: false, error: 'Title is required' });

    const reqStatus = req.body.kanbanStatus;
    const isCompleted = req.body.completed === true || reqStatus === 'completed';
    const finalKanbanStatus = ['todo', 'in_progress', 'review', 'completed'].includes(reqStatus)
      ? reqStatus
      : (isCompleted ? 'completed' : 'todo');

    const id = uuidv4();
    const dbTags = Array.isArray(tags) ? tags.map(t => t.trim()).filter(Boolean) : [];
    const dbSubtasks = Array.isArray(subtasks) ? JSON.stringify(subtasks) : JSON.stringify([]);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Shift orders
      await client.query('UPDATE todos SET "order" = "order" + 1');

      const insertQuery = `
        INSERT INTO todos (
          id, title, description, completed, "kanbanStatus", priority, "dueDate", tags, category, pinned, repeat, "completedAt", subtasks, notes, "timeEstimate", "timeSpent", "order"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 0)
        RETURNING *
      `;
      const values = [
        id,
        title.trim(),
        description?.trim() || '',
        isCompleted,
        finalKanbanStatus,
        ['high', 'medium', 'low'].includes(priority) ? priority : 'medium',
        dueDate || null,
        dbTags,
        category?.trim() || 'General',
        Boolean(pinned),
        ['daily', 'weekly', 'monthly'].includes(repeat) ? repeat : null,
        isCompleted ? new Date().toISOString() : null,
        dbSubtasks,
        notes || '',
        req.body.timeEstimate || null,
        0
      ];

      const newTodoRes = await client.query(insertQuery, values);
      const todo = newTodoRes.rows[0];

      // Log Activity
      await client.query(
        'INSERT INTO activity (id, action, "todoId", "todoTitle", timestamp) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)',
        [uuidv4(), 'created', todo.id, todo.title]
      );

      await client.query('COMMIT');
      res.status(201).json({ success: true, data: todo });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/todos/:id
router.put('/:id', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existingRes = await client.query('SELECT * FROM todos WHERE id = $1', [req.params.id]);
      if (existingRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, error: 'Todo not found' });
      }
      const existing = existingRes.rows[0];

      const body = req.body;
      const title = body.title !== undefined ? body.title : existing.title;
      if (title !== undefined && !title?.trim()) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, error: 'Title cannot be empty' });
      }

      const description = body.description !== undefined ? body.description : existing.description;
      const priority = body.priority !== undefined ? body.priority : existing.priority;
      const dueDate = body.dueDate !== undefined ? body.dueDate : existing.dueDate;
      const tags = body.tags !== undefined ? body.tags : existing.tags;
      const category = body.category !== undefined ? body.category : existing.category;
      const subtasks = body.subtasks !== undefined ? body.subtasks : existing.subtasks;
      const notes = body.notes !== undefined ? body.notes : existing.notes;
      const pinned = body.pinned !== undefined ? Boolean(body.pinned) : existing.pinned;
      const repeat = body.repeat !== undefined ? (['daily', 'weekly', 'monthly'].includes(body.repeat) ? body.repeat : null) : existing.repeat;
      const timeEstimate = body.timeEstimate !== undefined ? body.timeEstimate : existing.timeEstimate;
      const timeSpent = body.timeSpent !== undefined ? body.timeSpent : existing.timeSpent;
      const archived = body.archived !== undefined ? Boolean(body.archived) : existing.archived;
      const deletedAt = body.deletedAt !== undefined ? body.deletedAt : existing.deletedAt;
      const kanbanStatusReq = body.kanbanStatus;
      const completedReq = body.completed;

      const wasCompleted = existing.completed;
      let nowCompleted = existing.completed;
      let finalKanbanStatus = existing.kanbanStatus || (existing.completed ? 'completed' : 'todo');

      if (kanbanStatusReq !== undefined) {
        finalKanbanStatus = kanbanStatusReq;
        nowCompleted = kanbanStatusReq === 'completed';
      } else if (completedReq !== undefined) {
        nowCompleted = Boolean(completedReq);
        if (nowCompleted) {
          finalKanbanStatus = 'completed';
        } else if (finalKanbanStatus === 'completed') {
          finalKanbanStatus = 'todo';
        }
      }

      const completedAt = !wasCompleted && nowCompleted ? new Date().toISOString() : (nowCompleted ? existing.completedAt : null);

      const updateQuery = `
        UPDATE todos SET
          title = $1, description = $2, priority = $3, "dueDate" = $4, tags = $5, category = $6,
          completed = $7, "kanbanStatus" = $8, subtasks = $9, notes = $10, pinned = $11, repeat = $12,
          "timeEstimate" = $13, "timeSpent" = $14, archived = $15, "deletedAt" = $16,
          "updatedAt" = CURRENT_TIMESTAMP, "completedAt" = $17
        WHERE id = $18
        RETURNING *
      `;
      
      const updatedRes = await client.query(updateQuery, [
        title.trim(),
        description?.trim() || '',
        priority,
        dueDate,
        tags,
        category,
        nowCompleted,
        finalKanbanStatus,
        JSON.stringify(subtasks),
        notes,
        pinned,
        repeat,
        timeEstimate,
        timeSpent,
        archived,
        deletedAt,
        completedAt,
        req.params.id
      ]);
      const updatedTodo = updatedRes.rows[0];

      // Auto-create next occurrence for recurring tasks
      if (!wasCompleted && nowCompleted && updatedTodo.repeat) {
        const nextId = uuidv4();
        const nextDueDateVal = nextDueDate(updatedTodo.dueDate, updatedTodo.repeat);
        const nextSubtasks = updatedTodo.subtasks ? updatedTodo.subtasks.map(st => ({ ...st, done: false })) : [];

        await client.query('UPDATE todos SET "order" = "order" + 1');

        const insertQuery = `
          INSERT INTO todos (
            id, title, description, completed, "kanbanStatus", priority, "dueDate", tags, category, pinned, repeat, "completedAt", subtasks, notes, "timeEstimate", "timeSpent", "order"
          ) VALUES ($1, $2, $3, false, 'todo', $4, $5, $6, $7, $8, $9, null, $10, $11, $12, 0, 0)
          RETURNING *
        `;
        const nextRes = await client.query(insertQuery, [
          nextId,
          updatedTodo.title,
          updatedTodo.description,
          updatedTodo.priority,
          nextDueDateVal,
          updatedTodo.tags,
          updatedTodo.category,
          updatedTodo.pinned,
          updatedTodo.repeat,
          JSON.stringify(nextSubtasks),
          updatedTodo.notes,
          updatedTodo.timeEstimate
        ]);

        await client.query(
          'INSERT INTO activity (id, action, "todoId", "todoTitle", timestamp) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)',
          [uuidv4(), 'created', nextRes.rows[0].id, nextRes.rows[0].title]
        );
      }

      const action = (!wasCompleted && nowCompleted) ? 'completed' : 'updated';
      await client.query(
        'INSERT INTO activity (id, action, "todoId", "todoTitle", timestamp) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)',
        [uuidv4(), action, updatedTodo.id, updatedTodo.title]
      );

      await client.query('COMMIT');
      res.json({ success: true, data: updatedTodo });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/todos/bulk
router.patch('/bulk', async (req, res) => {
  try {
    const { action, ids, value } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ success: false, error: 'ids array required' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const id of ids) {
        if (action === 'archive') {
          await client.query('UPDATE todos SET archived = true WHERE id = $1', [id]);
        } else if (action === 'unarchive') {
          await client.query('UPDATE todos SET archived = false WHERE id = $1', [id]);
        } else if (action === 'restore') {
          await client.query('UPDATE todos SET "deletedAt" = null WHERE id = $1', [id]);
        } else if (action === 'complete') {
          const todoRes = await client.query('SELECT * FROM todos WHERE id = $1', [id]);
          if (todoRes.rows.length > 0) {
            const t = todoRes.rows[0];
            if (!t.completed) {
              await client.query('UPDATE todos SET completed = true, "completedAt" = CURRENT_TIMESTAMP, "kanbanStatus" = \'completed\' WHERE id = $1', [id]);
              if (t.repeat) {
                const nextId = uuidv4();
                const nextDueDateVal = nextDueDate(t.dueDate, t.repeat);
                const nextSubtasks = t.subtasks ? t.subtasks.map(st => ({ ...st, done: false })) : [];
                
                await client.query('UPDATE todos SET "order" = "order" + 1');
                await client.query(`
                  INSERT INTO todos (
                    id, title, description, completed, "kanbanStatus", priority, "dueDate", tags, category, pinned, repeat, "completedAt", subtasks, notes, "timeEstimate", "timeSpent", "order"
                  ) VALUES ($1, $2, $3, false, 'todo', $4, $5, $6, $7, $8, $9, null, $10, $11, $12, 0, 0)
                `, [
                  nextId, t.title, t.description, t.priority, nextDueDateVal, t.tags, t.category, t.pinned, t.repeat, JSON.stringify(nextSubtasks), t.notes, t.timeEstimate
                ]);
                await client.query('INSERT INTO activity (id, action, "todoId", "todoTitle", timestamp) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)', [
                  uuidv4(), 'created', nextId, t.title
                ]);
              }
            }
          }
        } else if (action === 'uncomplete') {
          await client.query('UPDATE todos SET completed = false, "completedAt" = null, "kanbanStatus" = \'todo\' WHERE id = $1', [id]);
        } else if (action === 'priority') {
          await client.query('UPDATE todos SET priority = $1 WHERE id = $2', [value, id]);
        } else if (action === 'delete') {
          const todoRes = await client.query('SELECT * FROM todos WHERE id = $1', [id]);
          if (todoRes.rows.length > 0) {
            const todo = todoRes.rows[0];
            if (!todo.deletedAt) {
              await client.query('UPDATE todos SET "deletedAt" = CURRENT_TIMESTAMP WHERE id = $1', [id]);
              await client.query(
                'INSERT INTO activity (id, action, "todoId", "todoTitle", timestamp) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)',
                [uuidv4(), 'deleted', todo.id, todo.title]
              );
            } else {
              await client.query('DELETE FROM todos WHERE id = $1', [id]);
              await client.query(
                'INSERT INTO activity (id, action, "todoId", "todoTitle", timestamp) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)',
                [uuidv4(), 'permanently_deleted', todo.id, todo.title]
              );
            }
          }
        }
      }

      await client.query('COMMIT');
      res.json({ success: true, message: `Bulk ${action} applied` });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/todos/:id
router.patch('/:id', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existingRes = await client.query('SELECT * FROM todos WHERE id = $1', [req.params.id]);
      if (existingRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, error: 'Todo not found' });
      }
      const existing = existingRes.rows[0];

      const patch = req.body;
      const wasCompleted = existing.completed;

      let nowCompleted = existing.completed;
      let finalKanbanStatus = existing.kanbanStatus || (existing.completed ? 'completed' : 'todo');

      if (patch.kanbanStatus !== undefined) {
        finalKanbanStatus = patch.kanbanStatus;
        nowCompleted = patch.kanbanStatus === 'completed';
        patch.completed = nowCompleted;
      } else if (patch.completed !== undefined) {
        nowCompleted = Boolean(patch.completed);
        if (nowCompleted) {
          finalKanbanStatus = 'completed';
        } else if (finalKanbanStatus === 'completed') {
          finalKanbanStatus = 'todo';
        }
        patch.kanbanStatus = finalKanbanStatus;
      }

      const completedAt = !wasCompleted && nowCompleted ? new Date().toISOString() : (nowCompleted ? existing.completedAt : null);

      // Build dynamic patch query (exclude fields handled explicitly below)
      const reserved = new Set(['id', 'completed', 'kanbanStatus', 'completedAt']);
      const keys = Object.keys(patch).filter(k => !reserved.has(k));
      const setClauses = [];
      const values = [];
      
      keys.forEach((key) => {
        let val = patch[key];
        if (key === 'subtasks' && Array.isArray(val)) {
          val = JSON.stringify(val);
        }
        values.push(val);
        setClauses.push(`"${key}" = $${values.length}`);
      });

      values.push(nowCompleted);
      setClauses.push(`completed = $${values.length}`);
      
      values.push(finalKanbanStatus);
      setClauses.push(`"kanbanStatus" = $${values.length}`);

      values.push(completedAt);
      setClauses.push(`"completedAt" = $${values.length}`);

      setClauses.push(`"updatedAt" = CURRENT_TIMESTAMP`);

      values.push(req.params.id);
      const updateQuery = `
        UPDATE todos SET ${setClauses.join(', ')}
        WHERE id = $${values.length}
        RETURNING *
      `;

      const updatedRes = await client.query(updateQuery, values);
      const updatedTodo = updatedRes.rows[0];

      // Auto-create next occurrence for recurring tasks
      if (!wasCompleted && nowCompleted && updatedTodo.repeat) {
        const nextId = uuidv4();
        const nextDueDateVal = nextDueDate(updatedTodo.dueDate, updatedTodo.repeat);
        const nextSubtasks = updatedTodo.subtasks ? updatedTodo.subtasks.map(st => ({ ...st, done: false })) : [];

        await client.query('UPDATE todos SET "order" = "order" + 1');

        const insertQuery = `
          INSERT INTO todos (
            id, title, description, completed, "kanbanStatus", priority, "dueDate", tags, category, pinned, repeat, "completedAt", subtasks, notes, "timeEstimate", "timeSpent", "order"
          ) VALUES ($1, $2, $3, false, 'todo', $4, $5, $6, $7, $8, $9, null, $10, $11, $12, 0, 0)
          RETURNING *
        `;
        const nextRes = await client.query(insertQuery, [
          nextId,
          updatedTodo.title,
          updatedTodo.description,
          updatedTodo.priority,
          nextDueDateVal,
          updatedTodo.tags,
          updatedTodo.category,
          updatedTodo.pinned,
          updatedTodo.repeat,
          JSON.stringify(nextSubtasks),
          updatedTodo.notes,
          updatedTodo.timeEstimate
        ]);

        await client.query(
          'INSERT INTO activity (id, action, "todoId", "todoTitle", timestamp) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)',
          [uuidv4(), 'created', nextRes.rows[0].id, nextRes.rows[0].title]
        );
      }

      if (!wasCompleted && nowCompleted) {
        await client.query(
          'INSERT INTO activity (id, action, "todoId", "todoTitle", timestamp) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)',
          [uuidv4(), 'completed', updatedTodo.id, updatedTodo.title]
        );
      }

      await client.query('COMMIT');
      res.json({ success: true, data: updatedTodo });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/todos/trash — permanently delete soft-deleted todos
router.delete('/trash', async (req, res) => {
  try {
    await query('DELETE FROM todos WHERE "deletedAt" IS NOT NULL');
    res.json({ success: true, message: 'Trash emptied' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/todos/:id
router.delete('/:id', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const todoRes = await client.query('SELECT * FROM todos WHERE id = $1', [req.params.id]);
      if (todoRes.rows.length === 0) {
        await client.query('COMMIT');
        return res.json({ success: true, message: 'Todo already deleted' });
      }
      const todo = todoRes.rows[0];

      if (!todo.deletedAt) {
        // Soft delete
        await client.query('UPDATE todos SET "deletedAt" = CURRENT_TIMESTAMP WHERE id = $1', [req.params.id]);
        await client.query(
          'INSERT INTO activity (id, action, "todoId", "todoTitle", timestamp) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)',
          [uuidv4(), 'deleted', todo.id, todo.title]
        );
      } else {
        // Hard delete
        await client.query('DELETE FROM todos WHERE id = $1', [req.params.id]);
        await client.query(
          'INSERT INTO activity (id, action, "todoId", "todoTitle", timestamp) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)',
          [uuidv4(), 'permanently_deleted', todo.id, todo.title]
        );
      }

      await client.query('COMMIT');
      res.json({ success: true, message: 'Todo deleted' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/todos — bulk
router.delete('/', async (req, res) => {
  try {
    const { ids } = req.body;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      if (Array.isArray(ids)) {
        for (const id of ids) {
          const todoRes = await client.query('SELECT * FROM todos WHERE id = $1', [id]);
          if (todoRes.rows.length > 0) {
            const todo = todoRes.rows[0];
            if (!todo.deletedAt) {
              await client.query('UPDATE todos SET "deletedAt" = CURRENT_TIMESTAMP WHERE id = $1', [id]);
              await client.query(
                'INSERT INTO activity (id, action, "todoId", "todoTitle", timestamp) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)',
                [uuidv4(), 'deleted', todo.id, todo.title]
              );
            } else {
              await client.query('DELETE FROM todos WHERE id = $1', [id]);
              await client.query(
                'INSERT INTO activity (id, action, "todoId", "todoTitle", timestamp) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)',
                [uuidv4(), 'permanently_deleted', todo.id, todo.title]
              );
            }
          }
        }
      } else {
        // Clear completed (soft delete completed todos)
        const completedRes = await client.query('SELECT * FROM todos WHERE completed = true AND "deletedAt" IS NULL');
        for (const todo of completedRes.rows) {
          await client.query('UPDATE todos SET "deletedAt" = CURRENT_TIMESTAMP WHERE id = $1', [todo.id]);
          await client.query(
            'INSERT INTO activity (id, action, "todoId", "todoTitle", timestamp) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)',
            [uuidv4(), 'deleted', todo.id, todo.title]
          );
        }
      }

      await client.query('COMMIT');
      res.json({ success: true, message: 'Todos deleted' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
