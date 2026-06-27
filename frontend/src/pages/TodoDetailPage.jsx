import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useToast } from '../components/Toast.jsx';
import styles from './TodoDetailPage.module.css';

const PRIORITY_CONFIG = {
  high: { label: 'High', color: 'var(--high)', bg: 'var(--high-soft)' },
  medium: { label: 'Medium', color: 'var(--medium)', bg: 'var(--medium-soft)' },
  low: { label: 'Low', color: 'var(--low)', bg: 'var(--low-soft)' },
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

function dueBadge(dueDate, completed) {
  if (!dueDate) return null;
  if (completed) return { text: 'Completed on time', cls: 'done' };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(dueDate); d.setHours(0, 0, 0, 0);
  const diff = (d - today) / 86400000;
  if (diff < 0) return { text: `Overdue by ${Math.abs(Math.floor(diff))} day(s)`, cls: 'overdue' };
  if (diff === 0) return { text: 'Due today!', cls: 'today' };
  if (diff <= 3) return { text: `Due in ${Math.floor(diff)} day(s)`, cls: 'soon' };
  return { text: `Due ${fmtDate(dueDate)}`, cls: '' };
}

export default function TodoDetailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const id = params.get('id');

  const [todo, setTodo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [newSubtask, setNewSubtask] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) { setError('No todo ID provided in URL'); setLoading(false); return; }
    api.getById(id)
      .then(d => { setTodo(d.data); setNotes(d.data.notes || ''); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function toggleComplete() {
    const updated = { ...todo, completed: !todo.completed, updatedAt: new Date().toISOString() };
    if (!todo.completed) updated.completedAt = new Date().toISOString();
    setTodo(updated);
    try {
      const res = await api.patch(id, { completed: !todo.completed });
      setTodo(res.data);
    } catch (e) {
      setTodo(todo);
      setError(e.message);
    }
  }

  async function saveNotes() {
    setSaving(true);
    try {
      const res = await api.patch(id, { notes });
      setTodo(res.data);
      setEditingNotes(false);
      toast('Notes saved', 'success');
    } catch (e) { setError(e.message); toast(e.message, 'error'); }
    finally { setSaving(false); }
  }

  async function addSubtask() {
    if (!newSubtask.trim()) return;
    const subtask = { id: Date.now().toString(), text: newSubtask.trim(), done: false };
    const subtasks = [...(todo.subtasks || []), subtask];
    setTodo(prev => ({ ...prev, subtasks }));
    setNewSubtask('');
    try {
      const res = await api.patch(id, { subtasks });
      setTodo(res.data);
    } catch (e) { setError(e.message); }
  }

  async function toggleSubtask(stId) {
    const subtasks = todo.subtasks.map(s => s.id === stId ? { ...s, done: !s.done } : s);
    setTodo(prev => ({ ...prev, subtasks }));
    try {
      const res = await api.patch(id, { subtasks });
      setTodo(res.data);
    } catch (e) { setError(e.message); }
  }

  async function deleteSubtask(stId) {
    const subtasks = todo.subtasks.filter(s => s.id !== stId);
    setTodo(prev => ({ ...prev, subtasks }));
    try {
      const res = await api.patch(id, { subtasks });
      setTodo(res.data);
    } catch (e) { setError(e.message); }
  }

  async function deleteTodo() {
    if (!confirm('Delete this task permanently?')) return;
    try {
      await api.delete(id);
      toast('Task deleted', 'success');
      navigate('/');
    } catch (e) { setError(e.message); toast(e.message, 'error'); }
  }

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
  const due = dueBadge(todo.dueDate, todo.completed);
  const doneSubtasks = todo.subtasks?.filter(s => s.done).length || 0;
  const totalSubtasks = todo.subtasks?.length || 0;
  const progress = totalSubtasks ? Math.round((doneSubtasks / totalSubtasks) * 100) : 0;

  return (
    <main className={`page-container ${styles.page}`}>
      {/* Breadcrumb */}
      <button className={styles.backBtn} onClick={() => navigate('/')}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        All Tasks
      </button>

      {error && (
        <div className={styles.errorBanner}>⚠ {error}</div>
      )}

      {/* Hero card */}
      <div className={styles.heroCard}>
        <div className={styles.heroTop}>
          <div className={styles.badges}>
            <span className={styles.priorityBadge} style={{ color: pri.color, background: pri.bg }}>
              {pri.label} Priority
            </span>
            {todo.category && <span className={styles.categoryBadge}>{todo.category}</span>}
            {due && (
              <span className={`${styles.dueBadge} ${styles[due.cls]}`}>
                ⏰ {due.text}
              </span>
            )}
          </div>
          <div className={styles.heroActions}>
            <button
              className={`${styles.completeBtn} ${todo.completed ? styles.completedBtn : ''}`}
              onClick={toggleComplete}
            >
              {todo.completed ? '↩ Mark Incomplete' : '✓ Mark Complete'}
            </button>
            <button className={styles.deleteBtn} onClick={deleteTodo}>Delete</button>
          </div>
        </div>

        <h1 className={`${styles.heroTitle} ${todo.completed ? styles.strikethrough : ''}`}>
          {todo.title}
        </h1>

        {todo.description && (
          <p className={styles.heroDesc}>{todo.description}</p>
        )}

        {todo.tags?.length > 0 && (
          <div className={styles.tagsRow}>
            {todo.tags.map(tag => (
              <span key={tag} className={styles.tag}>#{tag}</span>
            ))}
          </div>
        )}
      </div>

      <div className={styles.grid}>
        {/* Left column */}
        <div className={styles.col}>
          {/* Subtasks */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Subtasks</h2>
              {totalSubtasks > 0 && (
                <span className={styles.progressLabel}>{doneSubtasks}/{totalSubtasks}</span>
              )}
            </div>

            {totalSubtasks > 0 && (
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${progress}%` }} />
              </div>
            )}

            <div className={styles.subtaskList}>
              {todo.subtasks?.map(s => (
                <div key={s.id} className={`${styles.subtask} ${s.done ? styles.subtaskDone : ''}`}>
                  <button
                    className={`${styles.subtaskCheck} ${s.done ? styles.subtaskChecked : ''}`}
                    onClick={() => toggleSubtask(s.id)}
                  >
                    {s.done && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20,6 9,17 4,12"/>
                      </svg>
                    )}
                  </button>
                  <span className={styles.subtaskText}>{s.text}</span>
                  <button className={styles.subtaskDel} onClick={() => deleteSubtask(s.id)}>×</button>
                </div>
              ))}
            </div>

            <div className={styles.addSubtask}>
              <input
                className={styles.subtaskInput}
                placeholder="Add a subtask…"
                value={newSubtask}
                onChange={e => setNewSubtask(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addSubtask()}
              />
              <button className={styles.addSubtaskBtn} onClick={addSubtask}>Add</button>
            </div>
          </div>

          {/* Notes */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Notes</h2>
              {!editingNotes ? (
                <button className={styles.editNotes} onClick={() => setEditingNotes(true)}>
                  {todo.notes ? 'Edit' : '+ Add'}
                </button>
              ) : (
                <div className={styles.noteActions}>
                  <button className={styles.cancelNote} onClick={() => { setEditingNotes(false); setNotes(todo.notes || ''); }}>
                    Cancel
                  </button>
                  <button className={styles.saveNote} onClick={saveNotes} disabled={saving}>
                    {saving ? '…' : 'Save'}
                  </button>
                </div>
              )}
            </div>

            {editingNotes ? (
              <textarea
                className={styles.notesTextarea}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add notes about this task…"
                rows={5}
                autoFocus
              />
            ) : (
              <p className={styles.notesText}>
                {todo.notes || <span className={styles.noNotes}>No notes yet.</span>}
              </p>
            )}
          </div>
        </div>

        {/* Right column – metadata */}
        <div className={styles.col}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Details</h2>
            <div className={styles.metaList}>
              <div className={styles.metaItem}>
                <span className={styles.metaKey}>Status</span>
                <span className={`${styles.metaVal} ${todo.completed ? styles.statusDone : styles.statusActive}`}>
                  {todo.completed ? '✓ Completed' : '● Active'}
                </span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaKey}>Priority</span>
                <span className={styles.metaVal} style={{ color: pri.color }}>{pri.label}</span>
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
                  <span className={styles.metaKey}>Completed</span>
                  <span className={`${styles.metaVal} ${styles.statusDone}`}>{fmt(todo.completedAt)}</span>
                </div>
              )}
              <div className={styles.metaItem}>
                <span className={styles.metaKey}>Task ID</span>
                <span className={`${styles.metaVal} ${styles.idVal}`}>{todo.id}</span>
              </div>
            </div>
          </div>

          {todo.tags?.length > 0 && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Tags</h2>
              <div className={styles.tagsGrid}>
                {todo.tags.map(tag => (
                  <span key={tag} className={styles.tagFull}>#{tag}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
