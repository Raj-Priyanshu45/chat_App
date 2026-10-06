import { useState } from 'react';

const Avatar = ({ src, name = '?', size = 32, className = '' }) => {
  const [failed, setFailed] = useState(false);
  const label = (name[0] || '?').toUpperCase();
  const style = { width: size, height: size };

  return (
    <div
      style={style}
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-[11px] border border-white/10 bg-[#20241f] font-extrabold text-amber ${className}`}
      aria-label={name}
    >
      {src && !failed ? (
        <img src={src} alt={name} loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-cover" />
      ) : (
        <span style={{ fontSize: Math.max(11, size * 0.36) }}>{label}</span>
      )}
    </div>
  );
};

export default Avatar;
