import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MdArrowForward } from 'react-icons/md';
import { resetPasswordApi } from '../services/AuthService';
import AuthShell from './AuthShell';

const ResetPasswordPage = () => {
  const [params] = useSearchParams();
  const [form, setForm] = useState({ token: params.get('token') || '', password: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.token.trim()) return toast.error('Enter the reset token from your email.');
    if (form.password.length < 8) return toast.error('Password must be at least 8 characters.');
    if (form.password !== form.confirm) return toast.error('Passwords do not match.');

    setBusy(true);
    try {
      await resetPasswordApi(form.token.trim(), form.password);
      toast.success('Password updated. Log in with your new password.');
      navigate('/login', { replace: true });
    } catch (error) {
      const data = error?.response?.data;
      toast.error(typeof data === 'string' ? data : 'Could not reset the password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Set a new password"
      subtitle="Choose a strong password and your account will be ready to use again."
      footer={<Link to="/forgot-password" className="auth-link">Request a new token</Link>}
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field-label">Reset token</span>
          <input name="token" value={form.token} onChange={handleChange} placeholder="Paste token" autoFocus />
        </label>
        <label className="field">
          <span className="field-label">New password</span>
          <input name="password" type="password" value={form.password} onChange={handleChange} autoComplete="new-password" placeholder="At least 8 characters" />
        </label>
        <label className="field">
          <span className="field-label">Confirm password</span>
          <input name="confirm" type="password" value={form.confirm} onChange={handleChange} autoComplete="new-password" placeholder="Repeat password" />
        </label>
        <button type="submit" disabled={busy} className="btn btn-primary">
          {busy ? 'Updating…' : 'Update password'}
          {!busy && <MdArrowForward size={17} />}
        </button>
      </form>
    </AuthShell>
  );
};

export default ResetPasswordPage;
