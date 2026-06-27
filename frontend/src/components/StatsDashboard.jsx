import styles from './StatsDashboard.module.css';

/**
 * StatsDashboard — always visible, derives stats from the `todos` prop
 * so it updates instantly on every action without an API round-trip.
 */
export default function StatsDashboard({ todos = [] }) {
  const now = new Date();
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(now - 7 * 86400000);

  const total = todos.length;
  const completed = todos.filter(t => t.completed).length;
  const active = total - completed;
  const overdue = todos.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < today).length;
  const dueToday = todos.filter(t => {
    if (!t.dueDate || t.completed) return false;
    const d = new Date(t.dueDate); d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  }).length;
  const completionRate = total ? Math.round((completed / total) * 100) : 0;
  const completedThisWeek = todos.filter(t => t.completedAt && new Date(t.completedAt) >= weekAgo).length;

  const byPriority = { high: 0, medium: 0, low: 0 };
  const byCategory = {};
  todos.forEach(t => {
    if (byPriority[t.priority] !== undefined) byPriority[t.priority]++;
    const cat = t.category || 'General';
    byCategory[cat] = (byCategory[cat] || 0) + 1;
  });

  const cats = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxCat = Math.max(...cats.map(([, v]) => v), 1);

  return (
    <div className={styles.wrap}>
      <div className={styles.panel}>
        {/* KPI row */}
        <div className={styles.kpis}>
          <div className={styles.kpi}>
            <span className={styles.kpiNum}>{total}</span>
            <span className={styles.kpiLabel}>Total</span>
          </div>
          <div className={`${styles.kpi} ${styles.kpiActive}`}>
            <span className={styles.kpiNum}>{active}</span>
            <span className={styles.kpiLabel}>Active</span>
          </div>
          <div className={`${styles.kpi} ${styles.kpiDone}`}>
            <span className={styles.kpiNum}>{completed}</span>
            <span className={styles.kpiLabel}>Done</span>
          </div>
          <div className={`${styles.kpi} ${overdue > 0 ? styles.kpiOverdue : ''}`}>
            <span className={styles.kpiNum}>{overdue}</span>
            <span className={styles.kpiLabel}>Overdue</span>
          </div>
          <div className={`${styles.kpi} ${styles.kpiToday}`}>
            <span className={styles.kpiNum}>{dueToday}</span>
            <span className={styles.kpiLabel}>Due Today</span>
          </div>
        </div>

        <div className={styles.sections}>
          {/* Completion donut */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Completion Rate</h3>
            <div className={styles.donutWrap}>
              <svg viewBox="0 0 80 80" className={styles.donut}>
                <circle cx="40" cy="40" r="30" fill="none" stroke="var(--border)" strokeWidth="10"/>
                <circle
                  cx="40" cy="40" r="30"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="10"
                  strokeDasharray={`${completionRate * 1.885} 188.5`}
                  strokeLinecap="round"
                  transform="rotate(-90 40 40)"
                  style={{ transition: 'stroke-dasharray 0.6s ease' }}
                />
              </svg>
              <div className={styles.donutCenter}>
                <span className={styles.donutNum}>{completionRate}%</span>
              </div>
            </div>
            <p className={styles.weekNote}>+{completedThisWeek} this week</p>
          </div>

          {/* Priority breakdown */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>By Priority</h3>
            <div className={styles.priorityBars}>
              {[['high', 'var(--high)'], ['medium', 'var(--medium)'], ['low', 'var(--low)']].map(([p, color]) => (
                <div key={p} className={styles.barRow}>
                  <span className={styles.barLabel}>{p.charAt(0).toUpperCase() + p.slice(1)}</span>
                  <div className={styles.barTrack}>
                    <div
                      className={styles.barFill}
                      style={{ width: `${total ? (byPriority[p] / total) * 100 : 0}%`, background: color }}
                    />
                  </div>
                  <span className={styles.barCount}>{byPriority[p]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top categories */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Top Categories</h3>
            <div className={styles.catList}>
              {cats.length === 0 && <span className={styles.empty}>No tasks yet</span>}
              {cats.map(([cat, count]) => (
                <div key={cat} className={styles.catRow}>
                  <span className={styles.catName}>{cat}</span>
                  <div className={styles.catBarTrack}>
                    <div className={styles.catBarFill} style={{ width: `${(count / maxCat) * 100}%` }} />
                  </div>
                  <span className={styles.catCount}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
