const express = require('express');
const { readTodos } = require('../store');

const router = express.Router();

// GET /api/stats — dashboard stats
router.get('/', (req, res) => {
  try {
    const todos = readTodos();
    const now = new Date();
    const today = new Date(now); today.setHours(0, 0, 0, 0);

    const total = todos.length;
    const completed = todos.filter(t => t.completed).length;
    const active = total - completed;
    const overdue = todos.filter(t =>
      !t.completed && t.dueDate && new Date(t.dueDate) < today
    ).length;
    const dueToday = todos.filter(t => {
      if (!t.dueDate || t.completed) return false;
      const d = new Date(t.dueDate); d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    }).length;

    const byPriority = { high: 0, medium: 0, low: 0 };
    const byCategory = {};
    todos.forEach(t => {
      if (byPriority[t.priority] !== undefined) byPriority[t.priority]++;
      const cat = t.category || 'General';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    });

    // Completion rate over last 7 days
    const weekAgo = new Date(now - 7 * 86400000);
    const completedThisWeek = todos.filter(t =>
      t.completedAt && new Date(t.completedAt) >= weekAgo
    ).length;

    // Subtask progress
    const totalSubtasks = todos.reduce((acc, t) => acc + (t.subtasks?.length || 0), 0);
    const doneSubtasks = todos.reduce((acc, t) => acc + (t.subtasks?.filter(s => s.done).length || 0), 0);

    res.json({
      success: true,
      data: {
        total, completed, active, overdue, dueToday,
        completionRate: total ? Math.round((completed / total) * 100) : 0,
        completedThisWeek,
        byPriority,
        byCategory,
        subtasks: { total: totalSubtasks, done: doneSubtasks },
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
