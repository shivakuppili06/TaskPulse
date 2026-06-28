import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Edit, Archive, Trash2, RotateCcw } from 'lucide-react';
import { api } from '../api.js';
import { useToast } from '../components/Toast.jsx';
import AddTodoModal from '../components/AddTodoModal.jsx';
import styles from './TodoDetailPage.module.css';

const PRIORITY_CONFIG = {
  high: { label: 'High', color: 'var(--high)', bg: 'var(--high-soft)' },
  medium: { label: 'Medium', color: 'var(--medium)', bg: 'var(--medium-soft)' },
  low: { label: 'Low', color: 'var(--low)', bg: 'var(--low-soft)' },
};

const KANBAN_STATUS_LABELS = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  completed: 'Completed'
};

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export default function TodoDetailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const id = params.get('id');

  const [todo, setTodo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!id) { setError('No todo ID provided in URL'); setLoading(false); return; }
    api.getById(id)
      .then(d => setTodo(d.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function toggleComplete() {
    const isCompleted = !todo.completed;
    const nextStatus = isCompleted ? 'completed' : 'todo';
    try {
      const res = await api.patch(id, { 
        completed: isCompleted,
        kanbanStatus: nextStatus
      });
      setTodo(res.data);
      toast(isCompleted ? 'Task completed! 🎉' : 'Marked as active', 'success');
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  async function deleteTodo() {
    const isHardDelete = !!todo?.deletedAt;
    const msg = isHardDelete 
      ? 'Delete this task permanently? This action cannot be undone.' 
      : 'Move this task to Trash?';

    if (!confirm(msg)) return;
    try {
      await api.delete(id);
      toast(isHardDelete ? 'Task permanently deleted' : 'Task moved to Trash', 'success');
      navigate('/');
    } catch (e) { toast(e.message, 'error'); }
  }

  async function restoreTodo() {
    try {
      await api.bulkAction('restore', [id]);
      toast('Task restored', 'success');
      navigate('/');
    } catch (e) { toast(e.message, 'error'); }
  }

  async function handleArchive() {
    const updatedArchived = !todo.archived;
    try {
      await api.bulkAction(updatedArchived ? 'archive' : 'unarchive', [id]);
      toast(updatedArchived ? 'Task archived' : 'Task unarchived', 'success');
      navigate('/');
    } catch (e) { toast(e.message, 'error'); }
  }

  const handleSave = async (data) => {
    try {
      const res = await api.update(id, data);
      setTodo(res.data);
      setShowModal(false);
      toast('Task updated', 'success');
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  if (loading) return (
    <div className={styles.center}>
      <div className={styles.spinner} />
      <span>Loading task…</span>
    </div>
  );

  if (error && !todo) return (
    <div className={styles.center}>
      <p className={styles.errorText}>⚠ {error}</p>
      <button className={styles.backLink} onClick={() => navigate('/')}>← Back to all tasks</button>
    </div>
  );

  if (!todo) return null;

  const pri = PRIORITY_CONFIG[todo.priority] || PRIORITY_CONFIG.medium;

  return (
    <main className={styles.page}>
      {/* Breadcrumb */}
      <button className={styles.backBtn} onClick={() => navigate('/tasks')}>
        <ChevronLeft size={16} /> All Tasks
      </button>

      {/* Hero card */}
      <div className={styles.heroCard}>
        <div className={styles.heroTop}>
          <div className={styles.badges}>
            <span className={styles.priorityBadge} style={{ color: pri.color, background: pri.bg }}>
              {pri.label} Priority
            </span>
            {todo.category && <span className={styles.categoryBadge}>{todo.category}</span>}
            <span className={styles.statusBadge}>
              {KANBAN_STATUS_LABELS[todo.kanbanStatus] || (todo.completed ? 'Completed' : 'To Do')}
            </span>
          </div>

          <div className={styles.heroActions}>
            {todo.deletedAt ? (
              <>
                <button className={styles.restoreBtn} onClick={restoreTodo}>
                  <RotateCcw size={14} style={{ marginRight: '6px' }} /> Restore Task
                </button>
                <button className={styles.deleteBtn} onClick={deleteTodo}>
                  Delete Permanently
                </button>
              </>
            ) : (
              <>
                <button
                  className={`${styles.completeBtn} ${todo.completed ? styles.completedBtn : ''}`}
                  onClick={toggleComplete}
                >
                  {todo.completed ? 'Mark Incomplete' : 'Mark Complete'}
                </button>
                <button className={styles.editBtn} onClick={() => setShowModal(true)}>
                  <Edit size={14} /> Edit
                </button>
                <button className={styles.archiveBtn} onClick={handleArchive}>
                  <Archive size={14} /> {todo.archived ? 'Unarchive' : 'Archive'}
                </button>
                <button className={styles.deleteBtn} onClick={deleteTodo}>
                  <Trash2 size={14} /> Delete
                </button>
              </>
            )}
          </div>
        </div>

        <h1 className={`${styles.heroTitle} ${todo.completed ? styles.strikethrough : ''}`}>
          {todo.title}
        </h1>

        {todo.description && (
          <p className={styles.heroDesc}>{todo.description}</p>
        )}
      </div>

      {/* Details Grid */}
      <div className={styles.grid}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Task Properties</h2>
          <div className={styles.metaList}>
            <div className={styles.metaItem}>
              <span className={styles.metaKey}>Status</span>
              <span className={`${styles.metaVal} ${todo.completed ? styles.statusDone : styles.statusActive}`}>
                {todo.completed ? 'Completed' : 'Active'}
              </span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaKey}>Priority</span>
              <span className={styles.metaVal} style={{ color: pri.color, fontWeight: 600 }}>{pri.label}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaKey}>Category</span>
              <span className={styles.metaVal}>{todo.category || 'General'}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaKey}>Due Date</span>
              <span className={styles.metaVal}>{fmtDate(todo.dueDate)}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaKey}>Created</span>
              <span className={styles.metaVal}>{fmt(todo.createdAt)}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaKey}>Updated</span>
              <span className={styles.metaVal}>{fmt(todo.updatedAt)}</span>
            </div>
            {todo.completedAt && (
              <div className={styles.metaItem}>
                <span className={styles.metaKey}>Completed At</span>
                <span className={`${styles.metaVal} ${styles.statusDone}`}>{fmt(todo.completedAt)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <AddTodoModal
          todo={todo}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}
    </main>
  );
}
