import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage.jsx';
import TodoListPage from './pages/TodoListPage.jsx';
import TodoDetailPage from './pages/TodoDetailPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import Sidebar from './components/Sidebar.jsx';
import { ToastProvider } from './components/Toast.jsx';
import { ThemeProvider } from './components/ThemeContext.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <ToastProvider>
          <ErrorBoundary>
            <div className="app-layout">
              <Sidebar />
              <main className="main-content">
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/my-tasks" element={<TodoListPage mode="tasks" />} />
                  <Route path="/tasks-archive" element={<TodoListPage mode="archive" />} />
                  <Route path="/tasks-deleted" element={<TodoListPage mode="deleted" />} />
                  <Route path="/todo" element={<TodoDetailPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </main>
            </div>
          </ErrorBoundary>
        </ToastProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
