import styles from './TodoItem.module.css';

const PRIORITY_LABELS = { high: '↑ High', medium: '→ Med', low: '↓ Low' };

function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(d); target.setHours(0, 0, 0, 0);
  const diff = (target - today) / 86400000;
  if (diff < 0) return { label: `Overdue · ${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`, overdue: true };
  if (diff === 0) return { label: 'Due today', today: true };
  if (diff === 1) return { label: 'Due tomorrow', soon: true };
  return { label: `Due ${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` };
}

export default function TodoItem({ todo, selected, onSelect, onToggle, onEdit, onDelete, onView, onPin, viewMode, style }) {
  const dueInfo = formatDate(todo.dueDate);
  const subtasksDone = todo.subtasks?.filter(s => s.done).length || 0;
  const subtasksTotal = todo.subtasks?.length || 0;
  const progress = subtasksTotal ? Math.round((subtasksDone / subtasksTotal) * 100) : 0;

  return (
    <div
      className={`${styles.item} ${todo.completed ? styles.completed : ''} ${selected ? styles.selected : ''} ${todo.pinned ? styles.pinned : ''} ${viewMode === 'grid' ? styles.gridItem : ''} fade-in`}
      style={style}
    >
      {/* Pin indicator */}
      {todo.pinned && <div className={styles.pinBar} />}

      <div className={styles.topRow}>
        <input type="checkbox" className={styles.selectBox} checked={selected} onChange={onSelect} onClick={e => e.stopPropagation()} />
        <button className={`${styles.checkBtn} ${todo.completed ? styles.checked : ''}`} onClick={onToggle} title={todo.completed ? 'Mark incomplete' : 'Mark complete'}>
          {todo.completed && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20,6 9,17 4,12"/>
            </svg>
          )}
        </button>
        <span className={`${styles.priority} ${styles[todo.priority]}`}>{PRIORITY_LABELS[todo.priority]}</span>
        <div className={styles.itemActions}>
          <button className={`${styles.actionBtn} ${todo.pinned ? styles.pinActive : ''}`} onClick={onPin} title={todo.pinned ? 'Unpin' : 'Pin task'}>
            📌
          </button>
          <button className={styles.actionBtn} onClick={onEdit} title="Edit">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={onDelete} title="Delete">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
        </div>
      </div>

      <div className={styles.content} onClick={onView} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onView()}>
        <span className={styles.title}>{todo.title}</span>
        {todo.description && <p className={styles.desc}>{todo.description}</p>}

        {/* Subtask progress */}
        {subtasksTotal > 0 && (
          <div className={styles.subtaskProgress}>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${progress}%` }} />
            </div>
            <span className={styles.progressLabel}>{subtasksDone}/{subtasksTotal}</span>
          </div>
        )}

        <div className={styles.meta}>
          {todo.category && todo.category !== 'General' && <span className={styles.category}>{todo.category}</span>}
          {todo.tags?.slice(0, 2).map(tag => <span key={tag} className={styles.tag}>#{tag}</span>)}
          {todo.tags?.length > 2 && <span className={styles.tag}>+{todo.tags.length - 2}</span>}
          {todo.timeEstimate && <span className={styles.timeEst}>⏱ {todo.timeEstimate}m</span>}
          {dueInfo && (
            <span className={`${styles.due} ${dueInfo.overdue ? styles.overdue : dueInfo.today ? styles.today : dueInfo.soon ? styles.soon : ''}`}>
              {dueInfo.overdue ? '🔴' : dueInfo.today ? '🟡' : '📅'} {dueInfo.label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
