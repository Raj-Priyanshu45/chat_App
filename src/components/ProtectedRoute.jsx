import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../context/AuthContext';

// Wrap any page that needs a logged-in, fully-onboarded user.
const ProtectedRoute = ({ children }) => {
    const { authInitialized, authenticated, needsProfile } = useAuth();
    const location = useLocation();

    if (!authInitialized) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-ink">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-border-subtle border-t-amber" />
            </div>
        );
    }

    // OAuth user who still has to choose a username
    if (needsProfile) {
        return <Navigate to="/complete-profile" replace />;
    }

    if (!authenticated) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    return children;
};

export default ProtectedRoute;