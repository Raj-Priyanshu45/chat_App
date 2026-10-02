import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { resetPasswordApi } from '../services/AuthService';
import { AuthShell, Field } from './AuthShell';

// Works two ways:
//   1. a link  /reset-password?token=TOKEN  -> token is prefilled
//   2. the email contains just the token -> user pastes it here
const ResetPasswordPage = () => {
    const [params] = useSearchParams();
    const [form, setForm] = useState({
        token: params.get('token') || '',
        password: '',
        confirm: '',
    });
    const [busy, setBusy] = useState(false);
    const navigate = useNavigate();

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!form.token.trim()) {
            toast.error('Enter the reset token from your email.');
            return;
        }
        if (form.password.length < 8) {
            toast.error('Password must be at least 8 characters.');
            return;
        }
        if (form.password !== form.confirm) {
            toast.error('Passwords do not match.');
            return;
        }

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
            title="Choose a new password"
            subtitle="Paste the token from your email. You'll be asked to log in again afterwards."
            footer={
                <Link to="/forgot-password" className="text-amber transition-colors hover:text-cream">
                    Request a new token
                </Link>
            }
        >
            <form onSubmit={handleSubmit}>
                <Field label="Token" name="token" value={form.token} onChange={handleChange} />
                <Field
                    label="New password"
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    autoComplete="new-password"
                />
                <Field
                    label="Confirm password"
                    name="confirm"
                    type="password"
                    value={form.confirm}
                    onChange={handleChange}
                    autoComplete="new-password"
                />
                <button
                    type="submit"
                    disabled={busy}
                    className="mt-8 w-full rounded-md bg-amber px-4 py-3 text-sm font-semibold text-ink transition hover:bg-amber-dim disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {busy ? 'Saving…' : 'Update password'}
                </button>
            </form>
        </AuthShell>
    );
};

export default ResetPasswordPage;