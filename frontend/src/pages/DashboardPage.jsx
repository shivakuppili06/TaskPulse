import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { List, CheckSquare, Archive, Trash2, Clock, Plus, Activity } from 'lucide-react';
import { api } from '../api.js';
import AddTodoModal from '../components/AddTodoModal.jsx';
import { useToast } from '../components/Toast.jsx';
import styles from './DashboardPage.module.css';

export default function DashboardPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [counts, setCounts] = useState({
    total: 0,
    active: 0,
    completed: 0,
    archived: 0,
    deleted: 0
  });
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [allTodosRes, archivedRes, deletedRes, activityRes] = await Promise.all([
        api.getAll({ limit: 9999 }),
        api.getAll({ status: 'archived', limit: 9999 }),
        api.getAll({ status: 'deleted', limit: 9999 }),
        api.getActivity()
      ]);

      const allTodos = allTodosRes.data || [];
      const activeCount = allTodos.filter(t => !t.completed && !t.archived && !t.deletedAt).length;
      const completedCount = allTodos.filter(t => t.completed && !t.archived && !t.deletedAt).length;

      setCounts({
        total: activeCount + completedCount,
        active: activeCount,
        completed: completedCount,
        archived: archivedRes.data?.length || 0,
        deleted: deletedRes.data?.length || 0
      });
      setActivities(activityRes.data || []);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateTask = async (taskData) => {
    try {
      await api.create(taskData);
      toast('Task created successfully', 'success');
      setModalOpen(false);
      fetchData();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const formatTime = (timeStr) => {
    const d = new Date(timeStr);
    return d.toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <h1>Dashboard</h1>
          <p>Task workspace activity and status overview.</p>
        </div>
        <button className={styles.quickAddBtn} onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Quick Task
        </button>
      </header>

      {/* KPI Cards */}
      <section className={styles.kpiGrid}>
        <div className={styles.kpiCard} onClick={() => navigate('/tasks')}>
          <div className={styles.kpiHeader}>
            <h3>Total Tasks</h3>
            <List size={18} className={styles.totalIcon} />
          </div>
          <span className={styles.kpiNumber}>{counts.total}</span>
        </div>

        <div className={styles.kpiCard} onClick={() => navigate('/tasks')}>
          <div className={styles.kpiHeader}>
            <h3>Active Tasks</h3>
            <Clock size={18} className={styles.activeIcon} />
          </div>
          <span className={styles.kpiNumber}>{counts.active}</span>
        </div>

        <div className={styles.kpiCard} onClick={() => navigate('/tasks?status=completed')}>
          <div className={styles.kpiHeader}>
            <h3>Completed</h3>
            <CheckSquare size={18} className={styles.completedIcon} />
          </div>
          <span className={styles.kpiNumber}>{counts.completed}</span>
        </div>

        <div className={styles.kpiCard} onClick={() => navigate('/tasks?status=archived')}>
          <div className={styles.kpiHeader}>
            <h3>Archived</h3>
            <Archive size={18} className={styles.archivedIcon} />
          </div>
          <span className={styles.kpiNumber}>{counts.archived}</span>
        </div>

        <div className={styles.kpiCard} onClick={() => navigate('/tasks?status=deleted')}>
          <div className={styles.kpiHeader}>
            <h3>Trash</h3>
            <Trash2 size={18} className={styles.trashIcon} />
          </div>
          <span className={styles.kpiNumber}>{counts.deleted}</span>
        </div>
      </section>

      {/* Widgets row */}
      <section className={styles.widgetsGrid}>
        {/* Activity log */}
        <div className={styles.widgetCard}>
          <div className={styles.widgetHeader}>
            <Activity size={16} style={{ marginRight: '8px', color: 'var(--accent)' }} />
            <h3>Recent Activity Log</h3>
          </div>
          <div className={styles.widgetContent}>
            {loading ? (
              <div className={styles.shimmerRow} />
            ) : activities.length === 0 ? (
              <div className={styles.emptyWidget}>No activity logs recorded.</div>
            ) : (
              <div className={styles.activityList}>
                {activities.slice(0, 5).map(act => (
                  <div key={act.id} className={styles.activityItem}>
                    <div className={styles.activityLeft}>
                      <span className={`${styles.actionLabel} ${styles[act.action]}`}>
                        {act.action}
                      </span>
                      <span className={styles.activityDesc}>
                        <strong>{act.todoTitle}</strong>
                      </span>
                    </div>
                    <span className={styles.activityTime}>{formatTime(act.timestamp)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {modalOpen && (
        <AddTodoModal onClose={() => setModalOpen(false)} onSave={handleCreateTask} />
      )}
    </div>
  );
}
