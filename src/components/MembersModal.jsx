import { useState } from 'react';
import { MdMoreVert, MdClose } from 'react-icons/md';

const MembersModal = ({ members, onMessagePrivately, onClose }) => {
  const [openMenuFor, setOpenMenuFor] = useState(null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Members</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <MdClose size={20} />
          </button>
        </div>

        {members.length === 0 ? (
          <p className="text-sm text-slate-400">No other members in this room.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {members.map((member) => (
              <li
                key={member}
                className="relative flex items-center justify-between rounded-xl px-3 py-2 hover:bg-slate-800/70"
              >
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-slate-700 text-white flex items-center justify-center text-sm font-semibold">
                    {member[0]?.toUpperCase()}
                  </div>
                  <span className="text-sm text-slate-100">{member}</span>
                </div>

                <button
                  type="button"
                  onClick={() => setOpenMenuFor(openMenuFor === member ? null : member)}
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-700 hover:text-white"
                >
                  <MdMoreVert size={18} />
                </button>

                {openMenuFor === member && (
                  <div className="absolute right-2 top-11 z-10 w-44 rounded-xl border border-slate-700 bg-slate-800 py-1 shadow-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenuFor(null);
                        onMessagePrivately(member);
                        onClose();
                      }}
                      className="block w-full px-4 py-2 text-left text-sm text-slate-100 hover:bg-slate-700"
                    >
                      Message privately
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default MembersModal;