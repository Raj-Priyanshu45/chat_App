import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MdArrowForward, MdVerified } from 'react-icons/md';
import useAuth from '../context/AuthContext';
import { verifyEmailApi } from '../services/AuthService';
import AuthShell from './AuthShell';

const VerifyEmailPage = () => {
  const [params] = useSearchParams();
  const keyFromUrl = params.get('key');
  const [key, setKey] = useState(keyFromUrl || '');
  const [busy, setBusy] = useState(false);
  const startedRef = useRef(false);
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const gmail = location.state?.gmail;

  const verify = useCallback(async (token) => {
    if (!token.trim()) {
      toast.error('Enter the verification token.');
      return;
    }
    setBusy(true);
    try {
      await verifyEmailApi(token.trim());
      await refreshUser();
      toast.success('Email verified.');
      navigate('/', { replace: true });
    } catch (error) {
      const data = error?.response?.data;
      toast.error(typeof data === 'string' ? data : 'Verification failed.');
    } finally {
      setBusy(false);
    }
  }, [refreshUser, navigate]);

  useEffect(() => {
    if (keyFromUrl && !startedRef.current) {
      startedRef.current = true;
      verify(keyFromUrl);
    }
  }, [keyFromUrl, verify]);

  return (
    <AuthShell
      title="Verify your email"
      subtitle={gmail ? `We sent a token to ${gmail}. It expires in 15 minutes.` : 'Paste the token from your verification email.'}
      footer={<Link to="/login" className="auth-link">Back to sign in</Link>}
    >
      <div className="surface-soft" style={{ padding: 14, marginBottom: 16 }}>
        <div className="hero-eyebrow">
          <MdVerified size={15} style={{ color: 'var(--app-positive)' }} />
          email verification
        </div>
        <p style={{ marginTop: 8, color: 'var(--app-muted)', fontSize: 11, lineHeight: 1.6 }}>
          The verification token is single-use. Enter it exactly as it appears in your email.
        </p>
      </div>

      <form className="auth-form" onSubmit={(event) => { event.preventDefault(); verify(key); }}>
        <label className="field">
          <span className="field-label">Verification token</span>
          <input name="key" value={key} onChange={(event) => setKey(event.target.value)} placeholder="Paste token" autoFocus />
        </label>
        <button type="submit" disabled={busy} className="btn btn-primary">
          {busy ? 'Verifying…' : 'Verify email'}
          {!busy && <MdArrowForward size={17} />}
        </button>
      </form>
    </AuthShell>
  );
};

export default VerifyEmailPage;
