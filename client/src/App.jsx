import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import ChatPage from './pages/ChatPage';

export default function App() {
  const { token } = useAuth();
  if (!token) return <AuthPage />;

  return (
    <Routes>
      <Route path="/" element={<ChatPage />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
