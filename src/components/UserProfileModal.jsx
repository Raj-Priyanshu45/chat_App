import { useEffect, useState } from 'react';
import { MdChatBubbleOutline, MdClose, MdOutlinePerson } from 'react-icons/md';
import Avatar from './Avatar';
import { getUserProfileApi } from '../services/ProfileService';

const UserProfileModal = ({ userId, onMessage, onClose }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setProfile(null);

    getUserProfileApi(userId)
      .then((data) => { if (!cancelled) setProfile(data); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [userId]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/65 px-4" onClick={onClose}>
      <div className="surface page-enter w-full max-w-md overflow-hidden" onClick={(event) => event.stopPropagation()}>
        <div style={{ height: 94, background: 'linear-gradient(120deg, rgba(213,157,87,0.18), rgba(255,255,255,0.02))', borderBottom: '1px solid var(--app-border)' }} />
        <div className="relative px-6 pb-6">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: -32 }}>
            {loading || error || !profile ? <div style={{ width: 64, height: 64 }} /> : <Avatar src={profile.imageUri || profile.profilePicUrl} name={profile.name || profile.username} size={64} />}
            <button type="button" className="icon-button" onClick={onClose} title="Close profile" aria-label="Close profile"><MdClose size={19} /></button>
          </div>

          {loading ? (
            <div className="mt-5 space-y-3">
              <div className="skeleton" style={{ width: '55%', height: 18 }} />
              <div className="skeleton" style={{ width: '35%', height: 12 }} />
              <div className="skeleton" style={{ width: '80%', height: 12 }} />
            </div>
          ) : error || !profile ? (
            <div className="empty-state" style={{ marginTop: 20 }}>
              <div className="empty-glyph"><MdOutlinePerson size={20} /></div>
              <h3 className="empty-title">Profile unavailable</h3>
              <p className="empty-copy">We could not load this profile right now.</p>
            </div>
          ) : (
            <div className="mt-5">
              <h2 className="text-2xl font-extrabold tracking-tight text-cream">{profile.name || profile.username}</h2>
              <p className="mt-1 font-mono text-[11px] text-amber">@{profile.username}</p>
              {profile.gmail && <p className="mt-3 text-xs text-muted">{profile.gmail}</p>}

              {onMessage && (
                <button type="button" onClick={() => onMessage(userId)} className="btn btn-primary mt-6 w-full">
                  <MdChatBubbleOutline size={17} />
                  Message privately
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;
