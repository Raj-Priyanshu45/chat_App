import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MdArrowForward, MdLogin } from 'react-icons/md';
import useAuth from '../context/AuthContext';
import { oauthUrl } from '../services/AuthService';
import AuthShell from './AuthShell';

const LoginPage = () => {
  const [form, setForm] = useState({ username: '', password: '' });
  const [busy, setBusy] = useState(false);
  const { login, authenticated, needsProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    if (needsProfile) navigate('/complete-profile', { replace: true });
    else if (authenticated) navigate(from, { replace: true });
  }, [authenticated, needsProfile, from, navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.username.trim() || !form.password) {
      toast.error('Enter your username and password.');
      return;
    }

    setBusy(true);
    try {
      const me = await login(form.username.trim(), form.password);
      if (!me) toast.error('Login failed. Try again.');
    } catch (error) {
      toast.error(
        error?.response?.status === 401
          ? 'Wrong username or password, or your email is not verified yet.'
          : 'Login failed. Try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in and get back into the conversation."
      footer={
        <>
          New to conduit?{' '}
          <Link to="/register" className="auth-link">Create an account</Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field-label">Username</span>
          <input
            name="username"
            value={form.username}
            onChange={handleChange}
            autoComplete="username"
            placeholder="your-handle"
            autoFocus
          />
        </label>

        <label className="field">
          <span className="field-label">Password</span>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            autoComplete="current-password"
            placeholder="••••••••"
          />
        </label>

        <div className="utility-bar">
          <span className="status-meta">Session cookies are handled securely by the server.</span>
          <Link to="/forgot-password" className="auth-link" style={{ fontSize: 10 }}>Forgot password?</Link>
        </div>

        <button type="submit" disabled={busy} className="btn btn-primary">
          <MdLogin size={17} />
          {busy ? 'Signing in…' : 'Sign in'}
          {!busy && <MdArrowForward size={17} />}
        </button>
      </form>

      <div className="auth-divider">or continue with</div>
      <a href={oauthUrl('google')} className="oauth-btn">
        <span className="nav-user-avatar" style={{ width: 30, height: 30, borderRadius: 9, fontSize: 10 }}>G</span>
        Continue with Google
      </a>
    </AuthShell>
  );
};

export default LoginPage;
