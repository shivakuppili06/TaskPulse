import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from './ThemeContext.jsx';
import { api } from '../api.js';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  const { pathname, search } = useLocation();
  const { theme, toggle } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  // Task Counts state
  const [counts, setCounts] = useState({
    active: 0,
    archived: 0,
    deleted: 0
  });

  const query = new URLSearchParams(search);
  const statusParam = query.get('status');

  const isActive = (path) => pathname === path;

  // Fetch counts periodically
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const res = await api.getStats();
        const s = res.data || { total: 0, active: 0, completed: 0, archived: 0, deleted: 0 };
        
        setCounts({
          active: s.active,
          archived: s.archived,
          deleted: s.deleted
        });
      } catch (e) {
        console.error('Failed to fetch sidebar counts:', e);
      }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 15000);
    return () => clearInterval(interval);
  }, [pathname]);

  const navItems = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      active: isActive('/dashboard'),
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="9"></rect>
          <rect x="14" y="3" width="7" height="5"></rect>
          <rect x="14" y="12" width="7" height="9"></rect>
          <rect x="3" y="16" width="7" height="5"></rect>
        </svg>
      )
    },
    {
      label: 'Tasks',
      path: '/my-tasks',
      active: isActive('/my-tasks'),
      count: counts.active,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" y1="6" x2="21" y2="6"></line>
          <line x1="8" y1="12" x2="21" y2="12"></line>
          <line x1="8" y1="18" x2="21" y2="18"></line>
          <line x1="3" y1="6" x2="3.01" y2="6"></line>
          <line x1="3" y1="12" x2="3.01" y2="12"></line>
          <line x1="3" y1="18" x2="3.01" y2="18"></line>
        </svg>
      )
    },
    {
      label: 'Archive',
      path: '/tasks-archive',
      active: isActive('/tasks-archive'),
      count: counts.archived,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="21 8 21 21 3 21 3 8"></polyline>
          <rect x="1" y="3" width="22" height="5"></rect>
          <line x1="10" y1="12" x2="14" y2="12"></line>
        </svg>
      )
    },
    {
      label: 'Trash',
      path: '/tasks-deleted',
      active: isActive('/tasks-deleted'),
      count: counts.deleted,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          <line x1="10" y1="11" x2="10" y2="17"></line>
          <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
      )
    },
    {
      label: 'Settings',
      path: '/settings',
      active: isActive('/settings'),
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      )
    }
  ];

  return (
    <>
      <button 
        className={styles.mobileToggle} 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle Menu"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {isOpen ? (
            <line x1="18" y1="6" x2="6" y2="18"></line>
          ) : (
            <>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </>
          )}
        </svg>
      </button>

      <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
        <div className={styles.top}>
          <Link to="/" className={styles.brand} onClick={() => setIsOpen(false)}>
            <span className={styles.logo}>⬡</span>
            <span className={styles.brandName}>Taska</span>
          </Link>
        </div>

        {/* Workspace Quick Profile */}
        <div className={styles.profileHeader}>
          <div className={styles.avatar}>T</div>
          <div className={styles.profileMeta}>
            <h4>Taska Workspace</h4>
            <p>Personal Board</p>
          </div>
        </div>

        <nav className={styles.nav}>
          {navItems.map((item) => (
            <Link 
              key={item.label} 
              to={item.path} 
              className={`${styles.link} ${item.active ? styles.active : ''}`}
              onClick={() => setIsOpen(false)}
            >
              <span className={styles.icon}>{item.icon}</span>
              <span className={styles.label}>{item.label}</span>
              {item.count !== undefined && item.count > 0 && (
                <span className={styles.badge}>{item.count}</span>
              )}
            </Link>
          ))}
        </nav>

        {/* Footer section simplified */}
      </aside>

      {isOpen && <div className={styles.overlay} onClick={() => setIsOpen(false)}></div>}
    </>
  );
}
