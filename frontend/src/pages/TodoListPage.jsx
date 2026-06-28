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
} from '@dnd-kit/sortable';
import confetti from 'canvas-confetti';
import { 
  Search, 
  Grid, 
  List, 
  Plus, 
  MoreHorizontal, 
  Calendar, 
  Clock, 
  Tag, 
  MessageSquare, 
  Paperclip, 
  Trash2, 
  Edit3, 
  Copy, 
  Archive, 
  RefreshCw, 
  Eye,
  CheckSquare
} from 'lucide-react';
import { api } from '../api.js';
import TodoItem from '../components/TodoItem.jsx';
import AddTodoModal from '../components/AddTodoModal.jsx';
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

const BOARD_COLUMNS = [
  { id: 'todo', title: 'To Do', color: '#3b82f6', tintClass: 'todoTint' },
  { id: 'in_progress', title: 'In Progress', color: '#f59e0b', tintClass: 'progressTint' },
  { id: 'review', title: 'Review', color: '#8b5cf6', tintClass: 'reviewTint' },
  { id: 'completed', title: 'Completed', color: '#10b981', tintClass: 'completedTint' }
];

const getMockMeta = (id) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const comments = Math.abs(hash % 5);
  const attachments = Math.abs((hash >> 2) % 3);
  return { comments, attachments };
};

function getStatusFromMode(mode) {
  if (mode === 'archive') return 'archived';
  if (mode === 'deleted') return 'deleted';
  return 'all';
}

export default function TodoListPage({ mode = 'tasks' }) {
  const navigate = useNavigate();
  const toast = useToast();
  const searchRef = useRef(null);
  const menuRef = useRef(null);

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
  const [status, setStatus] = useState(queryStatus || getStatusFromMode(mode));
  
  useEffect(() => {
    setStatus(queryStatus || getStatusFromMode(mode));
  }, [mode, queryStatus]);
  const [priority, setPriority] = useState('all');
  const [category, setCategory] = useState('all');
  const [dueDate, setDueDate] = useState('all');
  const [sortBy, setSortBy] = useState('order');

  // Drag states for Board view
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [draggedOverColumn, setDraggedOverColumn] = useState(null);

  // Inline board creation states
  const [inlineColId, setInlineColId] = useState(null);
  const [inlineTitle, setInlineTitle] = useState('');

  // Three-dot Active Card Menu State
  const [activeMenuId, setActiveMenuId] = useState(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Close menus on click outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

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

  // Keyboard shortcut handler
  useEffect(() => {
    const handler = (e) => {
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
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

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
    setActiveMenuId(null);
    if (!window.confirm('Delete this task?')) return;
    const oldTodos = [...todos];
    setTodos(prev => prev.filter(t => t.id !== id));
    try {
      await api.delete(id);
      toast('Task deleted', 'success');
    } catch (err) {
      setTodos(oldTodos);
      toast(err.message, 'error');
    }
  }

  const handleDuplicate = async (todo) => {
    setActiveMenuId(null);
    try {
      const duplicatedTodo = {
        title: `${todo.title} (Copy)`,
        description: todo.description,
        priority: todo.priority,
        dueDate: todo.dueDate,
        tags: todo.tags,
        category: todo.category,
        subtasks: todo.subtasks ? todo.subtasks.map(st => ({ ...st, done: false })) : [],
        notes: todo.notes,
        pinned: todo.pinned,
        repeat: todo.repeat,
        timeEstimate: todo.timeEstimate,
        kanbanStatus: todo.kanbanStatus || 'todo',
        completed: false
      };
      const res = await api.create(duplicatedTodo);
      setTodos(prev => [res.data, ...prev]);
      toast('Task duplicated', 'success');
    } catch (err) {
      toast(`Duplication failed: ${err.message}`, 'error');
    }
  };

  const handleArchive = async (todo) => {
    setActiveMenuId(null);
    const updatedArchived = !todo.archived;
    try {
      await api.bulkAction(updatedArchived ? 'archive' : 'unarchive', [todo.id]);
      setTodos(prev => prev.filter(t => t.id !== todo.id));
      toast(updatedArchived ? 'Task archived' : 'Task unarchived', 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const handleMoveTask = async (todoId, colId) => {
    if (!todoId) return;
    const todo = todos.find(t => t.id === todoId);
    if (!todo || (todo.kanbanStatus || (todo.completed ? 'completed' : 'todo')) === colId) return;

    // Optimistic Update
    const oldTodos = [...todos];
    setTodos(prev => prev.map(t => t.id === todoId ? { 
      ...t, 
      kanbanStatus: colId,
      completed: colId === 'completed',
      completedAt: colId === 'completed' ? new Date().toISOString() : null
    } : t));

    try {
      await api.patch(todoId, { 
        kanbanStatus: colId,
        completed: colId === 'completed'
      });
      toast(`Task moved to ${BOARD_COLUMNS.find(c => c.id === colId).title}`, 'success');
      if (colId === 'completed') {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.8 } });
      }
    } catch (err) {
      setTodos(oldTodos);
      toast(`Failed to move task: ${err.message}`, 'error');
    }
  };

  const handleInlineSave = async (colId) => {
    if (!inlineTitle.trim()) {
      setInlineColId(null);
      return;
    }
    try {
      const res = await api.create({
        title: inlineTitle.trim(),
        kanbanStatus: colId,
        completed: colId === 'completed'
      });
      setTodos(prev => [res.data, ...prev]);
      toast('Task created', 'success');
      setInlineTitle('');
      setInlineColId(null);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  async function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = todos.findIndex(t => t.id === active.id);
    const newIndex = todos.findIndex(t => t.id === over.id);
    const reordered = [...todos];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    setTodos(reordered);
    try {
      await api.reorder(reordered.map(t => t.id));
    } catch (e) {
      toast(e.message, 'error');
      fetchTodos();
    }
  }

  function handleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSelectAll(e) {
    if (e.target.checked) {
      setSelected(new Set(displayTodos.map(t => t.id)));
    } else {
      setSelected(new Set());
    }
  }

  async function handleBulkAction(action, data, specificIds = null) {
    const ids = specificIds || Array.from(selected);
    if (!ids.length) return;
    try {
      await api.bulkAction(action, ids, data);
      setSelected(new Set());
      fetchTodos();
      toast(`Bulk ${action} successful`, 'success');
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  async function handleClearCompleted() {
    try {
      await api.bulkAction('delete', todos.filter(t => t.completed && !t.deletedAt).map(t => t.id));
      fetchTodos();
      toast('Completed tasks cleared', 'success');
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  async function handleEmptyTrash() {
    if (!window.confirm('Are you sure you want to permanently delete all tasks in the trash?')) return;
    try {
      await api.emptyTrash();
      setTodos([]);
      toast('Trash emptied', 'success');
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  const setView = (mode) => {
    setViewMode(mode);
    localStorage.setItem('viewMode', mode);
  };

  // Due date helpers
  const getDueDateClass = (dateStr) => {
    if (!dateStr) return '';
    const today = new Date(); today.setHours(0,0,0,0);
    const d = new Date(dateStr); d.setHours(0,0,0,0);
    if (d < today) return styles.overdue;
    if (d.getTime() === today.getTime()) return styles.today;
    return styles.upcoming;
  };

  const formatDueDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  const getSubtaskRatio = (subtasks) => {
    if (!subtasks || !subtasks.length) return null;
    const completed = subtasks.filter(s => s.done).length;
    return {
      text: `${completed}/${subtasks.length}`,
      percent: (completed / subtasks.length) * 100
    };
  };

  const displayTodos = todos;
  const activeCount = todos.filter(t => !t.completed && !t.archived && !t.deletedAt).length;
  const completedCount = todos.filter(t => t.completed && !t.archived && !t.deletedAt).length;
  const hasActiveFilter = search || status !== 'all' || priority !== 'all' || category !== 'all' || dueDate !== 'all';

  return (
    <main className={styles.page}>
      {/* Search spotlight panel */}
      {showSearch && (
        <div className={styles.spotlightBackdrop} onClick={() => setShowSearch(false)}>
          <div className={styles.spotlightPanel} onClick={e => e.stopPropagation()}>
            <div className={styles.spotlightSearch}>
              <Search size={18} />
              <input
                ref={searchRef}
                className={styles.spotlightInput}
                type="text"
                placeholder="Type to search (e.g. landing page)..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && <button className={styles.spotlightClear} onClick={() => setSearch('')}>×</button>}
              <span className={styles.spotlightEsc}>ESC</span>
            </div>
            <div className={styles.spotlightDivider} />
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
                  <button key={p.value} className={`${styles.filterBtn} ${priority === p.value ? styles.active : ''} ${styles[p.value]}`} onClick={() => setPriority(p.value)}>
                    {p.label}
                  </button>
                ))}
              </div>
              <div className={styles.spotlightFilterGroup}>
                <span className={styles.spotlightFilterLabel}>Category</span>
                {CATEGORIES.map(c => (
                  <button key={c} className={`${styles.filterBtn} ${category === c.toLowerCase() ? styles.active : ''}`} onClick={() => setCategory(c.toLowerCase())}>
                    {c}
                  </button>
                ))}
              </div>
              <div className={styles.spotlightFilterGroup}>
                <span className={styles.spotlightFilterLabel}>Due Date</span>
                {DATES.map(d => (
                  <button key={d.value} className={`${styles.filterBtn} ${dueDate === d.value ? styles.active : ''}`} onClick={() => setDueDate(d.value)}>
                    {d.label}
                  </button>
                ))}
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

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>My Tasks</h1>
          <div className={styles.headerMeta}>
            <span className={styles.statChip}>{activeCount} active</span>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button
            className={`${styles.iconBtn} ${hasActiveFilter ? styles.iconBtnActive : ''}`}
            onClick={() => setShowSearch(true)}
            title="Filter panel"
          >
            <Search size={18} /> {hasActiveFilter && <span className={styles.filterDot} />}
          </button>

          {/* List/Grid/Board Toggles */}
          <div className={styles.viewToggle}>
            <button className={`${styles.viewBtn} ${viewMode === 'list' ? styles.viewActive : ''}`} onClick={() => setView('list')} title="List view">
              <List size={16} />
            </button>
            <button className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.viewActive : ''}`} onClick={() => setView('grid')} title="Grid view">
              <Grid size={16} />
            </button>
            <button className={`${styles.viewBtn} ${viewMode === 'board' ? styles.viewActive : ''}`} onClick={() => setView('board')} title="Board view">
              <Plus size={16} style={{ transform: 'rotate(45deg)' }} />
            </button>
          </div>

          <button className={styles.addBtn} onClick={() => { setEditingTodo(null); setShowModal(true); }}>
            <Plus size={16} /> <span className={styles.addBtnText}>New Task</span>
          </button>
        </div>
      </div>

      {/* Bulk actions */}
      {viewMode !== 'board' && displayTodos.length > 0 && (
        <div className={styles.bulkRow}>
          <label className={styles.selectAll}>
            <input type="checkbox" checked={selected.size === displayTodos.length && displayTodos.length > 0} onChange={handleSelectAll} />
            <span>Select all</span>
          </label>

          <div className={styles.bulkActions}>
            {selected.size > 0 && (
              <>
                <button className={styles.dangerBtn} onClick={() => handleBulkAction('delete')}>Delete ({selected.size})</button>
                <button className={styles.ghostBtn} onClick={() => handleBulkAction(status === 'archived' ? 'unarchive' : 'archive')}>
                  {status === 'archived' ? 'Unarchive' : 'Archive'}
                </button>
                <select
                  className={styles.bulkSelect}
                  onChange={(e) => handleBulkAction('priority', e.target.value)}
                  defaultValue=""
                >
                  <option value="" disabled>Set Priority...</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
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
      ) : viewMode === 'board' ? (
        /* Highly Polished Board columns */
        <div className={styles.board}>
          {BOARD_COLUMNS.map(col => {
            const colTodos = displayTodos.filter(t => (t.kanbanStatus || (t.completed ? 'completed' : 'todo')) === col.id);
            return (
              <div
                key={col.id}
                className={`${styles.boardColumn} ${styles[col.tintClass]} ${draggedOverColumn === col.id ? styles.boardDragOver : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDraggedOverColumn(col.id);
                }}
                onDragLeave={() => setDraggedOverColumn(null)}
                onDrop={() => {
                  setDraggedOverColumn(null);
                  handleMoveTask(draggedTaskId, col.id);
                }}
              >
                <div className={styles.boardColumnHeader}>
                  <div className={styles.boardColTitle}>
                    <span className={styles.boardColDot} style={{ background: col.color }} />
                    <h3>{col.title}</h3>
                    <span className={styles.boardCountBadge}>{colTodos.length}</span>
                  </div>
                  {col.id === 'todo' && status !== 'deleted' && status !== 'archived' && (
                    <button className={styles.boardAddColBtn} onClick={() => { setTargetColumn(col.id); setEditingTodo(null); setShowModal(true); }}>
                      <Plus size={16} />
                    </button>
                  )}
                </div>

                <div className={styles.boardCardsContainer}>
                  {inlineColId === col.id && (
                    <div className={styles.boardInlineCreateCard}>
                      <input
                        type="text"
                        placeholder="What needs to be done?"
                        value={inlineTitle}
                        onChange={e => setInlineTitle(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleInlineSave(col.id);
                          if (e.key === 'Escape') setInlineColId(null);
                        }}
                        autoFocus
                        className={styles.boardInlineInput}
                      />
                      <div className={styles.boardInlineActions}>
                        <button className={styles.boardInlineSaveBtn} onClick={() => handleInlineSave(col.id)}>Add</button>
                        <button className={styles.boardInlineCancelBtn} onClick={() => setInlineColId(null)}>Cancel</button>
                      </div>
                    </div>
                  )}

                  {colTodos.length === 0 && inlineColId !== col.id ? (
                    <div className={styles.boardEmptyColumn}>No tasks</div>
                  ) : (
                    colTodos.map(todo => {
                      const ratio = getSubtaskRatio(todo.subtasks);
                      const mockMeta = getMockMeta(todo.id);
                      return (
                        <div
                          key={todo.id}
                          className={`${styles.boardCard} ${todo.pinned ? styles.boardPinned : ''}`}
                          style={{ zIndex: activeMenuId === todo.id ? 100 : 'auto' }}
                          draggable="true"
                          onDragStart={() => setDraggedTaskId(todo.id)}
                        >
                          <div className={styles.boardCardHeader}>
                            <span className={`${styles.boardPriorityBadge} ${styles[todo.priority]}`}>
                              {todo.priority}
                            </span>
                            
                            <div className={styles.menuContainer}>
                              <button 
                                className={styles.threeDotBtn} 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(activeMenuId === todo.id ? null : todo.id);
                                }}
                                title="Actions"
                              >
                                <MoreHorizontal size={14} />
                              </button>

                              {activeMenuId === todo.id && (
                                <div ref={menuRef} className={styles.dropdownMenu}>
                                  <button onClick={() => navigate(`/todo?id=${todo.id}`)}><Eye size={12} style={{ marginRight: '8px' }} /> View Details</button>
                                  <button onClick={() => { setEditingTodo(todo); setShowModal(true); }}><Edit3 size={12} style={{ marginRight: '8px' }} /> Edit Task</button>
                                  <button onClick={() => handleDuplicate(todo)}><Copy size={12} style={{ marginRight: '8px' }} /> Duplicate</button>
                                  <button onClick={() => handleArchive(todo)}><Archive size={12} style={{ marginRight: '8px' }} /> Archive</button>
                                  <button onClick={() => handleDelete(todo.id)} className={styles.deleteOption}><Trash2 size={12} style={{ marginRight: '8px' }} /> Delete</button>
                                </div>
                              )}
                            </div>
                          </div>
                          <h4 className={styles.boardCardTitle} onClick={() => navigate(`/todo?id=${todo.id}`)}>{todo.title}</h4>
                          {todo.description && <p className={styles.boardCardDesc}>{todo.description}</p>}
                          
                          <div className={styles.boardCardMiddle}>
                            {todo.category && todo.category !== 'General' && (
                              <span className={styles.boardCategoryBadge}>
                                <Tag size={10} style={{ marginRight: '3px' }} />
                                {todo.category}
                              </span>
                            )}
                            {todo.dueDate && (
                              <span className={`${styles.boardDueDate} ${getDueDateClass(todo.dueDate)}`}>
                                <Calendar size={10} style={{ marginRight: '3px' }} />
                                {formatDueDate(todo.dueDate)}
                              </span>
                            )}
                          </div>

                          {/* Subtask Progress bar inside Kanban card */}
                          {ratio && (
                            <div className={styles.progressSection}>
                              <div className={styles.progressMeta}>
                                <span><CheckSquare size={10} style={{ marginRight: '3px' }} /> {ratio.text} checklist</span>
                              </div>
                              <div className={styles.progressBar}>
                                <div className={styles.progressFill} style={{ width: `${ratio.percent}%` }} />
                              </div>
                            </div>
                          )}

                          <div className={styles.boardCardFooter}>
                            <div className={styles.footerStats}>
                              {mockMeta.comments > 0 && (
                                <span className={styles.statIcon}>
                                  <MessageSquare size={11} style={{ marginRight: '3px' }} />
                                  {mockMeta.comments}
                                </span>
                              )}
                              {mockMeta.attachments > 0 && (
                                <span className={styles.statIcon}>
                                  <Paperclip size={11} style={{ marginRight: '3px' }} />
                                  {mockMeta.attachments}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {col.id === 'todo' && status !== 'deleted' && status !== 'archived' && inlineColId !== col.id && (
                  <button className={styles.boardQuickAddTrigger} onClick={() => setInlineColId(col.id)}>
                    <Plus size={14} style={{ marginRight: '4px' }} /> Add task
                  </button>
                )}
              </div>
            );
          })}
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
                  onPin={() => handleBulkAction(todo.pinned ? 'unpin' : 'pin', null, [todo.id])}
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
                const res = await api.create({
                  ...data,
                  kanbanStatus: targetColumn,
                  completed: targetColumn === 'completed'
                });
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
