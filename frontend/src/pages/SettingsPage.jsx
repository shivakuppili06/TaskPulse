import { useState } from 'react';
import { useTheme } from '../components/ThemeContext.jsx';
import { useToast } from '../components/Toast.jsx';
import { api } from '../api.js';
import styles from './SettingsPage.module.css';

export default function SettingsPage() {
  const { theme, toggle } = useTheme();
  const toast = useToast();

  const [username, setUsername] = useState('Satya');
  const [email, setEmail] = useState('satya@example.com');
  const [defaultView, setDefaultView] = useState(() => localStorage.getItem('viewMode') || 'list');

  const handleSaveProfile = (e) => {
    e.preventDefault();
    toast.show('Profile updated successfully (local simulation)', 'success');
  };

  const handleViewChange = (e) => {
    const val = e.target.value;
    setDefaultView(val);
    localStorage.setItem('viewMode', val);
    toast.show(`Default view set to ${val}`, 'success');
  };

  const handleResetData = async () => {
    if (!window.confirm('WARNING: This will permanently delete all tasks in the database. Are you sure?')) return;
    try {
      const res = await api.getAll();
      const ids = (res.data || []).map(t => t.id);
      if (ids.length > 0) {
        await api.deleteMany(ids);
      }
      toast.show('All tasks cleared and database reset', 'success');
    } catch (err) {
      toast.show(`Reset failed: ${err.message}`, 'error');
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <h1>Settings</h1>
          <p>Configure and manage your Taska workspace.</p>
        </div>
      </header>

      <div className={styles.contentGrid}>
        {/* Profile Card */}
        <section className={styles.card}>
          <h3>User Profile</h3>
          <form onSubmit={handleSaveProfile} className={styles.form}>
            <div className={styles.field}>
              <label>Full Name</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <button type="submit" className={styles.saveBtn}>Save Settings</button>
          </form>
        </section>

        {/* Preferences Card */}
        <section className={styles.card}>
          <h3>Preferences</h3>
          <div className={styles.prefList}>
            <div className={styles.prefItem}>
              <div className={styles.prefMeta}>
                <h4>Color Theme</h4>
                <p>Toggle between Light and Dark workspace appearance.</p>
              </div>
              <button className={styles.toggleBtn} onClick={toggle}>
                {theme === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode'}
              </button>
            </div>

            <div className={styles.prefItem}>
              <div className={styles.prefMeta}>
                <h4>Default Layout</h4>
                <p>Choose your starting layout for list filters.</p>
              </div>
              <select value={defaultView} onChange={handleViewChange} className={styles.select}>
                <option value="list">List View</option>
                <option value="grid">Grid View</option>
              </select>
            </div>
          </div>
        </section>

        {/* Danger Zone Card */}
        <section className={`${styles.card} ${styles.dangerZone}`}>
          <h3>Danger Zone</h3>
          <div className={styles.prefItem}>
            <div className={styles.prefMeta}>
              <h4 className={styles.dangerTitle}>Reset Workspace Data</h4>
              <p>Permanently delete all active, archived, and trashed tasks. This cannot be undone.</p>
            </div>
            <button className={styles.resetBtn} onClick={handleResetData}>
              Reset Database
            </button>
          </div>
        </section>

        {/* System Info Card */}
        <section className={styles.card}>
          <h3>System Information</h3>
          <div className={styles.sysInfo}>
            <div className={styles.infoRow}>
              <span>Application Version</span>
              <strong>v2.1.0-SaaS</strong>
            </div>
            <div className={styles.infoRow}>
              <span>Environment</span>
              <strong>Development (Localhost)</strong>
            </div>
            <div className={styles.infoRow}>
              <span>Engine Status</span>
              <span className={styles.onlineBadge}>Online</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
