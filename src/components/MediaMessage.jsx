import { useState } from 'react';
import { MdErrorOutline } from 'react-icons/md';

const MediaMessage = ({ url, type }) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="surface-soft" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 11px', color: '#d98a7b', fontSize: 10 }}>
        <MdErrorOutline size={15} />
        Unable to load media.
      </div>
    );
  }

  if (type === 'IMAGE') {
    return (
      <div style={{ width: 'min(420px, 100%)', overflow: 'hidden', borderRadius: 16, border: '1px solid var(--app-border)', background: '#0b0e0c' }}>
        <img src={url} alt="Shared" loading="lazy" onError={() => setFailed(true)} style={{ display: 'block', width: '100%', maxHeight: 420, objectFit: 'cover' }} />
      </div>
    );
  }

  if (type === 'VIDEO') {
    return (
      <div style={{ width: 'min(480px, 100%)', overflow: 'hidden', borderRadius: 16, border: '1px solid var(--app-border)', background: '#080a09' }}>
        <video src={url} controls preload="metadata" onError={() => setFailed(true)} style={{ display: 'block', width: '100%', maxHeight: 420 }} />
      </div>
    );
  }

  if (type === 'AUDIO') {
    return (
      <div className="surface-soft" style={{ display: 'inline-flex', padding: 9 }}>
        <audio src={url} controls preload="metadata" onError={() => setFailed(true)} />
      </div>
    );
  }

  return null;
};

export default MediaMessage;
