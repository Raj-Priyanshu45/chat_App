import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import toast from 'react-hot-toast';
import { MdSend, MdAttachFile, MdGroup } from 'react-icons/md';
import useChatContext from '../context/ChatContext';
import useAuth from '../context/AuthContext';
import { getWebSocketUrl } from '../config/AxiosHelper';
import {
  getMessages,
  getMessagesSince,
  leaveRoomApi,
  uploadFileApi,
  uploadDmFileApi,
  computeDmRoomId,
} from '../services/RoomService';
import { formatTime, toBackendTimestamp } from '../config/helper';
import MediaMessage from './MediaMessage';
import MembersModal from './MembersModal';

const ChatPage = () => {
  const {
    roomId, currentUser, connected, roomUsers, isDm, dmTarget,
    setConnected, setRoomId, setCurrentUser, setIsDm, setDmTarget,
  } = useChatContext();
  const { authenticated, token, user, logout } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [stompClient, setStompClient] = useState(null);
  const [showMembers, setShowMembers] = useState(false);
  const chatBoxRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastMessageTimestampRef = useRef(null);
  const navigate = useNavigate();

  // isDm/dmTarget change frequently inside the onConnect closure below —
  // refs let the closure always read the *current* value instead of the
  // value captured when the STOMP client was first created.
  const isDmRef = useRef(isDm);
  const dmTargetRef = useRef(dmTarget);
  useEffect(() => { isDmRef.current = isDm; }, [isDm]);
  useEffect(() => { dmTargetRef.current = dmTarget; }, [dmTarget]);

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
        if (isDm && error?.response?.status === 404) {
          setMessages([]);
          return;
        }
        toast.error('Unable to load older messages.');
      }
    };

    loadMessages();
  }, [connected, navigate, roomId, isDm]);

  useEffect(() => {
    if (!authenticated || !connected || !roomId || !token) {
      if (!authenticated) {
        navigate('/');
      }
      return undefined;
    }

    const client = new Client({
      brokerURL: getWebSocketUrl(),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: 5000,
      onConnect: () => {
        setStompClient(client);
        toast.success('Connected to chat');

        if (!isDmRef.current) {
          client.subscribe(`/topic/room/${roomId}`, (message) => {
            try {
              const payload = JSON.parse(message.body);
              setMessages((prev) => [...prev, payload]);
              lastMessageTimestampRef.current = payload.timeStamp;
              scrollToBottom();
            } catch {
              toast.error('Error receiving message');
            }
          });
        }

        // Always subscribed, regardless of current view — this is what lets
        // a DM notification pop up even while you're inside a group room.
        client.subscribe('/user/queue/dm', (message) => {
          try {
            const payload = JSON.parse(message.body);
            const viewingThisDm = isDmRef.current && dmTargetRef.current === payload.sender;

            if (viewingThisDm) {
              setMessages((prev) => [...prev, payload]);
              lastMessageTimestampRef.current = payload.timeStamp;
              scrollToBottom();
            } else {
              toast.custom((t) => (
                <div
                  onClick={() => {
                    toast.dismiss(t.id);
                    setMessages([]);
                    lastMessageTimestampRef.current = null;
                    setIsDm(true);
                    setDmTarget(payload.sender);
                    setRoomId(computeDmRoomId(currentUserId, payload.sender));
                  }}
                  className="cursor-pointer rounded-xl border border-cyan-600 bg-slate-800 px-4 py-3 text-sm text-white shadow-lg"
                >
                  <p className="font-semibold text-cyan-300">New message from {payload.sender}</p>
                  <p className="mt-1 truncate text-slate-300">
                    {payload.type === 'TEXT' ? payload.content : `Sent a ${payload.type?.toLowerCase()}`}
                  </p>
                </div>
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
                if (!isDm) toast.error('Unable to fetch missed messages.');
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
  }, [authenticated, connected, roomId, token, navigate, isDm]);

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTo({
        top: chatBoxRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  const scrollToBottom = () => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTo({
        top: chatBoxRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  const sendMessage = () => {
    if (!stompClient || !connected || !input.trim()) {
      return;
    }

    const payload = { message: input.trim() };

    try {
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

  const handleLeaveRoom = async () => {
    if (stompClient) stompClient.deactivate();

    if (!isDm) {
      try {
        await leaveRoomApi(roomId);
      } catch {
        // non-blocking
      }
    }

    setConnected(false);
    setRoomId('');
    setIsDm(false);
    setDmTarget('');
    navigate('/');
  };

  const handleLogout = async () => {
    if (stompClient) stompClient.deactivate();

    if (!isDm) {
      try {
        await leaveRoomApi(roomId);
      } catch {
        // non-blocking
      }
    }

    setConnected(false);
    setRoomId('');
    setCurrentUser('');
    setIsDm(false);
    setDmTarget('');
    logout();
    navigate('/');
  };

  const handleStartDm = (targetUsername) => {
    if (stompClient) stompClient.deactivate();

    setMessages([]);
    lastMessageTimestampRef.current = null;
    setIsDm(true);
    setDmTarget(targetUsername);
    setRoomId(computeDmRoomId(currentUserId, targetUsername));
  };

  const currentUserId = currentUser || user?.username || user?.name || user?.subject || '';

  const groupedMessages = useMemo(() => {
    return messages.map((message, index) => ({
      ...message,
      id: message.id || `${message.sender}-${message.content}-${index}`,
    }));
  }, [messages]);

  const otherMembers = useMemo(
    () => (roomUsers || []).filter((u) => u !== currentUserId),
    [roomUsers, currentUserId]
  );

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),_transparent_40%),linear-gradient(135deg,#020617_0%,#0f172a_100%)] text-slate-100">
      <header className="border-b border-slate-800/70 bg-slate-900/80 px-4 py-4 shadow-sm backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-400">
              {isDm ? 'Direct message' : 'Live room'}
            </p>
            <h1 className="mt-1 text-xl font-semibold text-white">
              {isDm ? `DM: ${dmTarget}` : `Room: ${roomId}`}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">
              {currentUserId || 'Unknown user'}
            </div>

            {!isDm && (
              <button
                type="button"
                onClick={() => setShowMembers(true)}
                className="flex items-center gap-1 rounded-full border border-slate-700 px-3 py-2 text-sm transition hover:bg-slate-800"
              >
                <MdGroup size={16} />
                Members
              </button>
            )}

            <button
              type="button"
              onClick={handleLeaveRoom}
              className="rounded-full border border-slate-700 px-3 py-2 text-sm transition hover:bg-slate-800"
            >
              {isDm ? 'Close DM' : 'Leave room'}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full border border-red-500/40 px-3 py-2 text-sm text-red-300 transition hover:bg-red-500/10"
            >
              Logout
            </button>
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="rounded-full border border-slate-700 px-3 py-2 text-sm transition hover:bg-slate-800"
            >
              Profile
            </button>
          </div>
        </div>
      </header>

      {showMembers && (
        <MembersModal
          members={otherMembers}
          onMessagePrivately={handleStartDm}
          onClose={() => setShowMembers(false)}
        />
      )}

      <main ref={chatBoxRef} className="mx-auto flex-1 w-full max-w-6xl overflow-y-auto px-4 py-6 sm:px-6">
        {groupedMessages.length === 0 ? (
          <div className="mt-12 rounded-[24px] border border-dashed border-slate-700 bg-slate-900/70 p-8 text-center text-slate-400 shadow-lg">
            No messages yet. Start the conversation.
          </div>
        ) : (
          groupedMessages.map((message) => (
            <div
              key={message.id}
              className={`mb-4 flex ${message.sender === currentUserId ? 'justify-end' : 'justify-start'}`}
            >
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-slate-700 text-white flex items-center justify-center text-sm font-semibold">
                  {(message.sender?.[0] || '?').toUpperCase()}
                </div>
                <div
                  className={`max-w-[80%] rounded-[20px] px-4 py-3 shadow-sm ${message.sender === currentUserId ? 'bg-cyan-600 text-white' : 'bg-slate-800/90 text-slate-100 hover:bg-slate-700/50'}`}
                >
                  <div className="mb-1 text-sm font-semibold">
                    {message.sender === currentUserId ? currentUserId : message.sender}
                  </div>

                  {message.type === 'IMAGE' || message.type === 'VIDEO' || message.type === 'AUDIO' ? (
                    <MediaMessage filename={message.content} type={message.type} />
                  ) : (
                    <div className="break-words text-sm">{message.content}</div>
                  )}

                  <div className={`mt-2 text-[11px] ${message.sender === currentUserId ? 'text-cyan-100' : 'text-slate-400'}`}>
                    {formatTime(message.timeStamp)}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </main>

      <footer className="border-t border-slate-800/70 bg-slate-900/80 px-4 py-4 shadow-inner backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center gap-3 rounded-full border border-slate-700 bg-slate-800/90 px-3 py-3 focus-within:border-cyan-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-cyan-600">
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
            className="rounded-full border border-slate-700 p-3 transition hover:bg-slate-800"
          >
            <MdAttachFile size={18} />
          </button>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && sendMessage()}
            placeholder="Type your message..."
            className="flex-1 bg-transparent px-3 py-2 text-sm outline-none"
          />
          <button
            type="button"
            onClick={sendMessage}
            className="rounded-full bg-cyan-600 p-3 transition hover:bg-cyan-500"
          >
            <MdSend size={18} />
          </button>
        </div>
      </footer>
    </div>
  );
};

export default ChatPage;