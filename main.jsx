import { StrictMode } from 'react';
import './index.css';
import App from './App.jsx';
import AuthProvider from './auth/AuthProvider.jsx'; // changed this import

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider> {/* added this wrapping component */}
      <App />
    </AuthProvider>
  </StrictMode>
);
