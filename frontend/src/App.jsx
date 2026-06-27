import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import TodoListPage from './pages/TodoListPage.jsx';
import TodoDetailPage from './pages/TodoDetailPage.jsx';
import Navbar from './components/Navbar.jsx';
import { ToastProvider } from './components/Toast.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Navbar />
        <Routes>
          <Route path="/" element={<TodoListPage />} />
          <Route path="/todo" element={<TodoDetailPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  );
}
