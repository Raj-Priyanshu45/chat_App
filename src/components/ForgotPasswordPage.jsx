import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { forgotPasswordApi } from '../services/AuthService';
import { AuthShell, Field } from './AuthShell';

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
            title="Reset your password"
            subtitle={
                sent
                    ? 'If an account exists for that email, a reset link is on its way. It expires in 15 minutes.'
                    : "Enter your email and we'll send you a reset link."
            }
            footer={
                <Link to="/login" className="text-amber transition-colors hover:text-cream">
                    Back to log in
                </Link>
            }
        >
            {!sent && (
                <form onSubmit={handleSubmit}>
                    <Field
                        label="Email"
                        name="gmail"
                        type="email"
                        value={gmail}
                        onChange={(e) => setGmail(e.target.value)}
                        autoComplete="email"
                    />
                    <button
                        type="submit"
                        disabled={busy}
                        className="mt-8 w-full rounded-md bg-amber px-4 py-3 text-sm font-semibold text-ink transition hover:bg-amber-dim disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {busy ? 'Sending…' : 'Send reset link'}
                    </button>
                </form>
            )}
        </AuthShell>
    );
};

export default ForgotPasswordPage;