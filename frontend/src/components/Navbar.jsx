import { Link, useLocation } from 'react-router-dom';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { pathname } = useLocation();
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.brand}>
          <span className={styles.logo}>⬡</span>
          <span className={styles.brandName}>Taska</span>
        </Link>
        <nav className={styles.nav}>
          <Link to="/" className={`${styles.link} ${pathname === '/' ? styles.active : ''}`}>
            All Todos
          </Link>
        </nav>
      </div>
    </header>
  );
}
