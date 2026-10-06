import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MdArrowForward, MdMarkEmailRead } from 'react-icons/md';
import { forgotPasswordApi } from '../services/AuthService';
import AuthShell from './AuthShell';

const ForgotPasswordPage = () => {
  const [gmail, setGmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!gmail.trim()) {
      toast.error('Enter your email.');
      return;
    }
    setBusy(true);
    try {
      await forgotPasswordApi(gmail.trim());
      setSent(true);
    } catch {
      toast.error('Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Recover your account"
      subtitle={sent ? 'The reset token is on its way. It expires in 15 minutes.' : 'Enter your email and we will send a reset token.'}
      footer={
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
          {sent && <Link to="/reset-password" className="auth-link">I have my token</Link>}
          <Link to="/login" className="auth-link">Back to sign in</Link>
        </div>
      }
    >
      {sent ? (
        <div className="surface" style={{ padding: 24, textAlign: 'center' }}>
          <div className="empty-glyph"><MdMarkEmailRead size={21} /></div>
          <h2 className="section-title">Check your inbox</h2>
          <p className="empty-copy">Use the reset link or token from your email to choose a new password.</p>
        </div>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field">
            <span className="field-label">Email</span>
            <input name="gmail" type="email" value={gmail} onChange={(event) => setGmail(event.target.value)} autoComplete="email" placeholder="you@example.com" autoFocus />
          </label>
          <button type="submit" disabled={busy} className="btn btn-primary">
            {busy ? 'Sending…' : 'Send reset token'}
            {!busy && <MdArrowForward size={17} />}
          </button>
        </form>
      )}
    </AuthShell>
  );
};

export default ForgotPasswordPage;
