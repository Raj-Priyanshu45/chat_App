import { useState } from 'react';
import { MdClose, MdMoreVert, MdPeopleOutline } from 'react-icons/md';
import Avatar from './Avatar';

const MembersModal = ({ members, onMessagePrivately, onViewProfile, onClose }) => {
  const [openMenuFor, setOpenMenuFor] = useState(null);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/55 px-0 sm:px-4" onClick={onClose}>
      <aside
        className="page-enter h-full w-full max-w-md border-l border-border-subtle bg-surface/95 p-5 shadow-2xl backdrop-blur-2xl sm:m-3 sm:h-[calc(100%-24px)] sm:rounded-2xl sm:border"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border-subtle pb-5">
          <div>
            <div className="hero-eyebrow"><MdPeopleOutline size={15} style={{ color: 'var(--app-accent)' }} /> room people</div>
            <h2 className="mt-2 text-xl font-extrabold tracking-tight text-cream">Members</h2>
            <p className="mt-1 text-xs text-muted">Open a profile or start a private conversation.</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} title="Close members" aria-label="Close members"><MdClose size={19} /></button>
        </div>

        <div className="mt-4 max-h-[calc(100vh-170px)] overflow-y-auto">
          {members.length === 0 ? (
            <div className="empty-state" style={{ marginTop: 0 }}>
              <div className="empty-glyph"><MdPeopleOutline size={20} /></div>
              <h3 className="empty-title">No other members</h3>
              <p className="empty-copy">This room currently has no other visible members.</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-1">
              {members.map((member) => {
                const userId = member.id;
                const username = member.username || 'Unknown user';
                return (
                  <li key={userId} className="relative flex items-center justify-between rounded-xl px-3 py-3 transition-colors hover:bg-white/[0.035]">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar src={member.imageUri} name={username} size={40} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-cream">{username}</p>
                        <p className="mt-0.5 font-mono text-[9px] text-muted">active in this room</p>
                      </div>
                    </div>

                    <button type="button" className="icon-button" style={{ width: 38, height: 38 }} onClick={() => setOpenMenuFor(openMenuFor === userId ? null : userId)} title={`Actions for ${username}`} aria-label={`Actions for ${username}`}>
                      <MdMoreVert size={18} />
                    </button>

                    {openMenuFor === userId && (
                      <div className="absolute right-3 top-14 z-10 w-48 overflow-hidden rounded-xl border border-border-subtle bg-surface-raised p-1 shadow-2xl">
                        <button type="button" onClick={() => { setOpenMenuFor(null); onViewProfile(userId); }} className="block w-full rounded-lg px-3 py-2.5 text-left text-xs font-semibold text-cream hover:bg-ink">View profile</button>
                        <button type="button" onClick={() => { setOpenMenuFor(null); onMessagePrivately(userId); onClose(); }} className="block w-full rounded-lg px-3 py-2.5 text-left text-xs font-semibold text-cream hover:bg-ink">Message privately</button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
};

export default MembersModal;
