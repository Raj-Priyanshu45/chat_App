import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MdArrowForward } from 'react-icons/md';
import useAuth from '../context/AuthContext';
import { completeProfileApi } from '../services/AuthService';
import AuthShell from './AuthShell';

const CompleteProfilePage = () => {
  const [form, setForm] = useState({ name: '', username: '' });
  const [busy, setBusy] = useState(false);
  const { authInitialized, authenticated, needsProfile, refreshUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authInitialized) return;
    if (authenticated) navigate('/', { replace: true });
    else if (!needsProfile) navigate('/login', { replace: true });
  }, [authInitialized, authenticated, needsProfile, navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.username.trim()) {
      toast.error('Enter your name and pick a username.');
      return;
    }

    setBusy(true);
    try {
      await completeProfileApi(form.name.trim(), form.username.trim());
      await refreshUser();
      toast.success('Profile completed.');
      navigate('/', { replace: true });
    } catch (error) {
      const status = error?.response?.status;
      if (status === 409) toast.error('That username is taken.');
      else if (status === 401 || status === 403) {
        toast.error('This sign-up session expired. Log in with Google again.');
        navigate('/login', { replace: true });
      } else toast.error('Could not save your profile.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell mode="complete" title="Finish your profile" subtitle="Pick the name and username other people will see.">
      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field-label">Full name</span>
          <input name="name" value={form.name} onChange={handleChange} autoComplete="name" placeholder="Your name" autoFocus />
        </label>
        <label className="field">
          <span className="field-label">Username</span>
          <input name="username" value={form.username} onChange={handleChange} autoComplete="username" placeholder="choose-a-handle" />
        </label>
        <button type="submit" disabled={busy} className="btn btn-primary">
          {busy ? 'Saving…' : 'Save and continue'}
          {!busy && <MdArrowForward size={17} />}
        </button>
      </form>
    </AuthShell>
  );
};

export default CompleteProfilePage;
