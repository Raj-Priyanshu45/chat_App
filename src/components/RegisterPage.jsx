import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { registerApi } from '../services/AuthService';
import { AuthShell, Field } from './AuthShell';

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
            title="Create an account"
            subtitle="We'll email you a token to verify your address."
            footer={
                <>
                    Already registered?{' '}
                    <Link to="/login" className="text-amber transition-colors hover:text-cream">
                        Log in
                    </Link>
                </>
            }
        >
            <form onSubmit={handleSubmit}>
                <Field label="Full name" name="name" value={form.name} onChange={handleChange} autoComplete="name" />
                <Field
                    label="Username"
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    autoComplete="username"
                />
                <Field
                    label="Email"
                    name="gmail"
                    type="email"
                    value={form.gmail}
                    onChange={handleChange}
                    autoComplete="email"
                />
                <Field
                    label="Password"
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    autoComplete="new-password"
                />
                <button
                    type="submit"
                    disabled={busy}
                    className="mt-8 w-full rounded-md bg-amber px-4 py-3 text-sm font-semibold text-ink transition hover:bg-amber-dim disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {busy ? 'Creating…' : 'Create account'}
                </button>
            </form>
        </AuthShell>
    );
};

export default RegisterPage;