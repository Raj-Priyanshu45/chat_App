import BrandMark from './BrandMark';

const AuthShell = ({ title, subtitle, children, footer, mode = 'auth' }) => (
  <div className="auth-page">
    <div className="auth-shell page-enter">
      <section className="auth-brand-panel">
        <div className="auth-brand-top">
          <BrandMark />
        </div>

        <div className="auth-brand-main">
          <div className="hero-eyebrow">
            <span className="live-dot" />
            {mode === 'complete' ? 'finish your workspace' : 'private by default'}
          </div>
          <h2 className="auth-brand-title">
            Conversations that stay <span>close.</span>
          </h2>
          <p className="auth-brand-copy">
            A focused chat workspace for small communities, project rooms, and direct conversations. Jump between rooms without losing the thread.
          </p>

          <div className="auth-protocol" aria-label="Workspace capabilities">
            <div className="auth-protocol-item">
              <strong>01 / rooms</strong>
              <span>Public or password-protected spaces.</span>
            </div>
            <div className="auth-protocol-item">
              <strong>02 / live</strong>
              <span>Real-time delivery over one connection.</span>
            </div>
            <div className="auth-protocol-item">
              <strong>03 / media</strong>
              <span>Share images, audio, and video in context.</span>
            </div>
          </div>
        </div>

        <div className="auth-brand-bottom">
          <div>conduit / realtime communication</div>
          <div>rooms · people · messages</div>
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <div className="auth-form-head">
            <div className="page-kicker">your workspace</div>
            <h1 className="auth-form-title">{title}</h1>
            {subtitle && <p className="auth-form-subtitle">{subtitle}</p>}
          </div>

          <div>{children}</div>

          {footer && <div className="auth-footer">{footer}</div>}
        </div>
      </section>
    </div>
  </div>
);

export const Field = ({ label, hint, ...inputProps }) => (
  <label className="field">
    <span className="field-label">{label}</span>
    <input {...inputProps} />
    {hint && <span className="field-hint">{hint}</span>}
  </label>
);

export default AuthShell;
