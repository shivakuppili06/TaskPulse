import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import styles from './Toast.module.css';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = 'success', duration = 3000, action = null) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, action, duration }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  function dismiss(id) {
    setToasts(prev => prev.filter(t => t.id !== id));
  }

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={16} className={styles.successIcon} />;
      case 'error':
        return <AlertCircle size={16} className={styles.errorIcon} />;
      case 'warning':
        return <AlertTriangle size={16} className={styles.warningIcon} />;
      case 'info':
      default:
        return <Info size={16} className={styles.infoIcon} />;
    }
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className={styles.container}>
        {toasts.map(t => (
          <div key={t.id} className={`${styles.toast} ${styles[t.type]}`}>
            <div className={styles.toastBody}>
              <span className={styles.icon}>
                {getIcon(t.type)}
              </span>
              <span className={styles.message}>{t.message}</span>
              {t.action && (
                <button
                  className={styles.undoBtn}
                  onClick={() => { t.action.onClick(); dismiss(t.id); }}
                >
                  {t.action.label}
                </button>
              )}
              <button className={styles.closeBtn} onClick={() => dismiss(t.id)}>
                <X size={14} />
              </button>
            </div>
            {/* Subtle progress indicator bar */}
            <div 
              className={styles.progressBar} 
              style={{ animationDuration: `${t.duration}ms` }} 
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
