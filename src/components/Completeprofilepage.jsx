import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuth from '../context/AuthContext';
import { completeProfileApi } from '../services/AuthService';
import { AuthShell, Field } from './AuthShell';

// Landing page after Google/GitHub login for a brand-new account.
// The backend redirects here with a short-lived (10 min) INCOMPLETE token cookie.
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
            await refreshUser(); // now ACTIVE, with real cookies
            toast.success('Profile completed.');
            navigate('/', { replace: true });
        } catch (error) {
            const status = error?.response?.status;
            if (status === 409) toast.error('That username is taken.');
            else if (status === 401 || status === 403) {
                toast.error('This sign-up session expired. Log in with Google or GitHub again.');
                navigate('/login', { replace: true });
            } else toast.error('Could not save your profile.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <AuthShell title="Finish setting up" subtitle="Pick the name other people will see.">
            <form onSubmit={handleSubmit}>
                <Field label="Full name" name="name" value={form.name} onChange={handleChange} autoComplete="name" />
                <Field
                    label="Username"
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    autoComplete="username"
                />
                <button
                    type="submit"
                    disabled={busy}
                    className="mt-8 w-full rounded-md bg-amber px-4 py-3 text-sm font-semibold text-ink transition hover:bg-amber-dim disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {busy ? 'Saving…' : 'Save and continue'}
                </button>
            </form>
        </AuthShell>
    );
};

export default CompleteProfilePage;