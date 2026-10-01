import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Avatar from './Avatar';
import { useAvatars } from '../hooks/useAvatars';
import { useNavigate } from 'react-router-dom';
import { Client } from '@stomp/stompjs';

import toast from 'react-hot-toast';

import {
  MdSend,
  MdAttachFile,
  MdGroup,
  MdLogout,
  MdPerson,
  MdExplore,
} from 'react-icons/md';

import useChatContext from '../context/ChatContext';
import useAuth from '../context/AuthContext';

import { getWebSocketUrl, ensureFreshSession } from '../config/AxiosHelper';

import {
  getMessages,
  getMessagesSince,
  leaveRoomApi,
  uploadFileApi,
  uploadDmFileApi,
  computeDmRoomId,
} from '../services/RoomService';

import { lookupUsernamesApi } from '../services/UserService';

import {
  formatTime,
  toBackendTimestamp,
} from '../config/helper';

import MediaMessage from './MediaMessage';
import MembersModal from './MembersModal';

const ChatPage = () => {
  const {
    roomId,
    currentUser,
    connected,
    roomUsers,
    isDm,
    dmTarget,

    setConnected,
    setRoomId,
    setCurrentUser,
    setIsDm,
    setDmTarget,
  } = useChatContext();

  const {
    authenticated,
    user,
    logout,
  } = useAuth();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [stompClient, setStompClient] = useState(null);
  const [showMembers, setShowMembers] = useState(false);

  // Internal ID -> visible username
  const [usernamesById, setUsernamesById] = useState({});

  const chatBoxRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastMessageTimestampRef = useRef(null);

  const usernamesRef = useRef({});

  const navigate = useNavigate();

  // Avatar lookup for message senders.
  const avatarOf = useAvatars(
      messages.map((message) => message.sender)
  );

  // Keep username map available inside WebSocket callbacks.
  useEffect(() => {
    usernamesRef.current = usernamesById;
  }, [usernamesById]);

  // Internal current user ID (never rendered).
  const currentUserId =
      user?.id ||
      currentUser ||
      '';

  // Visible current username.
  const currentUsername =
      user?.username ||
      user?.name ||
      usernamesById[currentUserId] ||
      'Unknown user';

  // Keep latest DM state inside STOMP callbacks.
  const isDmRef = useRef(isDm);
  const dmTargetRef = useRef(dmTarget);

  useEffect(() => {
    isDmRef.current = isDm;
  }, [isDm]);

  useEffect(() => {
    dmTargetRef.current = dmTarget;
  }, [dmTarget]);

  /*
   * Resolve Mongo IDs -> usernames.
   */
  const resolveUsernames = useCallback(async (ids = []) => {
    const validIds = [
      ...new Set(
          ids.filter(
              (id) =>
                  typeof id === 'string' &&
                  id.trim()
          )
      ),
    ];

    if (!validIds.length) {
      return {};
    }

    const missingIds = validIds.filter(
        (id) => !usernamesRef.current[id]
    );

    if (!missingIds.length) {
      return validIds.reduce((result, id) => {
        result[id] = usernamesRef.current[id];
        return result;
      }, {});
    }

    try {
      const resolved =
          await lookupUsernamesApi(missingIds);

      const merged = {
        ...usernamesRef.current,
        ...resolved,
      };

      usernamesRef.current = merged;
      setUsernamesById(merged);

      return validIds.reduce((result, id) => {
        result[id] = merged[id];
        return result;
      }, {});
    } catch {
      return validIds.reduce((result, id) => {
        result[id] = usernamesRef.current[id];
        return result;
      }, {});
    }
  }, []);

  /*
   * Store the current user's own username.
   */
  useEffect(() => {
    if (
        currentUserId &&
        currentUsername &&
        currentUsername !== 'Unknown user'
    ) {
      setUsernamesById((prev) => {
        if (
            prev[currentUserId] === currentUsername
        ) {
          return prev;
        }

        const next = {
          ...prev,
          [currentUserId]: currentUsername,
        };

        usernamesRef.current = next;
        return next;
      });
    }
  }, [
    currentUserId,
    currentUsername,
  ]);

  /*
   * Resolve current room members.
   */
  useEffect(() => {
    if (!roomUsers?.length) {
      return;
    }

    resolveUsernames(roomUsers);
  }, [roomUsers, resolveUsernames]);

  /*
   * Resolve DM target username.
   */
  useEffect(() => {
    if (isDm && dmTarget) {
      resolveUsernames([dmTarget]);
    }
  }, [isDm, dmTarget, resolveUsernames]);

  /*
   * Leave page when disconnected.
   */
  useEffect(() => {
    if (!connected) {
      navigate('/');
    }
  }, [connected, navigate]);

  const scrollToBottom = () => {
    if (!chatBoxRef.current) {
      return;
    }

    chatBoxRef.current.scrollTo({
      top: chatBoxRef.current.scrollHeight,
      behavior: 'smooth',
    });
  };

  /*
   * Load message history.
   */
  useEffect(() => {
    if (!connected || !roomId) {
      return;
    }

    let cancelled = false;

    const loadMessages = async () => {
      try {
        const loadedMessages =
            await getMessages(roomId);

        if (cancelled) {
          return;
        }

        setMessages(loadedMessages);

        if (loadedMessages.length > 0) {
          lastMessageTimestampRef.current =
              loadedMessages[
              loadedMessages.length - 1
                  ].timeStamp;

          await resolveUsernames(
              loadedMessages.map(
                  (message) => message.sender
              )
          );
        }

        scrollToBottom();
      } catch (error) {
        if (
            isDm &&
            error?.response?.status === 404
        ) {
          setMessages([]);
          return;
        }

        toast.error(
            'Unable to load message history.'
        );
      }
    };

    loadMessages();

    return () => {
      cancelled = true;
    };
  }, [
    connected,
    roomId,
    isDm,
    resolveUsernames,
  ]);

  /*
   * STOMP connection.
   *
   * Auth is the httpOnly JWT cookie, sent automatically on the
   * WebSocket handshake. The JWT subject is the Mongo user ID.
   */
  useEffect(() => {
    if (
        !authenticated ||
        !connected ||
        !roomId
    ) {
      return undefined;
    }

    const client = new Client({
      brokerURL: getWebSocketUrl(),

      reconnectDelay: 5000,

      onConnect: () => {
        setStompClient(client);

        toast.success(
            'Connected to chat'
        );

        /*
         * GROUP ROOM
         */
        if (!isDmRef.current) {
          client.subscribe(
              `/topic/room/${roomId}`,
              async (message) => {
                try {
                  const payload =
                      JSON.parse(message.body);

                  if (payload.sender) {
                    await resolveUsernames([
                      payload.sender,
                    ]);
                  }

                  setMessages((prev) => [
                    ...prev,
                    payload,
                  ]);

                  lastMessageTimestampRef.current =
                      payload.timeStamp;

                  scrollToBottom();
                } catch {
                  toast.error(
                      'Error receiving message'
                  );
                }
              }
          );
        }

        /*
         * DM queue
         */
        client.subscribe(
            '/user/queue/dm',
            async (message) => {
              try {
                const payload =
                    JSON.parse(message.body);

                const senderId =
                    payload.sender;

                if (senderId) {
                  await resolveUsernames([
                    senderId,
                  ]);
                }

                const senderUsername =
                    usernamesRef.current[
                        senderId
                        ] || 'Unknown user';

                /*
                 * The DM is "this one" if the other participant
                 * (sender if not me, otherwise the dm target)
                 * matches the DM we're viewing. Compare IDs.
                 */
                const otherId =
                    senderId === currentUserId
                        ? dmTargetRef.current
                        : senderId;

                const viewingThisDm =
                    isDmRef.current &&
                    dmTargetRef.current === otherId &&
                    payload.roomId ===
                    computeDmRoomId(
                        currentUserId,
                        dmTargetRef.current
                    );

                if (viewingThisDm) {
                  setMessages((prev) => [
                    ...prev,
                    payload,
                  ]);

                  lastMessageTimestampRef.current =
                      payload.timeStamp;

                  scrollToBottom();
                } else if (senderId !== currentUserId) {
                  toast.custom((t) => (
                      <div
                          onClick={() => {
                            toast.dismiss(t.id);

                            setMessages([]);

                            lastMessageTimestampRef.current =
                                null;

                            setIsDm(true);

                            // Internal ID.
                            setDmTarget(
                                senderId
                            );

                            // Internal room ID.
                            setRoomId(
                                computeDmRoomId(
                                    currentUserId,
                                    senderId
                                )
                            );

                            setConnected(true);
                          }}
                          className="cursor-pointer rounded-md border border-border-subtle bg-surface-raised px-4 py-3 text-sm text-cream shadow-xl"
                      >
                        <p className="font-semibold text-amber">
                          New message from{' '}
                          {senderUsername}
                        </p>

                        <p className="mt-1 truncate text-muted">
                          {payload.type === 'TEXT'
                              ? payload.content
                              : `Sent a ${
                                  payload.type?.toLowerCase() ||
                                  'file'
                              }`}
                        </p>
                      </div>
                  ));
                }
              } catch {
                toast.error(
                    'Error receiving message'
                );
              }
            }
        );

        /*
         * Errors
         */
        client.subscribe(
            '/user/queue/errors',
            (message) => {
              toast.error(
                  message.body
              );
            }
        );

        /*
         * Room events
         */
        client.subscribe(
            '/user/queue/room-events',
            (message) => {
              try {
                const event =
                    JSON.parse(message.body);

                if (
                    event.type === 'LEFT_ROOM' &&
                    event.roomId === roomId
                ) {
                  client.deactivate();
                }
              } catch {
                // Ignore malformed event.
              }
            }
        );

        /*
         * Reconnection sync.
         */
        if (lastMessageTimestampRef.current) {
          const since =
              toBackendTimestamp(
                  lastMessageTimestampRef.current
              );

          if (since) {
            getMessagesSince(
                roomId,
                since
            )
                .then(async (missed) => {
                  if (!missed?.length) {
                    return;
                  }

                  await resolveUsernames(
                      missed.map(
                          (message) =>
                              message.sender
                      )
                  );

                  setMessages((prev) => {
                    const existingIds =
                        new Set(
                            prev.map(
                                (m) => m.id
                            )
                        );

                    const newOnes =
                        missed.filter(
                            (m) =>
                                !existingIds.has(
                                    m.id
                                )
                        );

                    if (!newOnes.length) {
                      return prev;
                    }

                    lastMessageTimestampRef.current =
                        newOnes[
                        newOnes.length - 1
                            ].timeStamp;

                    return [
                      ...prev,
                      ...newOnes,
                    ];
                  });

                  scrollToBottom();
                })
                .catch(() => {
                  if (!isDmRef.current) {
                    toast.error(
                        'Unable to fetch missed messages.'
                    );
                  }
                });
          }
        }
      },

      onStompError: (frame) => {
        toast.error(
            frame.headers?.message ||
            frame.body ||
            'WebSocket error.'
        );
      },

      onWebSocketError: () => {
        toast.error(
            'Unable to connect to chat server.'
        );
      },

      onDisconnect: () => {
        setStompClient(null);
      },
    });

    // The cookie is only checked at handshake time, so make sure it's fresh first.
    let cancelled = false;

    ensureFreshSession()
        .catch(() => {})
        .finally(() => {
          if (!cancelled) {
            client.activate();
          }
        });

    return () => {
      cancelled = true;
      client.deactivate();
      setStompClient(null);
    };
  }, [
    authenticated,
    connected,
    roomId,
    isDm,
    currentUserId,
    resolveUsernames,
    setConnected,
    setDmTarget,
    setIsDm,
    setRoomId,
  ]);

  /*
   * Scroll.
   */
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  /*
   * Send message.
   *
   * dmTarget is a Mongo ID.
   */
  const sendMessage = () => {
    if (
        !stompClient ||
        !connected ||
        !input.trim()
    ) {
      return;
    }

    const payload = {
      message: input.trim(),
    };

    try {
      const destination = isDm
          ? `/app/dm/${dmTarget}`
          : `/app/sendMessages/${roomId}`;

      stompClient.publish({
        destination,
        body: JSON.stringify(payload),
      });

      setInput('');
    } catch (error) {
      toast.error(
          `Failed to send message: ${error.message}`
      );
    }
  };

  /*
   * File upload.
   *
   * DM target = Mongo ID.
   */
  const handleFileSelect = async (event) => {
    const files = Array.from(
        event.target.files || []
    );

    if (!files.length) {
      return;
    }

    try {
      if (isDm) {
        await uploadDmFileApi(
            dmTarget,
            files
        );
      } else {
        await uploadFileApi(
            roomId,
            files
        );
      }
    } catch (error) {
      const message =
          error?.response?.data ||
          'Upload failed.';

      toast.error(
          typeof message === 'string'
              ? message
              : 'Upload failed.'
      );
    } finally {
      event.target.value = '';
    }
  };

  /*
   * Leave room.
   */
  const handleLeaveRoom = async () => {
    if (stompClient) {
      stompClient.deactivate();
    }

    if (!isDm) {
      try {
        await leaveRoomApi(roomId);
      } catch {
        // Non-blocking.
      }
    }

    setConnected(false);
    setRoomId('');
    setIsDm(false);
    setDmTarget('');

    navigate('/');
  };

  /*
   * Logout should NOT call leaveRoomApi().
   * Logout and leaving a room are different operations.
   */
  const handleLogout = async () => {
    if (stompClient) {
      stompClient.deactivate();
    }

    setConnected(false);
    setRoomId('');
    setCurrentUser('');
    setIsDm(false);
    setDmTarget('');

    await logout();
    navigate('/login', { replace: true });
  };

  /*
   * Start DM.
   *
   * targetUserId is Mongo ID.
   */
  const handleStartDm = (targetUserId) => {
    if (!currentUserId) {
      toast.error(
          'Unable to identify the current user.'
      );
      return;
    }

    if (!targetUserId) {
      toast.error(
          'Invalid target user.'
      );
      return;
    }

    if (stompClient) {
      stompClient.deactivate();
    }

    setMessages([]);

    lastMessageTimestampRef.current =
        null;

    setIsDm(true);

    // Internal ID.
    setDmTarget(targetUserId);

    // Internal deterministic room ID.
    setRoomId(
        computeDmRoomId(
            currentUserId,
            targetUserId
        )
    );

    setConnected(true);
  };

  /*
   * Members shown in modal:
   * {
   *   id: Mongo ID,
   *   username: visible username
   * }
   */
  const memberViewModels = useMemo(() => {
    return (roomUsers || [])
        .filter(
            (id) =>
                id &&
                id !== currentUserId
        )
        .map((id) => ({
          id,
          username:
              usernamesById[id] ||
              'Unknown user',
        }));
  }, [
    roomUsers,
    currentUserId,
    usernamesById,
  ]);

  /*
   * Visible DM username.
   */
  const dmTargetUsername =
      usernamesById[dmTarget] ||
      'Unknown user';

  /*
   * Visible message data.
   */
  const groupedMessages = useMemo(() => {
    return messages.map(
        (message, index) => ({
          ...message,

          id:
              message.id ||
              `${message.sender}-${message.content}-${index}`,

          displaySender:
              usernamesById[
                  message.sender
                  ] ||
              (
                  message.sender ===
                  currentUserId
                      ? currentUsername
                      : 'Unknown user'
              ),
        })
    );
  }, [
    messages,
    usernamesById,
    currentUserId,
    currentUsername,
  ]);

  return (
      <div className="flex h-screen bg-ink text-cream">

        {/* Sidebar */}
        <aside className="hidden w-60 shrink-0 flex-col border-r border-border-subtle bg-surface sm:flex">

          <div className="border-b border-border-subtle px-5 py-5">

            <p className="font-mono text-[11px] uppercase tracking-wider text-muted">
              {isDm
                  ? 'direct message'
                  : 'live room'}
            </p>

            <p className="mt-1 truncate font-mono text-sm text-cream">
              {isDm
                  ? `@${dmTargetUsername}`
                  : roomId}
            </p>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-4">

            {!isDm && (
                <button
                    type="button"
                    onClick={() =>
                        setShowMembers(true)
                    }
                    className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted transition hover:bg-surface-raised hover:text-cream"
                >
                  <MdGroup size={17} />
                  Members
                </button>
            )}

            <button
                type="button"
                onClick={() =>
                    navigate('/discover')
                }
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted transition hover:bg-surface-raised hover:text-cream"
            >
              <MdExplore size={17} />
              Discover rooms
            </button>

            <button
                type="button"
                onClick={() =>
                    navigate('/profile')
                }
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted transition hover:bg-surface-raised hover:text-cream"
            >
              <MdPerson size={17} />
              Profile
            </button>

          </nav>

          <div className="space-y-1 border-t border-border-subtle px-3 py-4">

            {/* Visible username */}
            <div className="mb-2 flex items-center gap-2 rounded-md bg-surface-raised px-3 py-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-sage" />

              <span className="truncate font-mono text-xs text-cream">
              @{currentUsername}
            </span>
            </div>

            <button
                type="button"
                onClick={handleLeaveRoom}
                className="w-full rounded-md px-3 py-2 text-left text-sm text-muted transition hover:bg-surface-raised hover:text-cream"
            >
              {isDm
                  ? 'Close DM'
                  : 'Leave room'}
            </button>

            <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-rose transition hover:bg-rose/10"
            >
              <MdLogout size={16} />
              Logout
            </button>

          </div>
        </aside>

        {showMembers && (
            <MembersModal
                members={memberViewModels}
                onMessagePrivately={
                  handleStartDm
                }
                onClose={() =>
                    setShowMembers(false)
                }
            />
        )}

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col">

          <header className="flex items-center justify-between border-b border-border-subtle bg-surface/60 px-5 py-3.5 backdrop-blur">

            {/* Visible username for DM */}
            <p className="truncate font-mono text-sm text-cream">
              {isDm
                  ? `@${dmTargetUsername}`
                  : `#${roomId}`}
            </p>

            <div className="flex items-center gap-1 sm:hidden">
              <button
                  type="button"
                  onClick={handleLeaveRoom}
                  className="rounded-md px-3 py-1.5 text-xs text-muted transition hover:text-cream"
              >
                {isDm
                    ? 'Close'
                    : 'Leave'}
              </button>

              <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-md px-3 py-1.5 text-xs text-rose transition hover:text-cream"
              >
                Logout
              </button>
            </div>

          </header>

          <main
              ref={chatBoxRef}
              className="flex-1 overflow-y-auto px-5 py-4"
          >

            {groupedMessages.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-muted">
                    No messages yet. Start the conversation.
                  </p>
                </div>
            ) : (
                <div className="mx-auto flex max-w-3xl flex-col">

                  {groupedMessages.map(
                      (message) => (
                          <div
                              key={message.id}
                              className="group flex gap-3 rounded-md px-2 py-2 transition hover:bg-surface/50"
                          >

                            {/* Avatar */}
                            <div className="mt-0.5">
                              <Avatar
                                  src={avatarOf(message.sender)}
                                  name={message.displaySender}
                                  size={32}
                              />
                            </div>

                            <div className="min-w-0 flex-1">

                              <div className="flex items-baseline gap-2">

                        <span
                            className={`font-mono text-sm font-medium ${
                                message.sender ===
                                currentUserId
                                    ? 'text-amber'
                                    : 'text-cream'
                            }`}
                        >
                          {message.displaySender}
                        </span>

                                <span className="font-mono text-[11px] text-muted">
                          {formatTime(
                              message.timeStamp
                          )}
                        </span>

                              </div>

                              {message.type === 'IMAGE' ||
                              message.type === 'VIDEO' ||
                              message.type === 'AUDIO' ? (
                                  <div className="mt-1.5">
                                    <MediaMessage
                                        url={
                                          message.content
                                        }
                                        type={
                                          message.type
                                        }
                                    />
                                  </div>
                              ) : (
                                  <p className="mt-0.5 break-words text-sm leading-relaxed text-cream/90">
                                    {message.content}
                                  </p>
                              )}

                            </div>
                          </div>
                      )
                  )}

                </div>
            )}

          </main>

          <footer className="border-t border-border-subtle bg-surface/60 px-5 py-4 backdrop-blur">

            <div className="mx-auto flex max-w-3xl items-center gap-2 rounded-md border border-border-subtle bg-surface px-3 py-2.5 transition focus-within:border-amber">

              <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,video/*,audio/*"
                  multiple
              />

              <button
                  type="button"
                  onClick={() =>
                      fileInputRef.current?.click()
                  }
                  className="shrink-0 rounded-md p-2 text-muted transition hover:bg-surface-raised hover:text-cream"
              >
                <MdAttachFile size={18} />
              </button>

              <input
                  value={input}
                  onChange={(event) =>
                      setInput(
                          event.target.value
                      )
                  }
                  onKeyDown={(event) => {
                    if (
                        event.key === 'Enter'
                    ) {
                      sendMessage();
                    }
                  }}
                  placeholder="Message..."
                  className="flex-1 bg-transparent px-1 py-1 text-sm text-cream outline-none placeholder-muted/60"
              />

              <button
                  type="button"
                  onClick={sendMessage}
                  disabled={!input.trim()}
                  className="shrink-0 rounded-md bg-amber p-2 text-ink transition hover:bg-amber-dim disabled:cursor-not-allowed disabled:opacity-30"
              >
                <MdSend size={17} />
              </button>

            </div>
          </footer>

        </div>
      </div>
  );
};

export default ChatPage;