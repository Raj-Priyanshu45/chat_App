import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import JoinCreateChat from './components/JoinCreateChat';
import ChatPage from './components/ChatPage';
import { ChatProvider } from './context/ChatContext';
import { AuthProvider } from './context/AuthContext';
import './App.css';

console.log("App Loaded");

function App() {
  return (
    <AuthProvider>
      <ChatProvider>
        <BrowserRouter>
          <Toaster position="top-right" />
          <Routes>
            <Route path="/" element={<JoinCreateChat />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ChatProvider>
    </AuthProvider>
  );
}

export default App;
