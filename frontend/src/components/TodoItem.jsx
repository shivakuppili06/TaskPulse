import styles from './TodoItem.module.css';

const PRIORITY_LABELS = { high: '↑ High', medium: '→ Medium', low: '↓ Low' };

function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diff = (target - today) / 86400000;
  if (diff < 0) return { label: `Overdue · ${d.toLocaleDateString()}`, overdue: true };
  if (diff === 0) return { label: 'Due today', today: true };
  if (diff === 1) return { label: 'Due tomorrow' };
  return { label: `Due ${d.toLocaleDateString()}` };
}

export default function TodoItem({ todo, selected, onSelect, onToggle, onEdit, onDelete, onView, style }) {
  const dueInfo = formatDate(todo.dueDate);
  const subtasksDone = todo.subtasks?.filter(s => s.done).length || 0;
  const subtasksTotal = todo.subtasks?.length || 0;

  return (
    <div
      className={`${styles.item} ${todo.completed ? styles.completed : ''} ${selected ? styles.selected : ''} fade-in`}
      style={style}
    >
      <input
        type="checkbox"
        className={styles.selectBox}
        checked={selected}
        onChange={onSelect}
        onClick={e => e.stopPropagation()}
      />

      <button
        className={`${styles.checkBtn} ${todo.completed ? styles.checked : ''}`}
        onClick={onToggle}
        title={todo.completed ? 'Mark incomplete' : 'Mark complete'}
      >
        {todo.completed && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20,6 9,17 4,12"/>
          </svg>
        )}
      </button>

      <div className={styles.content} onClick={onView} role="button" tabIndex={0}>
        <div className={styles.topRow}>
          <span className={styles.title}>{todo.title}</span>
          <span className={`${styles.priority} ${styles[todo.priority]}`}>
            {PRIORITY_LABELS[todo.priority]}
          </span>
        </div>

        {todo.description && (
          <p className={styles.desc}>{todo.description}</p>
        )}

        <div className={styles.meta}>
          {todo.category && todo.category !== 'General' && (
            <span className={styles.category}>{todo.category}</span>
          )}
          {todo.tags?.length > 0 && todo.tags.map(tag => (
            <span key={tag} className={styles.tag}>#{tag}</span>
          ))}
          {subtasksTotal > 0 && (
            <span className={styles.subtasksBadge}>
              ☐ {subtasksDone}/{subtasksTotal}
            </span>
          )}
          {dueInfo && (
            <span className={`${styles.due} ${dueInfo.overdue ? styles.overdue : dueInfo.today ? styles.today : ''}`}>
              ⏰ {dueInfo.label}
            </span>
          )}
        </div>
      </div>

      <div className={styles.actions}>
        <button className={styles.actionBtn} onClick={onEdit} title="Edit">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={onDelete} title="Delete">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
