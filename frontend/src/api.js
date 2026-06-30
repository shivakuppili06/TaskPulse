import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  writeBatch,
  query as firestoreQuery,
  orderBy as firestoreOrderBy,
  limit as firestoreLimit
} from 'firebase/firestore';

// Helper to generate UUID v4
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Compute the next due date for a recurring task
function nextDueDate(dueDate, repeat) {
  if (!dueDate || !repeat) return null;
  const d = new Date(dueDate);
  if (repeat === 'daily')   d.setDate(d.getDate() + 1);
  if (repeat === 'weekly')  d.setDate(d.getDate() + 7);
  if (repeat === 'monthly') d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

// Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Check if Firebase settings are supplied
const isFirebaseConfigured = !!firebaseConfig.projectId;

let db = null;
if (isFirebaseConfigured) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log('✓ Firebase Firestore initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase:', error);
  }
} else {
  console.warn('⚠️ VITE_FIREBASE_PROJECT_ID is not configured. Falling back to LocalStorage.');
}

// LocalStorage Fallback database helpers
const localDB = {
  getTodos: () => JSON.parse(localStorage.getItem('taskpulse_todos') || '[]'),
  setTodos: (todos) => localStorage.setItem('taskpulse_todos', JSON.stringify(todos)),
  getActivities: () => JSON.parse(localStorage.getItem('taskpulse_activities') || '[]'),
  setActivities: (acts) => localStorage.setItem('taskpulse_activities', JSON.stringify(acts)),
};

// Add activity log entry
async function logActivity(action, todoId, todoTitle) {
  const activity = {
    id: uuidv4(),
    action,
    todoId,
    todoTitle,
    timestamp: new Date().toISOString()
  };

  if (db) {
    try {
      await setDoc(doc(db, 'activity', activity.id), activity);
    } catch (e) {
      console.error('Firestore activity log failed:', e);
    }
  } else {
    const acts = localDB.getActivities();
    acts.unshift(activity);
    localDB.setActivities(acts.slice(0, 150)); // limit to 150 locally
  }
}

export const api = {
  getAll: async (params = {}) => {
    let todos = [];
    if (db) {
      const snap = await getDocs(collection(db, 'todos'));
      snap.forEach((doc) => {
        todos.push(doc.data());
      });
    } else {
      todos = localDB.getTodos();
    }

    // Filter out old soft-deleted todos (>30 days) on fetch
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const validTodos = todos.filter(todo => {
      if (todo.deletedAt && new Date(todo.deletedAt) < thirtyDaysAgo) {
        return false;
      }
      return true;
    });

    if (validTodos.length !== todos.length && !db) {
      localDB.setTodos(validTodos);
    }

    let filtered = [...validTodos];
    const { status, priority, search, sortBy, order, category, tag } = params;

    // Status filtering
    if (status === 'deleted') {
      filtered = filtered.filter(t => t.deletedAt);
    } else if (status === 'archived') {
      filtered = filtered.filter(t => t.archived && !t.deletedAt);
    } else {
      filtered = filtered.filter(t => !t.archived && !t.deletedAt);
      if (status === 'active') {
        filtered = filtered.filter(t => !t.completed);
      } else if (status === 'completed') {
        filtered = filtered.filter(t => t.completed);
      }
    }

    // Priority filter
    if (priority && priority !== 'all') {
      filtered = filtered.filter(t => t.priority === priority);
    }

    // Category filter
    if (category && category !== 'all') {
      filtered = filtered.filter(t => t.category === category);
    }

    // Tag filter
    if (tag) {
      filtered = filtered.filter(t => t.tags && t.tags.some(tg => tg.toLowerCase() === tag.toLowerCase()));
    }

    // Due Date filter
    if (params.dueDate && params.dueDate !== 'all') {
      const todayStr = new Date().toISOString().split('T')[0];
      filtered = filtered.filter(t => {
        if (!t.dueDate) return false;
        const dueStr = t.dueDate.split('T')[0];
        if (params.dueDate === 'overdue') {
          return dueStr < todayStr;
        } else if (params.dueDate === 'today') {
          return dueStr === todayStr;
        } else if (params.dueDate === 'upcoming') {
          return dueStr > todayStr;
        }
        return true;
      });
    }

    // Search filter
    if (search) {
      const term = search.toLowerCase();
      filtered = filtered.filter(t => 
        (t.title && t.title.toLowerCase().includes(term)) ||
        (t.description && t.description.toLowerCase().includes(term)) ||
        (t.category && t.category.toLowerCase().includes(term)) ||
        (t.tags && t.tags.some(tg => tg.toLowerCase().includes(term)))
      );
    }

    // Sort sorting
    const dir = order === 'asc' ? 1 : -1;
    const sortField = sortBy || 'order';

    filtered.sort((a, b) => {
      if (sortField === 'order') {
        const orderA = a.order !== undefined ? a.order : 0;
        const orderB = b.order !== undefined ? b.order : 0;
        if (orderA !== orderB) return orderA - orderB;
        return new Date(b.createdAt) - new Date(a.createdAt);
      } else if (sortField === 'dueDate') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return (new Date(a.dueDate) - new Date(b.dueDate)) * dir;
      } else if (sortField === 'priority') {
        const pMap = { high: 0, medium: 1, low: 2 };
        const pA = pMap[a.priority] !== undefined ? pMap[a.priority] : 1;
        const pB = pMap[b.priority] !== undefined ? pMap[b.priority] : 1;
        return (pA - pB) * dir;
      } else if (sortField === 'title') {
        return (a.title || '').localeCompare(b.title || '') * dir;
      } else {
        return (new Date(a.createdAt) - new Date(b.createdAt)) * dir;
      }
    });

    const page = parseInt(params.page) || 1;
    const limit = parseInt(params.limit) || 50;
    const offset = (page - 1) * limit;
    const total = filtered.length;
    const sliced = filtered.slice(offset, offset + limit);

    return {
      success: true,
      data: sliced,
      meta: { total, page, limit, pages: Math.ceil(total / limit) }
    };
  },

  getById: async (id) => {
    if (db) {
      const docRef = doc(db, 'todos', id);
      const snap = await getDoc(docRef);
      if (!snap.exists()) throw new Error('Todo not found');
      return { success: true, data: snap.data() };
    } else {
      const todos = localDB.getTodos();
      const todo = todos.find(t => t.id === id);
      if (!todo) throw new Error('Todo not found');
      return { success: true, data: todo };
    }
  },

  create: async (body) => {
    if (!body.title?.trim()) throw new Error('Title is required');

    const reqStatus = body.kanbanStatus;
    const isCompleted = body.completed === true || reqStatus === 'completed';
    const finalKanbanStatus = ['todo', 'in_progress', 'review', 'completed'].includes(reqStatus)
      ? reqStatus
      : (isCompleted ? 'completed' : 'todo');

    const id = uuidv4();
    const dbTags = Array.isArray(body.tags) ? body.tags.map(t => t.trim()).filter(Boolean) : [];
    
    const todo = {
      id,
      title: body.title.trim(),
      description: body.description?.trim() || '',
      completed: isCompleted,
      kanbanStatus: finalKanbanStatus,
      priority: ['high', 'medium', 'low'].includes(body.priority) ? body.priority : 'medium',
      dueDate: body.dueDate || null,
      tags: dbTags,
      category: body.category?.trim() || 'General',
      pinned: Boolean(body.pinned),
      repeat: ['daily', 'weekly', 'monthly'].includes(body.repeat) ? body.repeat : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: isCompleted ? new Date().toISOString() : null,
      subtasks: Array.isArray(body.subtasks) ? body.subtasks : [],
      notes: body.notes || '',
      timeEstimate: body.timeEstimate || null,
      timeSpent: 0,
      order: 0,
      archived: false,
      deletedAt: null
    };

    if (db) {
      // Shift orders and insert
      const snap = await getDocs(collection(db, 'todos'));
      const batch = writeBatch(db);
      snap.forEach((d) => {
        const item = d.data();
        if (!item.deletedAt) {
          batch.update(doc(db, 'todos', item.id), { order: (item.order || 0) + 1 });
        }
      });
      batch.set(doc(db, 'todos', id), todo);
      await batch.commit();
    } else {
      const todos = localDB.getTodos();
      todos.forEach(t => {
        if (!t.deletedAt) t.order = (t.order || 0) + 1;
      });
      todos.unshift(todo);
      localDB.setTodos(todos);
    }

    await logActivity('created', todo.id, todo.title);
    return { success: true, data: todo };
  },

  update: async (id, body) => {
    let existing = null;
    if (db) {
      const docRef = doc(db, 'todos', id);
      const snap = await getDoc(docRef);
      if (!snap.exists()) throw new Error('Todo not found');
      existing = snap.data();
    } else {
      const todos = localDB.getTodos();
      existing = todos.find(t => t.id === id);
      if (!existing) throw new Error('Todo not found');
    }

    const title = body.title !== undefined ? body.title : existing.title;
    if (title !== undefined && !title?.trim()) throw new Error('Title cannot be empty');

    const wasCompleted = existing.completed;
    const nowCompleted = body.completed !== undefined ? Boolean(body.completed) : (body.kanbanStatus === 'completed' ? true : existing.completed);
    
    let finalKanbanStatus = body.kanbanStatus || existing.kanbanStatus;
    if (body.completed !== undefined && body.completed !== wasCompleted) {
      if (body.completed) {
        finalKanbanStatus = 'completed';
      } else if (finalKanbanStatus === 'completed') {
        finalKanbanStatus = 'todo';
      }
    }

    const completedAt = !wasCompleted && nowCompleted ? new Date().toISOString() : (nowCompleted ? existing.completedAt : null);

    const updatedTodo = {
      ...existing,
      title: title.trim(),
      description: body.description !== undefined ? (body.description?.trim() || '') : existing.description,
      priority: body.priority !== undefined ? body.priority : existing.priority,
      dueDate: body.dueDate !== undefined ? body.dueDate : existing.dueDate,
      tags: body.tags !== undefined ? body.tags : existing.tags,
      category: body.category !== undefined ? body.category : existing.category,
      completed: nowCompleted,
      kanbanStatus: finalKanbanStatus,
      subtasks: body.subtasks !== undefined ? body.subtasks : existing.subtasks,
      notes: body.notes !== undefined ? body.notes : existing.notes,
      pinned: body.pinned !== undefined ? Boolean(body.pinned) : existing.pinned,
      repeat: body.repeat !== undefined ? body.repeat : existing.repeat,
      timeEstimate: body.timeEstimate !== undefined ? body.timeEstimate : existing.timeEstimate,
      timeSpent: body.timeSpent !== undefined ? body.timeSpent : existing.timeSpent,
      archived: body.archived !== undefined ? Boolean(body.archived) : existing.archived,
      deletedAt: body.deletedAt !== undefined ? body.deletedAt : existing.deletedAt,
      updatedAt: new Date().toISOString(),
      completedAt
    };

    if (db) {
      const batch = writeBatch(db);
      batch.update(doc(db, 'todos', id), updatedTodo);

      // Auto-create next occurrence for recurring tasks
      if (!wasCompleted && nowCompleted && updatedTodo.repeat) {
        const nextId = uuidv4();
        const nextDueDateVal = nextDueDate(updatedTodo.dueDate, updatedTodo.repeat);
        const nextSubtasks = updatedTodo.subtasks ? updatedTodo.subtasks.map(st => ({ ...st, done: false })) : [];

        // Shift orders
        const snap = await getDocs(collection(db, 'todos'));
        snap.forEach((d) => {
          const item = d.data();
          if (!item.deletedAt) {
            batch.update(doc(db, 'todos', item.id), { order: (item.order || 0) + 1 });
          }
        });

        const nextTodo = {
          ...updatedTodo,
          id: nextId,
          completed: false,
          kanbanStatus: 'todo',
          dueDate: nextDueDateVal,
          subtasks: nextSubtasks,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          completedAt: null,
          timeSpent: 0,
          order: 0
        };
        batch.set(doc(db, 'todos', nextId), nextTodo);
        await logActivity('created', nextId, nextTodo.title);
      }

      await batch.commit();
    } else {
      const todos = localDB.getTodos();
      const index = todos.findIndex(t => t.id === id);
      todos[index] = updatedTodo;

      if (!wasCompleted && nowCompleted && updatedTodo.repeat) {
        const nextId = uuidv4();
        const nextDueDateVal = nextDueDate(updatedTodo.dueDate, updatedTodo.repeat);
        const nextSubtasks = updatedTodo.subtasks ? updatedTodo.subtasks.map(st => ({ ...st, done: false })) : [];

        todos.forEach(t => {
          if (!t.deletedAt) t.order = (t.order || 0) + 1;
        });

        const nextTodo = {
          ...updatedTodo,
          id: nextId,
          completed: false,
          kanbanStatus: 'todo',
          dueDate: nextDueDateVal,
          subtasks: nextSubtasks,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          completedAt: null,
          timeSpent: 0,
          order: 0
        };
        todos.unshift(nextTodo);
        await logActivity('created', nextId, nextTodo.title);
      }
      localDB.setTodos(todos);
    }

    const action = (!wasCompleted && nowCompleted) ? 'completed' : 'updated';
    await logActivity(action, id, updatedTodo.title);

    return { success: true, data: updatedTodo };
  },

  patch: async (id, body) => {
    return api.update(id, body);
  },

  delete: async (id) => {
    if (db) {
      const docRef = doc(db, 'todos', id);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return { success: true, message: 'Todo already deleted' };
      const todo = snap.data();

      if (!todo.deletedAt) {
        await updateDoc(docRef, { deletedAt: new Date().toISOString() });
        await logActivity('deleted', todo.id, todo.title);
      } else {
        await deleteDoc(docRef);
        await logActivity('permanently_deleted', todo.id, todo.title);
      }
    } else {
      const todos = localDB.getTodos();
      const index = todos.findIndex(t => t.id === id);
      if (index === -1) return { success: true, message: 'Todo already deleted' };
      const todo = todos[index];

      if (!todo.deletedAt) {
        todo.deletedAt = new Date().toISOString();
        await logActivity('deleted', todo.id, todo.title);
      } else {
        todos.splice(index, 1);
        await logActivity('permanently_deleted', todo.id, todo.title);
      }
      localDB.setTodos(todos);
    }
    return { success: true, message: 'Todo deleted' };
  },

  deleteMany: async (ids) => {
    if (!Array.isArray(ids)) throw new Error('ids array required');
    if (db) {
      const batch = writeBatch(db);
      for (const id of ids) {
        const docRef = doc(db, 'todos', id);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const todo = snap.data();
          if (!todo.deletedAt) {
            batch.update(docRef, { deletedAt: new Date().toISOString() });
            await logActivity('deleted', todo.id, todo.title);
          } else {
            batch.delete(docRef);
            await logActivity('permanently_deleted', todo.id, todo.title);
          }
        }
      }
      await batch.commit();
    } else {
      const todos = localDB.getTodos();
      const updated = todos.filter(t => {
        if (ids.includes(t.id)) {
          if (!t.deletedAt) {
            t.deletedAt = new Date().toISOString();
            logActivity('deleted', t.id, t.title);
            return true;
          } else {
            logActivity('permanently_deleted', t.id, t.title);
            return false;
          }
        }
        return true;
      });
      localDB.setTodos(updated);
    }
    return { success: true, message: 'Todos deleted' };
  },

  bulkAction: async (action, ids, value) => {
    if (!Array.isArray(ids)) throw new Error('ids array required');
    if (db) {
      const batch = writeBatch(db);
      for (const id of ids) {
        const docRef = doc(db, 'todos', id);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const t = snap.data();
          if (action === 'archive') {
            batch.update(docRef, { archived: true });
          } else if (action === 'unarchive') {
            batch.update(docRef, { archived: false });
          } else if (action === 'restore') {
            batch.update(docRef, { deletedAt: null });
          } else if (action === 'complete') {
            if (!t.completed) {
              batch.update(docRef, { completed: true, completedAt: new Date().toISOString(), kanbanStatus: 'completed' });
              // Handle recurring
              if (t.repeat) {
                const nextId = uuidv4();
                const nextDueDateVal = nextDueDate(t.dueDate, t.repeat);
                const nextSubtasks = t.subtasks ? t.subtasks.map(st => ({ ...st, done: false })) : [];
                const nextTodo = {
                  ...t,
                  id: nextId,
                  completed: false,
                  kanbanStatus: 'todo',
                  dueDate: nextDueDateVal,
                  subtasks: nextSubtasks,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  completedAt: null,
                  timeSpent: 0,
                  order: 0
                };
                batch.set(doc(db, 'todos', nextId), nextTodo);
                await logActivity('created', nextId, nextTodo.title);
              }
            }
          } else if (action === 'uncomplete') {
            batch.update(docRef, { completed: false, completedAt: null, kanbanStatus: 'todo' });
          } else if (action === 'priority') {
            batch.update(docRef, { priority: value });
          } else if (action === 'delete') {
            if (!t.deletedAt) {
              batch.update(docRef, { deletedAt: new Date().toISOString() });
              await logActivity('deleted', t.id, t.title);
            } else {
              batch.delete(docRef);
              await logActivity('permanently_deleted', t.id, t.title);
            }
          }
        }
      }
      await batch.commit();
    } else {
      const todos = localDB.getTodos();
      let newTodos = [...todos];
      for (const id of ids) {
        const t = newTodos.find(item => item.id === id);
        if (t) {
          if (action === 'archive') {
            t.archived = true;
          } else if (action === 'unarchive') {
            t.archived = false;
          } else if (action === 'restore') {
            t.deletedAt = null;
          } else if (action === 'complete') {
            if (!t.completed) {
              t.completed = true;
              t.completedAt = new Date().toISOString();
              t.kanbanStatus = 'completed';
              if (t.repeat) {
                const nextId = uuidv4();
                const nextDueDateVal = nextDueDate(t.dueDate, t.repeat);
                const nextSubtasks = t.subtasks ? t.subtasks.map(st => ({ ...st, done: false })) : [];
                newTodos.forEach(item => {
                  if (!item.deletedAt) item.order = (item.order || 0) + 1;
                });
                const nextTodo = {
                  ...t,
                  id: nextId,
                  completed: false,
                  kanbanStatus: 'todo',
                  dueDate: nextDueDateVal,
                  subtasks: nextSubtasks,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  completedAt: null,
                  timeSpent: 0,
                  order: 0
                };
                newTodos.unshift(nextTodo);
                logActivity('created', nextId, nextTodo.title);
              }
            }
          } else if (action === 'uncomplete') {
            t.completed = false;
            t.completedAt = null;
            t.kanbanStatus = 'todo';
          } else if (action === 'priority') {
            t.priority = value;
          } else if (action === 'delete') {
            if (!t.deletedAt) {
              t.deletedAt = new Date().toISOString();
              logActivity('deleted', t.id, t.title);
            } else {
              newTodos = newTodos.filter(item => item.id !== id);
              logActivity('permanently_deleted', t.id, t.title);
            }
          }
        }
      }
      localDB.setTodos(newTodos);
    }
    return { success: true, message: `Bulk ${action} applied` };
  },

  clearCompleted: async () => {
    if (db) {
      const snap = await getDocs(collection(db, 'todos'));
      const batch = writeBatch(db);
      snap.forEach((d) => {
        const todo = d.data();
        if (todo.completed && !todo.deletedAt) {
          batch.update(doc(db, 'todos', todo.id), { deletedAt: new Date().toISOString() });
          logActivity('deleted', todo.id, todo.title);
        }
      });
      await batch.commit();
    } else {
      const todos = localDB.getTodos();
      todos.forEach(t => {
        if (t.completed && !t.deletedAt) {
          t.deletedAt = new Date().toISOString();
          logActivity('deleted', t.id, t.title);
        }
      });
      localDB.setTodos(todos);
    }
    return { success: true, message: 'Todos deleted' };
  },

  emptyTrash: async () => {
    if (db) {
      const snap = await getDocs(collection(db, 'todos'));
      const batch = writeBatch(db);
      snap.forEach((d) => {
        const todo = d.data();
        if (todo.deletedAt) {
          batch.delete(doc(db, 'todos', todo.id));
          logActivity('permanently_deleted', todo.id, todo.title);
        }
      });
      await batch.commit();
    } else {
      const todos = localDB.getTodos();
      const active = todos.filter(t => {
        if (t.deletedAt) {
          logActivity('permanently_deleted', t.id, t.title);
          return false;
        }
        return true;
      });
      localDB.setTodos(active);
    }
    return { success: true, message: 'Trash emptied' };
  },

  reorder: async (ids) => {
    if (!Array.isArray(ids)) throw new Error('ids must be an array');
    if (db) {
      const batch = writeBatch(db);
      ids.forEach((id, index) => {
        batch.update(doc(db, 'todos', id), { order: index });
      });
      await batch.commit();
    } else {
      const todos = localDB.getTodos();
      ids.forEach((id, index) => {
        const todo = todos.find(t => t.id === id);
        if (todo) todo.order = index;
      });
      localDB.setTodos(todos);
    }
    return { success: true, message: 'Order saved' };
  },

  getActivity: async () => {
    if (db) {
      // Direct Firestore query: we fetch all and slice to prevent index building errors for client demo
      const snap = await getDocs(collection(db, 'activity'));
      const acts = [];
      snap.forEach(d => acts.push(d.data()));
      acts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      return { success: true, data: acts.slice(0, 100) };
    } else {
      const acts = localDB.getActivities();
      return { success: true, data: acts };
    }
  },

  getStats: async () => {
    let todos = [];
    if (db) {
      const snap = await getDocs(collection(db, 'todos'));
      snap.forEach((doc) => {
        todos.push(doc.data());
      });
    } else {
      todos = localDB.getTodos();
    }

    const active = todos.filter(t => !t.completed && !t.archived && !t.deletedAt).length;
    const completed = todos.filter(t => t.completed && !t.archived && !t.deletedAt).length;
    const archived = todos.filter(t => t.archived && !t.deletedAt).length;
    const deleted = todos.filter(t => t.deletedAt).length;

    return {
      success: true,
      data: {
        total: active + completed,
        active,
        completed,
        archived,
        deleted
      }
    };
  }
};
