import { useEffect, useState } from 'react';
import { MdClose, MdChatBubbleOutline } from 'react-icons/md';
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
            .then((data) => {
                if (!cancelled) setProfile(data);
            })
            .catch(() => {
                if (!cancelled) setError(true);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [userId]);

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-xs rounded-md border border-border-subtle bg-surface p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-4 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md p-1 text-muted transition hover:bg-surface-raised hover:text-cream"
                    >
                        <MdClose size={18} />
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-8">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border-subtle border-t-amber" />
                    </div>
                ) : error || !profile ? (
                    <p className="py-8 text-center text-sm text-muted">
                        Unable to load this profile.
                    </p>
                ) : (
                    <div className="flex flex-col items-center text-center">
                        <Avatar
                            src={profile.profilePicUrl}
                            name={profile.name || profile.username}
                            size={72}
                        />

                        <h2 className="mt-4 text-lg font-semibold text-cream">
                            {profile.name || profile.username}
                        </h2>

                        <p className="font-mono text-sm text-muted">
                            @{profile.username}
                        </p>

                        {onMessage && (
                            <button
                                type="button"
                                onClick={() => onMessage(userId)}
                                className="mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-amber px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-amber-dim"
                            >
                                <MdChatBubbleOutline size={16} />
                                Message privately
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserProfileModal;