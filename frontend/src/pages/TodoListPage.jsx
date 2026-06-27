import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import TodoItem from '../components/TodoItem.jsx';
import AddTodoModal from '../components/AddTodoModal.jsx';
import StatsDashboard from '../components/StatsDashboard.jsx';
import { useToast } from '../components/Toast.jsx';
import styles from './TodoListPage.module.css';

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
];

const PRIORITIES = [
  { label: 'All', value: 'all' },
  { label: '↑ High', value: 'high' },
  { label: '→ Med', value: 'medium' },
  { label: '↓ Low', value: 'low' },
];

const SORTS = [
  { label: 'Newest first', value: 'createdAt' },
  { label: 'Due date', value: 'dueDate' },
  { label: 'Priority', value: 'priority' },
  { label: 'Title A–Z', value: 'title' },
];

export default function TodoListPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const searchRef = useRef(null);

  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('viewMode') || 'list');
  const [showShortcuts, setShowShortcuts] = useState(false);

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

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'n') { e.preventDefault(); setEditingTodo(null); setShowModal(true); }
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'Escape') { setShowModal(false); setEditingTodo(null); }
      if (e.key === '?') setShowShortcuts(s => !s);
      if (e.key === '1') setStatus('all');
      if (e.key === '2') setStatus('active');
      if (e.key === '3') setStatus('completed');
      if (e.key === 'g') setViewMode(v => { const n = v === 'list' ? 'grid' : 'list'; localStorage.setItem('viewMode', n); return n; });
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  async function handleToggle(id, completed) {
    const prev = todos.find(t => t.id === id);
    setTodos(t => t.map(x => x.id === id ? { ...x, completed } : x));
    try {
      await api.patch(id, { completed });
      toast(completed ? 'Task completed! 🎉' : 'Marked as active', 'success');
    } catch (e) {
      setTodos(t => t.map(x => x.id === id ? prev : x));
      toast(e.message, 'error');
    }
  }

  async function handleDelete(id) {
    const todo = todos.find(t => t.id === id);
    if (!confirm(`Delete "${todo?.title}"?`)) return;
    setTodos(prev => prev.filter(t => t.id !== id));
    setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
    try {
      await api.delete(id);
      toast('Task deleted', 'success');
    } catch (e) {
      toast(e.message, 'error');
      fetchTodos();
    }
  }

  async function handleTogglePin(id) {
    const todo = todos.find(t => t.id === id);
    const pinned = !todo.pinned;
    setTodos(t => t.map(x => x.id === id ? { ...x, pinned } : x));
    try {
      await api.patch(id, { pinned });
      toast(pinned ? 'Task pinned' : 'Task unpinned', 'info');
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  async function handleDeleteSelected() {
    if (!selected.size) return;
    if (!confirm(`Delete ${selected.size} task(s)?`)) return;
    try {
      await api.deleteMany([...selected]);
      setTodos(prev => prev.filter(t => !selected.has(t.id)));
      setSelected(new Set());
      toast(`${selected.size} task(s) deleted`, 'success');
    } catch (e) { toast(e.message, 'error'); }
  }

  async function handleClearCompleted() {
    const count = todos.filter(t => t.completed).length;
    if (!count) return;
    if (!confirm(`Clear ${count} completed task(s)?`)) return;
    try {
      await api.clearCompleted();
      setTodos(prev => prev.filter(t => !t.completed));
      toast(`${count} completed task(s) cleared`, 'success');
    } catch (e) { toast(e.message, 'error'); }
  }

  function handleSelectAll() {
    if (selected.size === todos.length) setSelected(new Set());
    else setSelected(new Set(todos.map(t => t.id)));
  }

  function handleSelect(id) {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function setView(mode) {
    setViewMode(mode);
    localStorage.setItem('viewMode', mode);
  }

  // Sort: pinned always on top
  const displayTodos = [...todos].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });

  const completedCount = todos.filter(t => t.completed).length;
  const activeCount = todos.filter(t => !t.completed).length;
  const overdueCount = todos.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < new Date()).length;

  return (
    <main className={`page-container ${styles.page}`}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>My Tasks</h1>
          <div className={styles.headerMeta}>
            <span className={styles.statChip}>{activeCount} active</span>
            {completedCount > 0 && <span className={`${styles.statChip} ${styles.done}`}>{completedCount} done</span>}
            {overdueCount > 0 && <span className={`${styles.statChip} ${styles.overdue}`}>⚠ {overdueCount} overdue</span>}
          </div>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.iconBtn} onClick={() => setShowShortcuts(s => !s)} title="Keyboard shortcuts (?)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="6" width="20" height="12" rx="2"/>
              <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8"/>
            </svg>
          </button>
          <div className={styles.viewToggle}>
            <button className={`${styles.viewBtn} ${viewMode === 'list' ? styles.viewActive : ''}`} onClick={() => setView('list')} title="List view (G)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
                <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
                <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
            </button>
            <button className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.viewActive : ''}`} onClick={() => setView('grid')} title="Grid view (G)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
            </button>
          </div>
          <button className={styles.addBtn} onClick={() => { setEditingTodo(null); setShowModal(true); }}>
            <span>+</span> New Task <kbd>N</kbd>
          </button>
        </div>
      </div>

      {/* Keyboard shortcuts panel */}
      {showShortcuts && (
        <div className={styles.shortcuts}>
          <h3 className={styles.shortcutsTitle}>Keyboard Shortcuts</h3>
          <div className={styles.shortcutsGrid}>
            {[['N', 'New task'],['/', 'Focus search'],['G', 'Toggle grid/list'],['1', 'All tasks'],['2', 'Active tasks'],['3', 'Completed tasks'],['Esc', 'Close modal'],['?', 'Toggle shortcuts']].map(([k, v]) => (
              <div key={k} className={styles.shortcutRow}><kbd>{k}</kbd><span>{v}</span></div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Dashboard */}
      <StatsDashboard />

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            ref={searchRef}
            className={styles.searchInput}
            placeholder="Search tasks, tags, categories… (/)"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button className={styles.clearSearch} onClick={() => setSearch('')}>×</button>}
        </div>

        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            {FILTERS.map(f => (
              <button key={f.value} className={`${styles.filterBtn} ${status === f.value ? styles.active : ''}`} onClick={() => setStatus(f.value)}>
                {f.label}
              </button>
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
          <select className={styles.sortSelect} value={sortBy} onChange={e => setSortBy(e.target.value)}>
            {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {/* Bulk actions */}
      {todos.length > 0 && (
        <div className={styles.bulkRow}>
          <label className={styles.selectAll}>
            <input type="checkbox" checked={selected.size === todos.length && todos.length > 0} onChange={handleSelectAll} />
            <span>{selected.size > 0 ? `${selected.size} selected` : 'Select all'}</span>
          </label>
          <div className={styles.bulkActions}>
            {selected.size > 0 && <button className={styles.dangerBtn} onClick={handleDeleteSelected}>Delete selected ({selected.size})</button>}
            {completedCount > 0 && <button className={styles.ghostBtn} onClick={handleClearCompleted}>Clear completed ({completedCount})</button>}
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
          <p className={styles.emptyTitle}>{search ? 'No tasks match your search' : 'No tasks yet'}</p>
          <p className={styles.emptyHint}>{search ? 'Try different keywords or clear the search' : 'Press N or click New Task to get started'}</p>
          {!search && <button className={styles.addBtn} onClick={() => setShowModal(true)}>+ New Task</button>}
        </div>
      ) : (
        <div className={viewMode === 'grid' ? styles.grid : styles.list}>
          {displayTodos.map((todo, i) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              viewMode={viewMode}
              selected={selected.has(todo.id)}
              onSelect={() => handleSelect(todo.id)}
              onToggle={() => handleToggle(todo.id, !todo.completed)}
              onEdit={() => { setEditingTodo(todo); setShowModal(true); }}
              onDelete={() => handleDelete(todo.id)}
              onView={() => navigate(`/todo?id=${todo.id}`)}
              onPin={() => handleTogglePin(todo.id)}
              style={{ animationDelay: `${Math.min(i * 25, 300)}ms` }}
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
                toast('Task updated', 'success');
              } else {
                const res = await api.create(data);
                setTodos(prev => [res.data, ...prev]);
                toast('Task created!', 'success');
              }
              setShowModal(false);
              setEditingTodo(null);
            } catch (e) { toast(e.message, 'error'); }
          }}
        />
      )}
    </main>
  );
}
