import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import confetti from 'canvas-confetti';
import { api } from '../api.js';
import TodoItem from '../components/TodoItem.jsx';
import AddTodoModal from '../components/AddTodoModal.jsx';
import StatsDashboard from '../components/StatsDashboard.jsx';
import SkeletonList from '../components/SkeletonList.jsx';
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
  { label: 'Custom order', value: 'order' },
  { label: 'Newest first', value: 'createdAt_desc' },
  { label: 'Oldest first', value: 'createdAt_asc' },
  { label: 'Due date', value: 'dueDate_asc' },
  { label: 'Priority', value: 'priority_asc' },
  { label: 'Title A–Z', value: 'title_asc' },
];

const CATEGORIES = ['All', 'General', 'Work', 'Personal', 'Health', 'Home'];

const DATES = [
  { label: 'Any', value: 'all' },
  { label: 'Overdue', value: 'overdue' },
  { label: 'Today', value: 'today' },
  { label: 'Upcoming', value: 'upcoming' },
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
  const [showSearch, setShowSearch] = useState(false);

  const location = useLocation();
  const queryStatus = new URLSearchParams(location.search).get('status');
  
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(queryStatus || 'all');
  
  useEffect(() => {
    setStatus(queryStatus || 'all');
  }, [queryStatus]);
  const [priority, setPriority] = useState('all');
  const [category, setCategory] = useState('all');
  const [dueDate, setDueDate] = useState('all');
  const [sortBy, setSortBy] = useState('order');

  // Pending undo deletes: { id, todo, timerId, index }
  const pendingDeletes = useRef({});

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const fetchTodos = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getAll({ search, status, priority, category, dueDate, sortBy });
      setTodos(data.data);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [search, status, priority, category, dueDate, sortBy]);

  useEffect(() => {
    const timer = setTimeout(fetchTodos, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchTodos, search]);

  // Open search panel and auto-focus when / is pressed
  useEffect(() => {
    const handler = (e) => {
      // Escape must fire even when an input is focused (closes the search panel)
      if (e.key === 'Escape') {
        setShowModal(false);
        setEditingTodo(null);
        setShowSearch(false);
        setSearch('');
        return;
      }
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'n') { e.preventDefault(); setEditingTodo(null); setShowModal(true); }
      if (e.key === '/') { e.preventDefault(); setShowSearch(true); setTimeout(() => searchRef.current?.focus(), 50); }
      if (e.key === 'g') setViewMode(v => { const n = v === 'list' ? 'grid' : 'list'; localStorage.setItem('viewMode', n); return n; });
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Auto-focus search input when panel opens
  useEffect(() => {
    if (showSearch) setTimeout(() => searchRef.current?.focus(), 50);
  }, [showSearch]);

  // Fire confetti when all active tasks are completed
  function maybeConfetti(updatedTodos) {
    const activeLeft = updatedTodos.filter(t => !t.completed).length;
    if (activeLeft === 0 && updatedTodos.length > 0) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#4ade80', '#fbbf24', '#f87171', '#fb923c'],
      });
    }
  }

  async function handleToggle(id, completed) {
    const prev = todos.find(t => t.id === id);
    const updatedTodos = todos.map(x => x.id === id ? { ...x, completed } : x);
    setTodos(updatedTodos);
    try {
      const res = await api.patch(id, { completed });
      if (completed && prev?.repeat) {
        fetchTodos();
      } else {
        setTodos(cur => cur.map(x => x.id === id ? res.data : x));
      }
      toast(completed ? 'Task completed! 🎉' : 'Marked as active', 'success');
      if (completed) maybeConfetti(updatedTodos);
    } catch (e) {
      setTodos(t => t.map(x => x.id === id ? prev : x));
      toast(e.message, 'error');
    }
  }

  async function handleDelete(id) {
    const idx = todos.findIndex(t => t.id === id);
    const todo = todos[idx];
    if (!todo) return;

    const isHardDelete = !!todo.deletedAt;

    // Optimistically update UI
    setTodos(prev => prev.filter(t => t.id !== id));
    setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });

    if (isHardDelete) {
      // Hard delete from Trash: use 5s timer since it's destructive and cannot be undone in DB
      const timerId = setTimeout(async () => {
        delete pendingDeletes.current[id];
        try {
          await api.delete(id);
        } catch (e) {
          toast(e.message, 'error');
          fetchTodos();
        }
      }, 5000);

      pendingDeletes.current[id] = { todo, idx, timerId };

      toast(
        `"${todo.title}" permanently deleted`,
        'info',
        5000,
        {
          label: 'Undo',
          onClick: () => {
            const pending = pendingDeletes.current[id];
            if (!pending) return;
            clearTimeout(pending.timerId);
            delete pendingDeletes.current[id];
            setTodos(prev => {
              const copy = [...prev];
              copy.splice(Math.min(pending.idx, copy.length), 0, pending.todo);
              return copy;
            });
            toast('Delete undone', 'success');
          },
        }
      );
    } else {
      // Soft delete: call backend immediately to keep database and Trash view in sync
      try {
        await api.delete(id);
        toast(
          `"${todo.title}" moved to Trash`,
          'info',
          5000,
          {
            label: 'Undo',
            onClick: async () => {
              try {
                await api.bulkAction('restore', [id]);
                fetchTodos();
                toast('Task restored', 'success');
              } catch (e) {
                toast(e.message, 'error');
              }
            },
          }
        );
      } catch (e) {
        toast(e.message, 'error');
        fetchTodos();
      }
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

  async function handleEmptyTrash() {
    if (!todos.length) return;
    if (!confirm('Permanently delete all items in Trash? This action cannot be undone.')) return;
    try {
      const ids = todos.map(t => t.id);
      await api.deleteMany(ids);
      setTodos([]);
      toast('Trash emptied', 'success');
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

  async function handleBulkAction(action, value = null, targetIds = null) {
    const ids = targetIds || Array.from(selected);
    if (!ids.length) return;
    try {
      if (action === 'delete') {
        await api.deleteMany(ids);
      } else {
        await api.bulkAction(action, ids, value);
      }
      toast(`${action === 'archive' || action === 'unarchive' || action === 'restore' || action === 'delete' ? action : 'Bulk action'} applied`, 'success');
      if (!targetIds) setSelected(new Set());
      fetchTodos();
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

  function toggleSearch() {
    if (showSearch) { setShowSearch(false); setSearch(''); }
    else setShowSearch(true);
  }

  async function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setTodos(prev => {
      const oldIdx = prev.findIndex(t => t.id === active.id);
      const newIdx = prev.findIndex(t => t.id === over.id);
      const reordered = arrayMove(prev, oldIdx, newIdx);
      api.reorder(reordered.map(t => t.id)).catch(() => toast('Failed to save order', 'error'));
      return reordered;
    });
  }

  const displayTodos = [...todos].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });

  const completedCount = todos.filter(t => t.completed).length;
  const activeCount = todos.filter(t => !t.completed).length;
  const overdueCount = todos.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < new Date()).length;

  // Is any filter active?
  const hasActiveFilter = search || priority !== 'all' || category !== 'all' || dueDate !== 'all' || sortBy !== 'order' || (status !== 'all' && status !== 'archived' && status !== 'deleted');

  return (
    <main className={`page-container fade-in ${styles.page}`}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            {status === 'archived' ? 'Archive' : status === 'deleted' ? 'Trash' : 'My Tasks'}
          </h1>
          <div className={styles.headerMeta}>
            <span className={styles.statChip}>{activeCount} active</span>
            {completedCount > 0 && <span className={`${styles.statChip} ${styles.done}`}>{completedCount} done</span>}
            {overdueCount > 0 && <span className={`${styles.statChip} ${styles.overdue}`}>⚠ {overdueCount} overdue</span>}
          </div>
        </div>
        <div className={styles.headerActions}>
          {/* Search toggle */}
          <button
            className={`${styles.iconBtn} ${hasActiveFilter ? styles.iconBtnActive : ''}`}
            onClick={toggleSearch}
            title="Search & filter (/)"
            id="search-toggle"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            {hasActiveFilter && <span className={styles.filterDot} />}
          </button>

          {/* View toggle */}
          <div className={styles.viewToggle}>
            <button className={`${styles.viewBtn} ${viewMode === 'list' ? styles.viewActive : ''}`} onClick={() => setView('list')} title="List view">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
                <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
                <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
            </button>
            <button className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.viewActive : ''}`} onClick={() => setView('grid')} title="Grid view">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
            </button>
          </div>

          <button className={styles.addBtn} onClick={() => { setEditingTodo(null); setShowModal(true); }}>
            <span>+</span> New Task
          </button>
        </div>
      </div>

      {/* Stats Dashboard */}
      {status !== 'archived' && status !== 'deleted' && (
        <StatsDashboard todos={todos} />
      )}

      {/* Spotlight search overlay */}
      {showSearch && (
        <div className={styles.spotlightBackdrop} onClick={toggleSearch}>
          <div className={styles.spotlightPanel} onClick={e => e.stopPropagation()}>
            {/* Search input */}
            <div className={styles.spotlightSearch}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                ref={searchRef}
                className={styles.spotlightInput}
                placeholder="Search tasks, tags, categories…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search
                ? <button className={styles.spotlightClear} onClick={() => setSearch('')}>×</button>
                : <kbd className={styles.spotlightEsc}>Esc</kbd>
              }
            </div>

            {/* Divider */}
            <div className={styles.spotlightDivider} />

            {/* Filter row */}
            <div className={styles.spotlightFilters}>
              <div className={styles.spotlightFilterGroup}>
                <span className={styles.spotlightFilterLabel}>Status</span>
                {FILTERS.map(f => (
                  <button key={f.value} className={`${styles.filterBtn} ${status === f.value ? styles.active : ''}`} onClick={() => setStatus(f.value)}>
                    {f.label}
                  </button>
                ))}
              </div>
              <div className={styles.spotlightFilterGroup}>
                <span className={styles.spotlightFilterLabel}>Priority</span>
                {PRIORITIES.map(p => (
                  <button
                    key={p.value}
                    className={`${styles.filterBtn} ${priority === p.value ? styles.active : ''} ${priority === p.value && p.value !== 'all' ? styles[p.value] : ''}`}
                    onClick={() => setPriority(p.value)}
                  >{p.label}</button>
                ))}
              </div>
              <div className={styles.spotlightFilterGroup}>
                <span className={styles.spotlightFilterLabel}>Category</span>
                <select className={styles.sortSelect} value={category} onChange={e => setCategory(e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c === 'All' ? 'all' : c}>{c}</option>)}
                </select>
              </div>
              <div className={styles.spotlightFilterGroup}>
                <span className={styles.spotlightFilterLabel}>Due</span>
                <select className={styles.sortSelect} value={dueDate} onChange={e => setDueDate(e.target.value)}>
                  {DATES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div className={styles.spotlightFilterGroup}>
                <span className={styles.spotlightFilterLabel}>Sort</span>
                <select className={styles.sortSelect} value={sortBy} onChange={e => setSortBy(e.target.value)}>
                  {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk actions */}
      {todos.length > 0 && (
        <div className={styles.bulkRow}>
          <label className={styles.selectAll}>
            <input type="checkbox" checked={selected.size === todos.length && todos.length > 0} onChange={handleSelectAll} />
            <span>{selected.size > 0 ? `${selected.size} selected` : 'Select all'}</span>
          </label>
          <div className={styles.bulkActions}>
            {selected.size > 0 && status === 'deleted' && (
              <>
                <button className={styles.ghostBtn} onClick={() => handleBulkAction('restore')}>Restore Selected</button>
                <button className={styles.dangerBtn} onClick={handleDeleteSelected}>Permanently Delete ({selected.size})</button>
              </>
            )}
            
            {selected.size > 0 && status !== 'deleted' && (
              <>
                <button className={styles.ghostBtn} onClick={() => handleBulkAction('complete')}>Complete</button>
                {status === 'archived' ? (
                  <button className={styles.ghostBtn} onClick={() => handleBulkAction('unarchive')}>Unarchive</button>
                ) : (
                  <button className={styles.ghostBtn} onClick={() => handleBulkAction('archive')}>Archive</button>
                )}
                
                <select 
                  className={styles.bulkSelect} 
                  onChange={(e) => {
                    if(e.target.value) {
                      handleBulkAction('priority', e.target.value);
                      e.target.value = "";
                    }
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>Set Priority...</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>

                <button className={styles.dangerBtn} onClick={handleDeleteSelected}>Delete ({selected.size})</button>
              </>
            )}

            {selected.size === 0 && completedCount > 0 && status !== 'deleted' && status !== 'archived' && (
              <button className={styles.ghostBtn} onClick={handleClearCompleted}>Clear completed ({completedCount})</button>
            )}

            {selected.size === 0 && status === 'deleted' && (
              <button className={styles.dangerBtn} onClick={handleEmptyTrash}>Empty Trash</button>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <SkeletonList count={5} />
      ) : error ? (
        <div className={styles.errorBox}>
          <span>⚠ {error}</span>
          <button onClick={fetchTodos}>Retry</button>
        </div>
      ) : displayTodos.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>◎</div>
          <p className={styles.emptyTitle}>
            {hasActiveFilter 
              ? 'No tasks match your filters' 
              : status === 'archived' 
                ? 'Archive is empty' 
                : status === 'deleted' 
                  ? 'Trash is empty' 
                  : 'No tasks yet'}
          </p>
          <p className={styles.emptyHint}>
            {hasActiveFilter 
              ? 'Try different keywords or clear the filters' 
              : status === 'archived' 
                ? 'Archived tasks will appear here' 
                : status === 'deleted' 
                  ? 'Deleted tasks will appear here for 30 days' 
                  : 'Click New Task to get started'}
          </p>
          {!hasActiveFilter && status !== 'deleted' && status !== 'archived' && (
            <button className={styles.addBtn} onClick={() => setShowModal(true)}>+ New Task</button>
          )}
          {hasActiveFilter && (
            <button className={styles.ghostBtn} onClick={() => { setSearch(''); setStatus('all'); setPriority('all'); setCategory('all'); setDueDate('all'); }}>Clear filters</button>
          )}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={displayTodos.map(t => t.id)} strategy={verticalListSortingStrategy}>
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
                  onArchive={() => handleBulkAction(todo.archived ? 'unarchive' : 'archive', null, [todo.id])}
                  onRestore={() => handleBulkAction('restore', null, [todo.id])}
                  onView={() => navigate(`/todo?id=${todo.id}`)}
                  onPin={() => handleTogglePin(todo.id, todo.pinned)}
                  style={{ animationDelay: `${Math.min(i * 25, 300)}ms` }}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
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
