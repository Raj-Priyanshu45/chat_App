import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import toast from 'react-hot-toast';
import { MdSend, MdAttachFile, MdGroup, MdLogout, MdPerson, MdExplore } from 'react-icons/md';
import useChatContext from '../context/ChatContext';
import useAuth from '../context/AuthContext';
import { ensureFreshSession, getWebSocketUrl } from '../config/AxiosHelper';
import {
  getMessages,
  getMessagesSince,
  getRoomMembersApi,
  leaveRoomApi,
  uploadFileApi,
  uploadDmFileApi,
  computeDmRoomId,
} from '../services/RoomService';
import { formatTime, toBackendTimestamp } from '../config/helper';
import { useUsernames } from '../hooks/useUsernames';
import MediaMessage from './MediaMessage';
import MembersModal from './MembersModal';

// Ignore a message we already have (REST history + live socket can overlap).
const appendMessage = (prev, message) =>
    message.id && prev.some((m) => m.id === message.id) ? prev : [...prev, message];

// Small component so the toast can resolve the sender's username with the hook.
const DmToast = ({ payload, onOpen }) => {
  const nameOf = useUsernames([payload.sender]);

  return (
      <div
          onClick={onOpen}
          className="cursor-pointer rounded-md border border-border-subtle bg-surface-raised px-4 py-3 text-sm text-cream shadow-xl"
      >
        <p className="font-semibold text-amber">New message from {nameOf(payload.sender)}</p>
        <p className="mt-1 truncate text-muted">
          {payload.type === 'TEXT' ? payload.content : `Sent a ${payload.type?.toLowerCase()}`}
        </p>
      </div>
  );
};

const ChatPage = () => {
  const {
    roomId, connected, roomUsers, isDm, dmTarget,
    setConnected, setRoomId, setRoomUsers, setIsDm, setDmTarget,
  } = useChatContext();
  const { user, logout } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [stompClient, setStompClient] = useState(null);
  const [showMembers, setShowMembers] = useState(false);
  const chatBoxRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastMessageTimestampRef = useRef(null);
  const navigate = useNavigate();

  // The backend identifies every user by id, so "me" is user.id (not the username).
  const currentUserId = user?.id || '';

  // The STOMP callbacks below are created once per connection; refs let them read
  // the *current* values instead of the ones captured at creation time.
  const isDmRef = useRef(isDm);
  const dmTargetRef = useRef(dmTarget);
  const roomIdRef = useRef(roomId);
  const startDmRef = useRef(null);
  useEffect(() => { isDmRef.current = isDm; }, [isDm]);
  useEffect(() => { dmTargetRef.current = dmTarget; }, [dmTarget]);
  useEffect(() => { roomIdRef.current = roomId; }, [roomId]);

  const scrollToBottom = () => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTo({
        top: chatBoxRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  const startDm = (targetId) => {
    setMessages([]);
    lastMessageTimestampRef.current = null;
    setIsDm(true);
    setDmTarget(targetId);
    setRoomId(computeDmRoomId(currentUserId, targetId));
  };
  startDmRef.current = startDm;

  /* ---------- load history ---------- */
  useEffect(() => {
    if (!connected) {
      navigate('/');
      return;
    }

    const loadMessages = async () => {
      try {
        const loadedMessages = await getMessages(roomId);
        setMessages(loadedMessages);
        if (loadedMessages.length > 0) {
          lastMessageTimestampRef.current = loadedMessages[loadedMessages.length - 1].timeStamp;
        }
        scrollToBottom();
      } catch (error) {
        // A DM room only exists after the first message, so a 404 is normal there.
        if (isDm && error?.response?.status === 404) {
          setMessages([]);
          return;
        }
        toast.error('Unable to load older messages.');
      }
    };

    loadMessages();
  }, [connected, navigate, roomId, isDm]);

  /* ---------- websocket ---------- */
  useEffect(() => {
    if (!connected || !roomId) return undefined;

    const client = new Client({
      brokerURL: getWebSocketUrl(),
      // No Authorization header anymore: the browser sends the JWT cookie on the
      // handshake. Because the cookie is only checked at handshake time, refresh it
      // first if it is old, otherwise a reconnect after 15 min would be rejected.
      beforeConnect: async () => {
        try {
          await ensureFreshSession();
        } catch {
          // handshake will fail and stomp will retry
        }
      },
      reconnectDelay: 5000,
      onConnect: () => {
        setStompClient(client);
        toast.success('Connected to chat');

        if (!isDmRef.current) {
          client.subscribe(`/topic/room/${roomId}`, (message) => {
            try {
              const payload = JSON.parse(message.body);
              setMessages((prev) => appendMessage(prev, payload));
              lastMessageTimestampRef.current = payload.timeStamp;
              scrollToBottom();
            } catch {
              toast.error('Error receiving message');
            }
          });
        }

        // Always subscribed, so a DM notification can pop up even while you are in a group room.
        // The server sends your own DMs here too (to both participants).
        client.subscribe('/user/queue/dm', (message) => {
          try {
            const payload = JSON.parse(message.body);
            const viewingThisDm = isDmRef.current && payload.roomId === roomIdRef.current;

            if (viewingThisDm) {
              setMessages((prev) => appendMessage(prev, payload));
              lastMessageTimestampRef.current = payload.timeStamp;
              scrollToBottom();
            } else if (payload.sender !== currentUserId) {
              toast.custom((t) => (
                  <DmToast
                      payload={payload}
                      onOpen={() => {
                        toast.dismiss(t.id);
                        startDmRef.current(payload.sender);
                      }}
                  />
              ));
            }
          } catch {
            toast.error('Error receiving message');
          }
        });

        client.subscribe('/user/queue/errors', (message) => {
          toast.error(message.body);
        });

        client.subscribe('/user/queue/room-events', (message) => {
          try {
            const event = JSON.parse(message.body);
            if (event.type === 'LEFT_ROOM' && event.roomId === roomId) {
              client.deactivate();
            }
          } catch {
            // ignore malformed events
          }
        });

        // Reconnect catch-up: fetch whatever arrived while the socket was down.
        if (lastMessageTimestampRef.current) {
          const since = toBackendTimestamp(lastMessageTimestampRef.current);
          if (since) {
            getMessagesSince(roomId, since)
                .then((missed) => {
                  if (!missed.length) return;
                  setMessages((prev) => {
                    const existingIds = new Set(prev.map((m) => m.id));
                    const newOnes = missed.filter((m) => !existingIds.has(m.id));
                    if (!newOnes.length) return prev;
                    lastMessageTimestampRef.current = newOnes[newOnes.length - 1].timeStamp;
                    return [...prev, ...newOnes];
                  });
                  scrollToBottom();
                })
                .catch(() => {
                  if (!isDmRef.current) toast.error('Unable to fetch missed messages.');
                });
          }
        }
      },
      onStompError: (frame) => {
        toast.error(frame.body || 'WebSocket error.');
      },
      onWebSocketError: () => {
        toast.error('Unable to connect to chat server.');
      },
      onDisconnect: () => {
        setStompClient(null);
      },
    });

    client.activate();

    return () => {
      client.deactivate();
      setStompClient(null);
    };
  }, [connected, roomId, isDm, currentUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  /* ---------- actions ---------- */
  const sendMessage = () => {
    if (!stompClient || !connected || !input.trim()) {
      return;
    }

    const payload = { message: input.trim() };

    try {
      // dmTarget is the other user's id (the backend looks users up by id)
      const destination = isDm
          ? `/app/dm/${dmTarget}`
          : `/app/sendMessages/${roomId}`;

      stompClient.publish({ destination, body: JSON.stringify(payload) });
      setInput('');
    } catch (error) {
      toast.error('Failed to send message: ' + error.message);
    }
  };

  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    try {
      if (isDm) {
        await uploadDmFileApi(dmTarget, files);
      } else {
        await uploadFileApi(roomId, files);
      }
    } catch (error) {
      const message = error?.response?.data || 'Upload failed.';
      toast.error(typeof message === 'string' ? message : 'Upload failed.');
    } finally {
      event.target.value = '';
    }
  };

  const resetChatState = () => {
    setConnected(false);
    setRoomId('');
    setIsDm(false);
    setDmTarget('');
  };

  const handleLeaveRoom = async () => {
    if (!isDm) {
      try {
        await leaveRoomApi(roomId);
      } catch {
        // non-blocking
      }
    }

    resetChatState();
    navigate('/');
  };

  const handleLogout = async () => {
    if (!isDm) {
      try {
        await leaveRoomApi(roomId);
      } catch {
        // non-blocking
      }
    }

    resetChatState();
    await logout();
    navigate('/login');
  };

  // Membership changes over time, so fetch the live list when the modal opens.
  const openMembers = async () => {
    try {
      setRoomUsers(await getRoomMembersApi(roomId));
    } catch {
      // fall back to whatever we already have
    }
    setShowMembers(true);
  };

  /* ---------- derived data ---------- */
  const groupedMessages = useMemo(() => {
    return messages.map((message, index) => ({
      ...message,
      id: message.id || `${message.sender}-${message.content}-${index}`,
    }));
  }, [messages]);

  const otherMembers = useMemo(
      () => (roomUsers || []).filter((id) => id !== currentUserId),
      [roomUsers, currentUserId]
  );

  const senderIds = useMemo(
      () => [...new Set(messages.map((m) => m.sender))],
      [messages]
  );
  const nameOf = useUsernames([...senderIds, dmTarget, currentUserId]);

  return (
      <div className="flex h-screen bg-ink text-cream">
        {/* Sidebar */}
        <aside className="hidden w-60 shrink-0 flex-col border-r border-border-subtle bg-surface sm:flex">
          <div className="border-b border-border-subtle px-5 py-5">
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted">
              {isDm ? 'direct message' : 'live room'}
            </p>
            <p className="mt-1 truncate font-mono text-sm text-cream">
              {isDm ? nameOf(dmTarget) : roomId}
            </p>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-4">
            {!isDm && (
                <button
                    type="button"
                    onClick={openMembers}
                    className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted transition hover:bg-surface-raised hover:text-cream"
                >
                  <MdGroup size={17} />
                  Members
                </button>
            )}
            <button
                type="button"
                onClick={() => navigate('/discover')}
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted transition hover:bg-surface-raised hover:text-cream"
            >
              <MdExplore size={17} />
              Discover rooms
            </button>
            <button
                type="button"
                onClick={() => navigate('/profile')}
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted transition hover:bg-surface-raised hover:text-cream"
            >
              <MdPerson size={17} />
              Profile
            </button>
          </nav>

          <div className="space-y-1 border-t border-border-subtle px-3 py-4">
            <div className="mb-2 flex items-center gap-2 rounded-md bg-surface-raised px-3 py-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-sage" />
              <span className="truncate font-mono text-xs text-cream">{user?.username || 'unknown'}</span>
            </div>
            <button
                type="button"
                onClick={handleLeaveRoom}
                className="w-full rounded-md px-3 py-2 text-left text-sm text-muted transition hover:bg-surface-raised hover:text-cream"
            >
              {isDm ? 'Close DM' : 'Leave room'}
            </button>
            <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-rose transition hover:bg-rose/10"
            >
              <MdLogout size={16} />
              Log out
            </button>
          </div>
        </aside>

        {showMembers && (
            <MembersModal
                members={otherMembers}
                onMessagePrivately={startDm}
                onClose={() => setShowMembers(false)}
            />
        )}

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-border-subtle bg-surface/60 px-5 py-3.5 backdrop-blur">
            <p className="truncate font-mono text-sm text-cream">
              {isDm ? `@${nameOf(dmTarget)}` : `#${roomId}`}
            </p>
            <button
                type="button"
                onClick={handleLeaveRoom}
                className="rounded-md px-3 py-1.5 text-xs text-muted transition hover:text-cream sm:hidden"
            >
              {isDm ? 'Close' : 'Leave'}
            </button>
          </header>

          <main ref={chatBoxRef} className="flex-1 overflow-y-auto px-5 py-4">
            {groupedMessages.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-muted">No messages yet. Start the conversation.</p>
                </div>
            ) : (
                <div className="mx-auto flex max-w-3xl flex-col">
                  {groupedMessages.map((message) => (
                      <div
                          key={message.id}
                          className="group flex gap-3 rounded-md px-2 py-2 transition hover:bg-surface/50"
                      >
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-raised text-sm font-semibold text-muted">
                          {(nameOf(message.sender)[0] || '?').toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                      <span
                          className={`font-mono text-sm font-medium ${
                              message.sender === currentUserId ? 'text-amber' : 'text-cream'
                          }`}
                      >
                        {nameOf(message.sender)}
                      </span>
                            <span className="font-mono text-[11px] text-muted">
                        {formatTime(message.timeStamp)}
                      </span>
                          </div>

                          {message.type === 'IMAGE' || message.type === 'VIDEO' || message.type === 'AUDIO' ? (
                              <div className="mt-1.5">
                                <MediaMessage url={message.content} type={message.type} />
                              </div>
                          ) : (
                              <p className="mt-0.5 break-words text-sm leading-relaxed text-cream/90">
                                {message.content}
                              </p>
                          )}
                        </div>
                      </div>
                  ))}
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
                  onClick={() => fileInputRef.current?.click()}
                  className="shrink-0 rounded-md p-2 text-muted transition hover:bg-surface-raised hover:text-cream"
              >
                <MdAttachFile size={18} />
              </button>
              <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && sendMessage()}
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