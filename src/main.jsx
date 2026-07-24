// main.js
import { StrictMode } from 'react';
import './index.css';
import App from './App.jsx';
+// import AuthProvider from './auth/AuthProvider.jsx'; // <-- removed this line (now using context/AuthContext)
-import AuthProvider from './context/AuthProvider.jsx';  // Added this new correct path

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider> {/* added this wrapping component */}
      <App />
+  </StrictMode>
);
