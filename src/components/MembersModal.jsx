import { useState } from 'react';
import {
  MdMoreVert,
  MdClose,
} from 'react-icons/md';

const MembersModal = ({
                        members,
                        onMessagePrivately,
                        onClose,
                      }) => {
  const [openMenuFor, setOpenMenuFor] = useState(null);

  return (
      <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={onClose}
      >
        <div
            className="w-full max-w-sm rounded-md border border-border-subtle bg-surface p-5"
            onClick={(e) => e.stopPropagation()}
        >

          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
              Members
            </h2>

            <button
                type="button"
                onClick={onClose}
                className="rounded-md p-1 text-muted transition hover:bg-surface-raised hover:text-cream"
            >
              <MdClose size={18} />
            </button>
          </div>

          {members.length === 0 ? (
              <p className="text-sm text-muted">
                No other members in this room.
              </p>
          ) : (
              <ul className="flex flex-col gap-1">

                {members.map((member) => {
                  const userId = member.id;
                  const username =
                      member.username || 'Unknown user';

                  return (
                      <li
                          key={userId}
                          className="relative flex items-center justify-between rounded-md px-3 py-2 hover:bg-surface-raised"
                      >
                        <div className="flex items-center gap-2.5">

                          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-surface-raised text-sm font-semibold text-muted">
                            {username[0]?.toUpperCase() || '?'}
                          </div>

                          <span className="font-mono text-sm text-cream">
                      {username}
                    </span>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                setOpenMenuFor(
                                    openMenuFor === userId
                                        ? null
                                        : userId
                                )
                            }
                            className="rounded-md p-1 text-muted transition hover:bg-ink hover:text-cream"
                        >
                          <MdMoreVert size={18} />
                        </button>

                        {openMenuFor === userId && (
                            <div className="absolute right-2 top-11 z-10 w-44 rounded-md border border-border-subtle bg-surface-raised py-1 shadow-xl">
                              <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuFor(null);
                                    onMessagePrivately(userId);
                                    onClose();
                                  }}
                                  className="block w-full px-4 py-2 text-left text-sm text-cream hover:bg-ink"
                              >
                                Message privately
                              </button>
                            </div>
                        )}
                      </li>
                  );
                })}

              </ul>
          )}
        </div>
      </div>
  );
};

export default MembersModal;