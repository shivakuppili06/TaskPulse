import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, Tag, Eye, Edit, Archive, Trash2, Pin } from 'lucide-react';
import styles from './TodoItem.module.css';

const PRIORITY_LABELS = { high: 'High', medium: 'Medium', low: 'Low' };

function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(d); target.setHours(0, 0, 0, 0);
  const diff = (target - today) / 86400000;
  if (diff < 0) return { label: `Overdue · ${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`, overdue: true };
  if (diff === 0) return { label: 'Due today', today: true };
  if (diff === 1) return { label: 'Due tomorrow', soon: true };
  return { label: `Due ${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`, future: true };
}

export default function TodoItem({ todo, selected, onSelect, onToggle, onEdit, onDelete, onArchive, onRestore, onView, onPin, viewMode, style }) {
  const dueInfo = formatDate(todo.dueDate);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id });

  const dragStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : 'auto',
    ...style,
  };

  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      className={`${styles.item} ${todo.completed ? styles.completed : ''} ${selected ? styles.selected : ''} ${todo.pinned ? styles.pinned : ''} ${viewMode === 'grid' ? styles.gridItem : ''} ${isDragging ? styles.dragging : ''} fade-in`}
    >
      {todo.pinned && <div className={styles.pinBar} />}

      <div className={styles.topRow}>
        <span
          className={styles.dragHandle}
          {...attributes}
          {...listeners}
          title="Drag to reorder"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/>
            <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
            <circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/>
          </svg>
        </span>
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
          {todo.deletedAt ? (
            <button className={styles.actionBtn} onClick={onRestore} title="Restore">
              Restore
            </button>
          ) : (
            <>
              <button className={`${styles.actionBtn} ${todo.pinned ? styles.pinActive : ''}`} onClick={onPin} title={todo.pinned ? 'Unpin' : 'Pin task'}>
                <Pin size={13} />
              </button>
              <button className={styles.actionBtn} onClick={onArchive} title={todo.archived ? "Unarchive" : "Archive"}>
                <Archive size={13} />
              </button>
              <button className={styles.actionBtn} onClick={onEdit} title="Edit">
                <Edit size={13} />
              </button>
            </>
          )}
          <button className={styles.actionBtn} onClick={onView} title="View Details">
            <Eye size={13} />
          </button>
          <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={onDelete} title="Delete">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className={styles.content} onClick={onView} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onView()}>
        <span className={styles.title}>{todo.title}</span>
        {todo.description && <p className={styles.desc}>{todo.description}</p>}
      </div>

      {/* Simplified Footer details */}
      <div className={styles.footer}>
        <div className={styles.footerLeft}>
          {todo.category && todo.category !== 'General' && (
            <span className={styles.categoryBadge}>
              <Tag size={10} style={{ marginRight: '4px' }} />
              {todo.category}
            </span>
          )}
          {dueInfo && (
            <span className={`${styles.dueDateChip} ${dueInfo.overdue ? styles.overdue : dueInfo.today ? styles.today : dueInfo.soon ? styles.soon : styles.future}`}>
              <Calendar size={10} style={{ marginRight: '4px' }} />
              {dueInfo.label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
