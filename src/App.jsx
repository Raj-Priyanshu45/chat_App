import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import JoinCreateChat from './components/JoinCreateChat';
import ChatPage from './components/ChatPage';
import DiscoverRooms from './components/DiscoverRooms';
import Profile from './components/Profile';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import VerifyEmailPage from './components/VerifyEmailPage';
import CompleteProfilePage from './components/CompleteProfilePage';
import ProtectedRoute from './components/ProtectedRoute';
import { ChatProvider } from './context/ChatContext';
import './App.css';

function App() {
  return (
      <ChatProvider>
        <BrowserRouter>
          <Toaster position="top-right" />
          <Routes>
            {/* public */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/complete-profile" element={<CompleteProfilePage />} />

            {/* the backend redirects here after OAuth login */}
            <Route path="/home" element={<Navigate to="/" replace />} />

            {/* protected */}
            <Route path="/" element={<ProtectedRoute><JoinCreateChat /></ProtectedRoute>} />
            <Route path="/discover" element={<ProtectedRoute><DiscoverRooms /></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ChatProvider>
  );
}

export default App;