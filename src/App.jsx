import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { MotionConfig } from 'motion/react';
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
import ForgotPasswordPage from './components/ForgotPasswordPage';
import ResetPasswordPage from './components/ResetPasswordPage';
import WorkspaceCommandPalette from './components/WorkspaceCommandPalette';
import { ThemeProvider } from './context/ThemeContext';

import './App.css';

function App() {
    return (
        <MotionConfig reducedMotion="user" transition={{ duration: 0.18, ease: 'easeOut' }}>
            <ChatProvider>
                <BrowserRouter>
                    <ThemeProvider>
                        <Toaster
                            position="top-right"
                            toastOptions={{
                                duration: 3200,
                                style: {
                                    background: 'var(--app-surface-solid)',
                                    color: 'var(--app-text)',
                                    border: '1px solid var(--app-border)',
                                    borderRadius: '14px',
                                    fontSize: '12px',
                                    boxShadow: 'var(--app-shadow)',
                                },
                            }}
                        />
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
                            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                            <Route path="/reset-password" element={<ResetPasswordPage />} />
                        </Routes>
                        <WorkspaceCommandPalette />
                    </ThemeProvider>
                </BrowserRouter>
            </ChatProvider>
        </MotionConfig>
    );
}

export default App;