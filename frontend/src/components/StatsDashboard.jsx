import { useState, useEffect } from 'react';
import { api } from '../api.js';
import styles from './StatsDashboard.module.css';

export default function StatsDashboard() {
  const [stats, setStats] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    api.getStats().then(d => setStats(d.data)).catch(() => {});
  }, []);

  if (!stats) return null;

  const cats = Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxCat = Math.max(...cats.map(([, v]) => v), 1);

  return (
    <div className={styles.wrap}>
      <button className={styles.toggle} onClick={() => setExpanded(e => !e)}>
        <span className={styles.toggleLabel}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
          </svg>
          Dashboard
        </span>
        <span className={styles.chevron} style={{ transform: expanded ? 'rotate(180deg)' : 'none' }}>▾</span>
      </button>

      {expanded && (
        <div className={styles.panel}>
          {/* KPI row */}
          <div className={styles.kpis}>
            <div className={styles.kpi}>
              <span className={styles.kpiNum}>{stats.total}</span>
              <span className={styles.kpiLabel}>Total</span>
            </div>
            <div className={`${styles.kpi} ${styles.kpiActive}`}>
              <span className={styles.kpiNum}>{stats.active}</span>
              <span className={styles.kpiLabel}>Active</span>
            </div>
            <div className={`${styles.kpi} ${styles.kpiDone}`}>
              <span className={styles.kpiNum}>{stats.completed}</span>
              <span className={styles.kpiLabel}>Done</span>
            </div>
            <div className={`${styles.kpi} ${stats.overdue > 0 ? styles.kpiOverdue : ''}`}>
              <span className={styles.kpiNum}>{stats.overdue}</span>
              <span className={styles.kpiLabel}>Overdue</span>
            </div>
            <div className={`${styles.kpi} ${styles.kpiToday}`}>
              <span className={styles.kpiNum}>{stats.dueToday}</span>
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
                    strokeDasharray={`${stats.completionRate * 1.885} 188.5`}
                    strokeLinecap="round"
                    transform="rotate(-90 40 40)"
                    style={{ transition: 'stroke-dasharray 0.6s ease' }}
                  />
                </svg>
                <div className={styles.donutCenter}>
                  <span className={styles.donutNum}>{stats.completionRate}%</span>
                </div>
              </div>
              <p className={styles.weekNote}>+{stats.completedThisWeek} this week</p>
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
                        style={{ width: `${stats.total ? (stats.byPriority[p] / stats.total) * 100 : 0}%`, background: color }}
                      />
                    </div>
                    <span className={styles.barCount}>{stats.byPriority[p]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top categories */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Top Categories</h3>
              <div className={styles.catList}>
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
      )}
    </div>
  );
}
