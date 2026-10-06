import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MdArrowForward } from 'react-icons/md';
import { registerApi } from '../services/AuthService';
import AuthShell from './AuthShell';

const RegisterPage = () => {
  const [form, setForm] = useState({ name: '', username: '', gmail: '', password: '' });
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const { name, username, gmail, password } = form;

    if (!name.trim() || !username.trim() || !gmail.trim() || !password) {
      toast.error('Fill in every field.');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }

    setBusy(true);
    try {
      await registerApi({
        name: name.trim(),
        username: username.trim(),
        gmail: gmail.trim(),
        password,
      });
      toast.success('Account created. Check your email to verify it.');
      navigate('/verify-email', { replace: true, state: { gmail: gmail.trim() } });
    } catch (error) {
      const data = error?.response?.data;
      toast.error(typeof data === 'string' ? data : 'Could not create the account.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Create your space"
      subtitle="Choose the identity people will know you by."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="auth-link">Sign in</Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field-label">Full name</span>
          <input name="name" value={form.name} onChange={handleChange} autoComplete="name" placeholder="Priyanshu Raj" autoFocus />
        </label>
        <label className="field">
          <span className="field-label">Username</span>
          <input name="username" value={form.username} onChange={handleChange} autoComplete="username" placeholder="priyanshu" />
        </label>
        <label className="field">
          <span className="field-label">Email</span>
          <input name="gmail" type="email" value={form.gmail} onChange={handleChange} autoComplete="email" placeholder="you@example.com" />
        </label>
        <label className="field">
          <span className="field-label">Password</span>
          <input name="password" type="password" value={form.password} onChange={handleChange} autoComplete="new-password" placeholder="At least 8 characters" />
        </label>
        <button type="submit" disabled={busy} className="btn btn-primary">
          {busy ? 'Creating account…' : 'Create account'}
          {!busy && <MdArrowForward size={17} />}
        </button>
      </form>
    </AuthShell>
  );
};

export default RegisterPage;
