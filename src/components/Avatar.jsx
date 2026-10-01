import { useState } from 'react';

const Avatar = ({ src, name = '?', size = 32, className = '' }) => {
    const [failed, setFailed] = useState(false);
    const style = { width: size, height: size };

    return (
        <div
            style={style}
            className={`flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-raised font-semibold text-muted ${className}`}
        >
            {src && !failed ? (
                <img
                    src={src}
                    alt={name}
                    loading="lazy"
                    onError={() => setFailed(true)}
                    className="h-full w-full object-cover"
                />
            ) : (
                <span style={{ fontSize: size * 0.4 }}>{(name[0] || '?').toUpperCase()}</span>
            )}
        </div>
    );
};

export default Avatar;