import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuth from '../context/AuthContext';
import { verifyEmailApi } from '../services/AuthService';
import { AuthShell, Field } from './AuthShell';

// Works two ways:
//   1. the email contains a link  /verify-email?key=TOKEN  -> verifies automatically
//   2. the email contains just the token -> user pastes it here
const VerifyEmailPage = () => {
    const [params] = useSearchParams();
    const keyFromUrl = params.get('key');
    const [key, setKey] = useState(keyFromUrl || '');
    const [busy, setBusy] = useState(false);
    const startedRef = useRef(false);
    const { refreshUser } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const gmail = location.state?.gmail;

    const verify = useCallback(
        async (token) => {
            if (!token.trim()) {
                toast.error('Enter the verification token.');
                return;
            }

            setBusy(true);
            try {
                await verifyEmailApi(token.trim());
                await refreshUser(); // the verify call logged us in via cookies
                toast.success('Email verified.');
                navigate('/', { replace: true });
            } catch (error) {
                const data = error?.response?.data;
                toast.error(typeof data === 'string' ? data : 'Verification failed.');
            } finally {
                setBusy(false);
            }
        },
        [refreshUser, navigate]
    );

    useEffect(() => {
        if (keyFromUrl && !startedRef.current) {
            startedRef.current = true; // StrictMode runs effects twice in dev; the token is single-use
            verify(keyFromUrl);
        }
    }, [keyFromUrl, verify]);

    return (
        <AuthShell
            title="Verify your email"
            subtitle={
                gmail
                    ? `We sent a token to ${gmail}. It expires in 15 minutes.`
                    : 'Paste the token from your verification email.'
            }
            footer={
                <Link to="/login" className="text-amber transition-colors hover:text-cream">
                    Back to log in
                </Link>
            }
        >
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    verify(key);
                }}
            >
                <Field label="Token" name="key" value={key} onChange={(e) => setKey(e.target.value)} />
                <button
                    type="submit"
                    disabled={busy}
                    className="mt-8 w-full rounded-md bg-amber px-4 py-3 text-sm font-semibold text-ink transition hover:bg-amber-dim disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {busy ? 'Verifying…' : 'Verify email'}
                </button>
            </form>
        </AuthShell>
    );
};

export default VerifyEmailPage;