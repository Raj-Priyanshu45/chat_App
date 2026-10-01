import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuth from '../context/AuthContext';
import { oauthUrl } from '../services/AuthService';
import { AuthShell, Field } from './AuthShell';

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
            title="Log in"
            subtitle="Pick up where you left off."
            footer={
                <>
                    New here?{' '}
                    <Link to="/register" className="text-amber transition-colors hover:text-cream">
                        Create an account
                    </Link>
                </>
            }
        >
            <form onSubmit={handleSubmit}>
                <Field
                    label="Username"
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    autoComplete="username"
                />
                <Field
                    label="Password"
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    autoComplete="current-password"
                />

                <div className="mt-2 text-right">
                    <Link
                        to="/forgot-password"
                        className="text-xs text-muted transition-colors hover:text-amber"
                    >
                        Forgot password?
                    </Link>
                </div>

                <button
                    type="submit"
                    disabled={busy}
                    className="mt-6 w-full rounded-md bg-amber px-4 py-3 text-sm font-semibold text-ink transition hover:bg-amber-dim disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {busy ? 'Logging in…' : 'Log in'}
                </button>
            </form>

            <div className="my-6 flex items-center gap-3 text-xs text-muted">
                <span className="h-px flex-1 bg-border-subtle" />
                or
                <span className="h-px flex-1 bg-border-subtle" />
            </div>

            <div className="grid grid-cols-1 gap-3">
                <a
                    href={oauthUrl('google')}
                    className="rounded-md border border-border-subtle px-4 py-3 text-center text-sm font-semibold text-cream transition hover:border-amber hover:text-amber"
                >
                    Google
                </a>

            </div>
        </AuthShell>
    );
};

export default LoginPage;