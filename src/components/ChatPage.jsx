import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { fetchWsTicketApi } from '../services/ProfileService';
import Avatar from './Avatar';
import { useAvatars } from '../hooks/useAvatars';
import { useNavigate } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import UserProfileModal from './UserProfileModal';
import toast from 'react-hot-toast';

import {
  MdSend,
  MdChatBubbleOutline,
  MdAttachFile,
  MdGroup,
  MdLogout,
  MdPerson,
  MdExplore,
  MdEdit,
  MdDelete,
  MdCheck,
  MdClose,
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
  getRoomMembersApi,
} from '../services/RoomService';

import { lookupUsernamesApi } from '../services/UserService';

import {
  formatTime,
  toBackendTimestamp,
} from '../config/helper';

import MediaMessage from './MediaMessage';
import MembersModal from './MembersModal';

/*
 * Edit / delete events arrive on the same channels as normal messages
 * (/topic/room/{id} for rooms, /user/queue/dm for DMs).
 * They carry type = MESSAGE_EDITED / MESSAGE_DELETED.
 * Returns true when the payload was an event (and has been applied).
 */
const applyMessageEvent = (payload, setMessages) => {
  if (payload?.type === 'MESSAGE_DELETED') {
    setMessages((prev) =>
        prev.filter((m) => m.id !== payload.messageId)
    );
    return true;
  }

  if (payload?.type === 'MESSAGE_EDITED') {
    setMessages((prev) =>
        prev.map((m) =>
            m.id === payload.messageId
                ? {
                  ...m,
                  content: payload.updatedContent,
                  edited: true,
                }
                : m
        )
    );
    return true;
  }

  return false;
};

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
  const [profileUserId, setProfileUserId] = useState(null);
  const [memberIds, setMemberIds] = useState([]);

  // Inline edit state
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  // Internal ID -> visible username
  const [usernamesById, setUsernamesById] = useState({});

  const chatBoxRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastMessageTimestampRef = useRef(null);
  const prevLengthRef = useRef(0);

  const usernamesRef = useRef({});

  const navigate = useNavigate();

  // Avatar lookup for message senders.
  const avatarOf = useAvatars(
      messages.map((message) => message.sender)
  );
  const memberAvatarOf = useAvatars(memberIds);

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

  /*
   * Switching room / DM cancels any open edit.
   */
  useEffect(() => {
    setEditingId(null);
    setEditText('');
    setProfileUserId(null);
    setShowMembers(false);
  }, [roomId]);

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

      beforeConnect: async (stompClient) => {
        const ticket = await fetchWsTicketApi();
        stompClient.brokerURL = `${getWebSocketUrl()}?ticket=${ticket}`;
      },

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

                  // edit / delete events
                  if (applyMessageEvent(payload, setMessages)) {
                    return;
                  }

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

                // edit / delete events
                if (payload?.type === 'MESSAGE_DELETED' || payload?.type === 'MESSAGE_EDITED') {
                  if (
                      isDmRef.current &&
                      payload.roomId ===
                      computeDmRoomId(
                          currentUserId,
                          dmTargetRef.current
                      )
                  ) {
                    applyMessageEvent(payload, setMessages);
                  }
                  return;
                }

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
   * Scroll only when a message is ADDED
   * (edits and deletes must not jump the view).
   */
  useEffect(() => {
    if (messages.length > prevLengthRef.current) {
      scrollToBottom();
    }
    prevLengthRef.current = messages.length;
  }, [messages.length]);

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
   * Edit message (inline).
   */
  const startEdit = (message) => {
    setEditingId(message.realId);
    setEditText(message.content || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const submitEdit = () => {
    if (!stompClient || !connected || !editingId) {
      return;
    }

    const text = editText.trim();

    if (!text) {
      toast.error('Message cannot be empty.');
      return;
    }

    const original = messages.find(
        (m) => m.id === editingId
    );

    // Nothing changed.
    if (original && original.content === text) {
      cancelEdit();
      return;
    }

    try {
      stompClient.publish({
        destination: '/app/chat/edit',
        body: JSON.stringify({
          roomId,
          messId: editingId,
          updatedContent: text,
        }),
      });

      cancelEdit();
    } catch (error) {
      toast.error(
          `Failed to edit message: ${error.message}`
      );
    }
  };

  /*
   * Delete message.
   */
  const deleteMessage = (message) => {
    if (!stompClient || !connected || !message.realId) {
      return;
    }

    if (!window.confirm('Delete this message?')) {
      return;
    }

    try {
      stompClient.publish({
        destination: '/app/chat/del',
        body: JSON.stringify({
          messId: message.realId,
          roomId,
        }),
      });
    } catch (error) {
      toast.error(
          `Failed to delete message: ${error.message}`
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
  /*
 * Members: the backend returns Mongo IDs only.
 * Fetch them, resolve to usernames via /users/lookup, then open the modal.
 */
  const openMembers = async () => {
    try {
      const ids = await getRoomMembersApi(roomId);

      setMemberIds(ids);
      await resolveUsernames(ids);

      setShowMembers(true);
    } catch {
      toast.error('Unable to load members.');
    }
  };
  const memberViewModels = memberIds
      .filter((id) => id && id !== currentUserId)
      .map((id) => ({
        id,
        username: usernamesById[id] || 'Unknown user',
        imageUri: memberAvatarOf(id),
      }));

  /*
   * Visible DM username.
   */
  const dmTargetUsername =
      usernamesById[dmTarget] ||
      'Unknown user';

  /*
   * Visible message data.
   * realId = the server id (undefined if the message has none yet),
   * used for edit / delete.
   */
  const groupedMessages = useMemo(() => {
    return messages.map(
        (message, index) => ({
          ...message,

          realId: message.id,

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
    <div className="chat-page page-enter">
      <aside className="chat-rail">
        <div className="chat-rail-top">
          <button type="button" className="icon-button" onClick={() => navigate('/')} title="Home" aria-label="Home">
            <span className="brand-mark" style={{ width: 34, height: 34, borderRadius: 10 }}>co</span>
          </button>
          {!isDm && <button type="button" className="icon-button" onClick={openMembers} title="Members" aria-label="Members"><MdGroup size={18} /></button>}
          <button type="button" className="icon-button" onClick={() => navigate('/discover')} title="Discover rooms" aria-label="Discover rooms"><MdExplore size={18} /></button>
          <button type="button" className="icon-button" onClick={() => navigate('/profile')} title="Profile" aria-label="Profile"><MdPerson size={18} /></button>
          <span className="chat-rail-label">live workspace</span>
        </div>
        <button type="button" className="icon-button" onClick={handleLogout} title="Log out" aria-label="Log out"><MdLogout size={18} /></button>
      </aside>

      {showMembers && <MembersModal members={memberViewModels} onMessagePrivately={handleStartDm} onViewProfile={setProfileUserId} onClose={() => setShowMembers(false)} />}
      {profileUserId && (
        <UserProfileModal
          userId={profileUserId}
          onMessage={(id) => { setProfileUserId(null); setShowMembers(false); handleStartDm(id); }}
          onClose={() => setProfileUserId(null)}
        />
      )}

      <section className="chat-workspace">
        <header className="chat-header">
          <div className="chat-header-main">
            <div className="chat-header-kicker">{isDm ? 'direct conversation' : 'live room'}</div>
            <div className="chat-header-title">{isDm ? <><span>@</span>{dmTargetUsername}</> : <><span>#</span>{roomId}</>}</div>
          </div>
          <div className="chat-header-actions">
            {connected && <div className="connection-pill"><span className="live-dot" /> Connected</div>}
            {!isDm && <button type="button" className="btn btn-secondary" onClick={openMembers}><MdGroup size={16} /> Members</button>}
            <button type="button" className="icon-button" onClick={handleLeaveRoom} title={isDm ? 'Close conversation' : 'Leave room'} aria-label={isDm ? 'Close conversation' : 'Leave room'}><MdClose size={18} /></button>
          </div>
        </header>

        <main ref={chatBoxRef} className="chat-scroll" aria-label="Messages">
          <div className="chat-inner">
            {groupedMessages.length === 0 ? (
              <div className="chat-empty">
                <div className="chat-empty-inner">
                  <div className="chat-empty-glyph"><MdChatBubbleOutline size={28} /></div>
                  <h1 className="chat-empty-title">Start the conversation</h1>
                  <p className="chat-empty-copy">{isDm ? `You and @${dmTargetUsername} have not exchanged a message here yet.` : 'This room is quiet right now. Send the first message and give the room a pulse.'}</p>
                </div>
              </div>
            ) : (
              groupedMessages.map((message) => {
                const isOwn = message.sender === currentUserId;
                const isTextMessage = !message.type || message.type === 'TEXT';
                const isEditing = editingId !== null && editingId === message.realId;
                const canModify = isOwn && Boolean(message.realId) && !isEditing;
                return (
                  <article key={message.id} className="message-row">
                    <div className="message-avatar"><Avatar src={avatarOf(message.sender)} name={message.displaySender} size={36} /></div>
                    <div className="message-content">
                      <div className="message-meta">
                        <span className={`message-author ${isOwn ? 'is-self' : ''}`}>{message.displaySender}</span>
                        <span className="message-time">{formatTime(message.timeStamp)}</span>
                        {message.edited && <span className="message-edited">edited</span>}
                      </div>
                      {isEditing ? (
                        <div>
                          <div className="message-edit-shell">
                            <input autoFocus value={editText} onChange={(event) => setEditText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); submitEdit(); } else if (event.key === 'Escape') cancelEdit(); }} />
                            <button type="button" className="icon-button" onClick={submitEdit} title="Save edit" aria-label="Save edit"><MdCheck size={17} /></button>
                            <button type="button" className="icon-button" onClick={cancelEdit} title="Cancel edit" aria-label="Cancel edit"><MdClose size={17} /></button>
                          </div>
                          <p className="message-edit-help">Enter to save · Esc to cancel</p>
                        </div>
                      ) : message.type === 'IMAGE' || message.type === 'VIDEO' || message.type === 'AUDIO' ? (
                        <div style={{ marginTop: 7 }}><MediaMessage url={message.content} type={message.type} /></div>
                      ) : (
                        <p className="message-body">{message.content}</p>
                      )}
                    </div>
                    {canModify && (
                      <div className="message-actions">
                        {isTextMessage && <button type="button" className="message-action" onClick={() => startEdit(message)} title="Edit message" aria-label="Edit message"><MdEdit size={15} /></button>}
                        <button type="button" className="message-action is-danger" onClick={() => deleteMessage(message)} title="Delete message" aria-label="Delete message"><MdDelete size={15} /></button>
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </div>
        </main>

        <footer className="composer-wrap">
          <div className="composer">
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,video/*,audio/*" multiple />
            <button type="button" className="icon-button" onClick={() => fileInputRef.current?.click()} title="Attach media" aria-label="Attach media"><MdAttachFile size={18} /></button>
            <input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') sendMessage(); }} placeholder={isDm ? `Message @${dmTargetUsername}` : `Message #${roomId}`} aria-label="Message" />
            <button type="button" className="btn btn-primary" onClick={sendMessage} disabled={!input.trim()} title="Send message"><MdSend size={18} /><span className="hidden sm:inline">Send</span></button>
          </div>
          <div className="composer-note"><span>media supported · image / video / audio</span><span>enter to send</span></div>
        </footer>
      </section>
    </div>
  );
};
export default ChatPage;
