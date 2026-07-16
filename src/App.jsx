import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import JoinCreateChat from './components/JoinCreateChat';
import ChatPage from './components/ChatPage';
import { ChatProvider } from './context/ChatContext';
import './App.css';

function App() {
  return (
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
  );
}

export default App;
