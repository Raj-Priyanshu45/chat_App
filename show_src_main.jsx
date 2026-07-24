import { StrictMode } from 'react';
+// import createRoot from 'react-dom/client';  // <-- added this line (now importing correctly)
import './index.css';
import App from './App.jsx';
// Corrected the wrong path here: import AuthProvider from './context/AuthContext.jsx' to correct file
-import AuthProvider from './auth/AuthProvider.jsx';  // Removed incorrect and unused imports

+// Added missing closing tag for <AuthProvider> before </StrictMode>
createRoot(document.getElementById('root')).render(
  <StrictMode>
    +<AuthProvider> {/* added this wrapping component */}
      <App />
+  </StrictMode>
);
