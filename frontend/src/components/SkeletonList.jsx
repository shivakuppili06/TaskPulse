import styles from './SkeletonList.module.css';

function SkeletonCard() {
  return (
    <div className={styles.card}>
      <div className={styles.topRow}>
        <div className={`skeleton ${styles.checkbox}`} />
        <div className={`skeleton ${styles.circle}`} />
        <div className={`skeleton ${styles.badge}`} />
        <div className={styles.spacer} />
        <div className={`skeleton ${styles.action}`} />
        <div className={`skeleton ${styles.action}`} />
      </div>
      <div className={styles.body}>
        <div className={`skeleton ${styles.titleLine}`} />
        <div className={`skeleton ${styles.descLine}`} />
        <div className={styles.metaRow}>
          <div className={`skeleton ${styles.chip}`} />
          <div className={`skeleton ${styles.chip} ${styles.chipWide}`} />
          <div className={`skeleton ${styles.chip}`} />
        </div>
      </div>
    </div>
  );
}

export default function SkeletonList({ count = 5 }) {
  return (
    <div className={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
