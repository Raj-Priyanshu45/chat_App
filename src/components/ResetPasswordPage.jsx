import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { resetPasswordApi } from '../services/AuthService';
import { AuthShell, Field } from './AuthShell';

const ResetPasswordPage = () => {
    const [params] = useSearchParams();
    const token = params.get('token');
    const [form, setForm] = useState({ password: '', confirm: '' });
    const [busy, setBusy] = useState(false);
    const navigate = useNavigate();

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

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
            await resetPasswordApi(token, form.password);
            toast.success('Password updated. Log in with your new password.');
            navigate('/login', { replace: true });
        } catch (error) {
            const data = error?.response?.data;
            toast.error(typeof data === 'string' ? data : 'Could not reset the password.');
        } finally {
            setBusy(false);
        }
    };

    if (!token) {
        return (
            <AuthShell
                title="Invalid link"
                subtitle="This reset link is missing its token."
                footer={
                    <Link to="/forgot-password" className="text-amber transition-colors hover:text-cream">
                        Request a new link
                    </Link>
                }
            />
        );
    }

    return (
        <AuthShell title="Choose a new password" subtitle="You'll be asked to log in again afterwards.">
            <form onSubmit={handleSubmit}>
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