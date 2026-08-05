import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { MdClose, MdPerson } from 'react-icons/md';
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

    return () => {
      cancelled = true;
    };
  }, [roomId]);

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="h-full w-full max-w-xs border-l border-slate-800 bg-slate-900 p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Room Members</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <MdClose size={20} />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-cyan-400"></div>
          </div>
        ) : members.length === 0 ? (
          <p className="text-sm text-slate-400">No members found.</p>
        ) : (
          <ul className="space-y-2">
            {members.map((member) => (
              <li
                key={member}
                className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-800/60 px-3 py-2"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-sm font-semibold text-white">
                  <MdPerson size={16} />
                </div>
                <span className="text-sm text-slate-100">
                  {member}
                  {member === currentUserId && (
                    <span className="ml-2 text-xs text-cyan-400">(you)</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default MembersPanel;