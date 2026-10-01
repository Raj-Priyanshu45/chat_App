// Shared layout + input for the Login / Register / VerifyEmail / CompleteProfile pages.

export const AuthShell = ({ title, subtitle, children, footer }) => (
    <div className="flex min-h-screen items-center justify-center bg-ink px-6 py-12 text-cream">
        <div className="w-full max-w-sm">
            <span className="font-mono text-xs uppercase tracking-wider text-amber">chat_app</span>
            <h1 className="mt-6 text-2xl font-semibold text-cream">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-8 text-sm text-muted">{footer}</div>}
        </div>
    </div>
);

export const Field = ({ label, ...inputProps }) => (
    <div className="mt-5 first:mt-0">
        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted">
            {label}
        </label>
        <input
            {...inputProps}
            className="w-full rounded-md border border-border-subtle bg-surface px-4 py-3 text-sm text-cream placeholder-muted/60 outline-none transition focus:border-amber"
        />
    </div>
);