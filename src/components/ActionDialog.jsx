import { useEffect, useRef } from 'react';
import { MdAlertCircle, MdArrowForward, MdClose, MdLockOutline } from 'react-icons/md';

/** Small, accessible in-app confirmation/input dialog used instead of browser prompts. */
const ActionDialog = ({
                          open,
                          title,
                          eyebrow = 'confirm action',
                          description,
                          confirmLabel = 'Continue',
                          cancelLabel = 'Cancel',
                          destructive = false,
                          busy = false,
                          inputLabel,
                          inputType = 'text',
                          inputValue = '',
                          onInputChange,
                          placeholder = '',
                          onConfirm,
                          onCancel,
                      }) => {
    const inputRef = useRef(null);
    const busyRef = useRef(busy);
    const onCancelRef = useRef(onCancel);
    busyRef.current = busy;
    onCancelRef.current = onCancel;

    useEffect(() => {
        if (!open) return undefined;
        const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
        const handleKeyDown = (event) => {
            if (event.key === 'Escape' && !busyRef.current) onCancelRef.current?.();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.clearTimeout(timer);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [open]);

    if (!open) return null;

    const submit = (event) => {
        event.preventDefault();
        if (!busy) onConfirm?.();
    };

    return (
        <div className="ac-dialog-backdrop" onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) onCancel?.();
        }}>
            <section className="ac-dialog" role="dialog" aria-modal="true" aria-labelledby="ac-dialog-title" aria-describedby="ac-dialog-description">
                <form onSubmit={submit}>
                    <div className="ac-dialog-topline">
            <span className={`ac-dialog-icon ${destructive ? 'is-danger' : ''}`} aria-hidden="true">
              {inputType === 'password' ? <MdLockOutline size={19} /> : destructive ? <MdAlertCircle size={19} /> : <MdArrowForward size={19} />}
            </span>
                        <button className="icon-button" type="button" aria-label="Close dialog" onClick={onCancel} disabled={busy}><MdClose size={18} /></button>
                    </div>
                    <div className="ac-dialog-eyebrow">{eyebrow}</div>
                    <h2 id="ac-dialog-title" className="ac-dialog-title">{title}</h2>
                    <p id="ac-dialog-description" className="ac-dialog-description">{description}</p>
                    {inputLabel && (
                        <label className="ac-dialog-field">
                            <span>{inputLabel}</span>
                            <input
                                ref={inputRef}
                                type={inputType}
                                value={inputValue}
                                onChange={(event) => onInputChange?.(event.target.value)}
                                placeholder={placeholder}
                                autoComplete={inputType === 'password' ? 'current-password' : 'off'}
                                required
                                disabled={busy}
                            />
                        </label>
                    )}
                    <div className="ac-dialog-actions">
                        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>{cancelLabel}</button>
                        <button type="submit" className={`btn ${destructive ? 'btn-danger' : 'btn-primary'}`} disabled={busy || (inputLabel && !String(inputValue).trim())}>
                            {busy ? 'Please wait…' : confirmLabel}
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
};

export default ActionDialog;