import { useState, useEffect, useRef } from 'react';
import styles from './AddTodoModal.module.css';

const CATEGORIES = ['General', 'Work', 'Personal', 'Shopping', 'Health', 'Learning', 'Finance', 'Other'];

export default function AddTodoModal({ todo, onClose, onSave }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [category, setCategory] = useState('General');
  const [tagsInput, setTagsInput] = useState('');
  const [tags, setTags] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const titleRef = useRef(null);

  useEffect(() => {
    if (todo) {
      setTitle(todo.title || '');
      setDescription(todo.description || '');
      setPriority(todo.priority || 'medium');
      setDueDate(todo.dueDate ? todo.dueDate.slice(0, 10) : '');
      setCategory(todo.category || 'General');
      setTags(todo.tags || []);
    }
    setTimeout(() => titleRef.current?.focus(), 50);
  }, [todo]);

  function addTag(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = tagsInput.trim().replace(/^#/, '');
      if (val && !tags.includes(val)) setTags(prev => [...prev, val]);
      setTagsInput('');
    }
    if (e.key === 'Backspace' && !tagsInput && tags.length) {
      setTags(prev => prev.slice(0, -1));
    }
  }

  async function handleSave() {
    if (!title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    try {
      await onSave({ title, description, priority, dueDate: dueDate || null, category, tags });
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  }

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className={styles.backdrop} onClick={handleBackdrop}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{todo ? 'Edit Task' : 'New Task'}</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div className={styles.body}>
          <div className={styles.field}>
            <label>Title <span className={styles.req}>*</span></label>
            <input
              ref={titleRef}
              className={`${styles.input} ${error && !title ? styles.inputError : ''}`}
              value={title}
              onChange={e => { setTitle(e.target.value); setError(''); }}
              placeholder="What needs to be done?"
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
          </div>

          <div className={styles.field}>
            <label>Description</label>
            <textarea
              className={styles.textarea}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add details (optional)"
              rows={3}
            />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label>Priority</label>
              <div className={styles.priorityGroup}>
                {['high', 'medium', 'low'].map(p => (
                  <button
                    key={p}
                    className={`${styles.priorityBtn} ${styles[p]} ${priority === p ? styles.activePriority : ''}`}
                    onClick={() => setPriority(p)}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.field}>
              <label>Due Date</label>
              <input
                type="date"
                className={styles.input}
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label>Category</label>
              <select className={styles.select} value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div className={styles.field}>
              <label>Tags</label>
              <div className={styles.tagsWrap}>
                {tags.map(t => (
                  <span key={t} className={styles.tagChip}>
                    #{t}
                    <button onClick={() => setTags(prev => prev.filter(x => x !== t))}>×</button>
                  </span>
                ))}
                <input
                  className={styles.tagsInput}
                  value={tagsInput}
                  onChange={e => setTagsInput(e.target.value)}
                  onKeyDown={addTag}
                  placeholder={tags.length ? '' : 'Add tags (Enter)'}
                />
              </div>
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : todo ? 'Save Changes' : 'Add Task'}
          </button>
        </div>
      </div>
    </div>
  );
}
