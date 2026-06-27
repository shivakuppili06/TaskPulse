import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import TodoListPage from './pages/TodoListPage.jsx';
import TodoDetailPage from './pages/TodoDetailPage.jsx';
import Navbar from './components/Navbar.jsx';
import { ToastProvider } from './components/Toast.jsx';
import { ThemeProvider } from './components/ThemeContext.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <ToastProvider>
          <ErrorBoundary>
            <Navbar />
            <Routes>
              <Route path="/" element={<TodoListPage />} />
              <Route path="/todo" element={<TodoDetailPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ErrorBoundary>
        </ToastProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
