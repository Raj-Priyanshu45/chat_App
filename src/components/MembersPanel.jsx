import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { MdClose, MdPeopleOutline } from 'react-icons/md';
import { getRoomMembersApi } from '../services/RoomService';

const MembersPanel = ({ roomId, currentUserId, onClose }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const loadMembers = async () => {
      setLoading(true);
      try {
        const list = await getRoomMembersApi(roomId);
        if (!cancelled) setMembers(list);
      } catch {
        if (!cancelled) toast.error('Unable to load members.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadMembers();
    return () => { cancelled = true; };
  }, [roomId]);

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/55 px-0 sm:px-4" onClick={onClose}>
      <aside className="h-full w-full max-w-md border-l border-border-subtle bg-surface/95 p-5 shadow-2xl backdrop-blur-2xl sm:m-3 sm:h-[calc(100%-24px)] sm:rounded-2xl sm:border" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-border-subtle pb-5">
          <div>
            <div className="hero-eyebrow"><MdPeopleOutline size={15} style={{ color: 'var(--app-accent)' }} /> room people</div>
            <h2 className="mt-2 text-xl font-extrabold text-cream">Room members</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} title="Close" aria-label="Close"><MdClose size={19} /></button>
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="space-y-2">
              {[1,2,3,4].map((item) => <div key={item} className="skeleton" style={{ height: 54, width: '100%' }} />)}
            </div>
          ) : members.length === 0 ? (
            <div className="empty-state" style={{ marginTop: 0 }}><div className="empty-glyph"><MdPeopleOutline size={20} /></div><h3 className="empty-title">No members found</h3></div>
          ) : (
            <ul className="space-y-1">
              {members.map((member) => (
                <li key={member} className="flex items-center justify-between rounded-xl px-3 py-3 hover:bg-white/[0.03]">
                  <span className="truncate font-mono text-xs text-cream">{member}</span>
                  {member === currentUserId && <span className="font-mono text-[9px] text-amber">you</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
};

export default MembersPanel;
