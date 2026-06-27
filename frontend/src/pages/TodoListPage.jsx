import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import TodoItem from '../components/TodoItem.jsx';
import AddTodoModal from '../components/AddTodoModal.jsx';
import styles from './TodoListPage.module.css';

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
];

const PRIORITIES = [
  { label: 'All', value: 'all' },
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' },
];

const SORTS = [
  { label: 'Newest', value: 'createdAt' },
  { label: 'Due Date', value: 'dueDate' },
  { label: 'Priority', value: 'priority' },
];

export default function TodoListPage() {
  const navigate = useNavigate();
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  const [selected, setSelected] = useState(new Set());

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');

  const fetchTodos = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getAll({ search, status, priority, sortBy });
      setTodos(data.data);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [search, status, priority, sortBy]);

  useEffect(() => {
    const timer = setTimeout(fetchTodos, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchTodos, search]);

  async function handleToggle(id, completed) {
    try {
      await api.patch(id, { completed });
      setTodos(prev => prev.map(t => t.id === id ? { ...t, completed, updatedAt: new Date().toISOString() } : t));
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this todo?')) return;
    try {
      await api.delete(id);
      setTodos(prev => prev.filter(t => t.id !== id));
      setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDeleteSelected() {
    if (!selected.size) return;
    if (!confirm(`Delete ${selected.size} todo(s)?`)) return;
    try {
      await api.deleteMany([...selected]);
      setTodos(prev => prev.filter(t => !selected.has(t.id)));
      setSelected(new Set());
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleClearCompleted() {
    const count = todos.filter(t => t.completed).length;
    if (!count) return;
    if (!confirm(`Clear ${count} completed todo(s)?`)) return;
    try {
      await api.clearCompleted();
      setTodos(prev => prev.filter(t => !t.completed));
    } catch (e) {
      setError(e.message);
    }
  }

  function handleSelectAll() {
    if (selected.size === todos.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(todos.map(t => t.id)));
    }
  }

  function handleSelect(id) {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  const completedCount = todos.filter(t => t.completed).length;
  const activeCount = todos.filter(t => !t.completed).length;

  return (
    <main className={`page-container ${styles.page}`}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>My Tasks</h1>
          <p className={styles.subtitle}>
            <span className={styles.statBadge}>{activeCount} active</span>
            {completedCount > 0 && (
              <span className={`${styles.statBadge} ${styles.done}`}>{completedCount} done</span>
            )}
          </p>
        </div>
        <button className={styles.addBtn} onClick={() => { setEditingTodo(null); setShowModal(true); }}>
          <span>+</span> New Task
        </button>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            className={styles.searchInput}
            placeholder="Search tasks, tags…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className={styles.clearSearch} onClick={() => setSearch('')}>×</button>
          )}
        </div>

        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            {FILTERS.map(f => (
              <button
                key={f.value}
                className={`${styles.filterBtn} ${status === f.value ? styles.active : ''}`}
                onClick={() => setStatus(f.value)}
              >{f.label}</button>
            ))}
          </div>
          <div className={styles.filterGroup}>
            {PRIORITIES.map(p => (
              <button
                key={p.value}
                className={`${styles.filterBtn} ${priority === p.value ? styles.active : ''} ${priority === p.value && p.value !== 'all' ? styles[p.value] : ''}`}
                onClick={() => setPriority(p.value)}
              >{p.label}</button>
            ))}
          </div>
          <select
            className={styles.sortSelect}
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
          >
            {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {/* Bulk actions */}
      {todos.length > 0 && (
        <div className={styles.bulkRow}>
          <label className={styles.selectAll}>
            <input
              type="checkbox"
              checked={selected.size === todos.length && todos.length > 0}
              onChange={handleSelectAll}
            />
            <span>{selected.size > 0 ? `${selected.size} selected` : 'Select all'}</span>
          </label>
          <div className={styles.bulkActions}>
            {selected.size > 0 && (
              <button className={styles.dangerBtn} onClick={handleDeleteSelected}>
                Delete selected
              </button>
            )}
            {completedCount > 0 && (
              <button className={styles.ghostBtn} onClick={handleClearCompleted}>
                Clear completed ({completedCount})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className={styles.loader}>
          <div className={styles.spinner} />
          <span>Loading tasks…</span>
        </div>
      ) : error ? (
        <div className={styles.errorBox}>
          <span>⚠ {error}</span>
          <button onClick={fetchTodos}>Retry</button>
        </div>
      ) : todos.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>◎</div>
          <p className={styles.emptyTitle}>
            {search ? 'No tasks match your search' : 'No tasks yet'}
          </p>
          <p className={styles.emptyHint}>
            {search ? 'Try different keywords' : 'Add your first task to get started'}
          </p>
          {!search && (
            <button className={styles.addBtn} onClick={() => setShowModal(true)}>
              + New Task
            </button>
          )}
        </div>
      ) : (
        <div className={styles.list}>
          {todos.map((todo, i) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              selected={selected.has(todo.id)}
              onSelect={() => handleSelect(todo.id)}
              onToggle={() => handleToggle(todo.id, !todo.completed)}
              onEdit={() => { setEditingTodo(todo); setShowModal(true); }}
              onDelete={() => handleDelete(todo.id)}
              onView={() => navigate(`/todo?id=${todo.id}`)}
              style={{ animationDelay: `${i * 30}ms` }}
            />
          ))}
        </div>
      )}

      {showModal && (
        <AddTodoModal
          todo={editingTodo}
          onClose={() => { setShowModal(false); setEditingTodo(null); }}
          onSave={async (data) => {
            try {
              if (editingTodo) {
                const res = await api.update(editingTodo.id, data);
                setTodos(prev => prev.map(t => t.id === editingTodo.id ? res.data : t));
              } else {
                const res = await api.create(data);
                setTodos(prev => [res.data, ...prev]);
              }
              setShowModal(false);
              setEditingTodo(null);
            } catch (e) {
              setError(e.message);
            }
          }}
        />
      )}
    </main>
  );
}
