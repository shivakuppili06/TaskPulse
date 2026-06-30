import { useState } from 'react';
import { useToast } from '../components/Toast.jsx';
import styles from './SettingsPage.module.css';

export default function SettingsPage() {
  const toast = useToast();

  const [username, setUsername] = useState('Satya');
  const [email, setEmail] = useState('satya@example.com');

  const handleSaveProfile = (e) => {
    e.preventDefault();
    toast.show('Profile updated successfully (local simulation)', 'success');
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <h1>Settings</h1>
          <p>Configure and manage your ApexTask workspace.</p>
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
