import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { flushSync } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { fetchWsTicketApi } from '../services/ProfileService';
import Avatar from './Avatar';
import ChatSidebar from './ChatSidebar';
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
  MdVisibility,
  MdHome,
  MdMeetingRoom,
  MdAddReaction,
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
  getUnreadCountApi,
  getMessageReadReceiptsApi,
} from '../services/RoomService';

import { lookupUsernamesApi } from '../services/UserService';

import {
  formatTime,
  toBackendTimestamp,
  toEpoch,
} from '../config/helper';
import { useReadTracking } from '../hooks/useReadTracking';

import MediaMessage from './MediaMessage';
import MembersModal from './MembersModal';
import ActionDialog from './ActionDialog';

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

const REACTION_EMOJIS = ['👍', '❤️', '😂', '🎉', '😮', '👀'];

const dispatchUnreadUpdate = (detail) => {
  if (typeof window === 'undefined') return;
  window.setTimeout(() => {
    window.dispatchEvent(new CustomEvent('chatcom:unread-updated', { detail }));
  }, 0);
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
    setRoomUsers,
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
  const [unreadMarker, setUnreadMarker] = useState(null);
  const [newBelow, setNewBelow] = useState(0);
  const [readReceipt, setReadReceipt] = useState(null);
  const [receiptSummaryById, setReceiptSummaryById] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [receiptLoadingFor, setReceiptLoadingFor] = useState(null);
  const [typingUserIds, setTypingUserIds] = useState([]);
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [presenceByUserId, setPresenceByUserId] = useState({});
  const [presenceReady, setPresenceReady] = useState(false);
  const [reactionPickerFor, setReactionPickerFor] = useState(null);
  const [mobileRoomsOpen, setMobileRoomsOpen] = useState(() =>
      !roomId && typeof window !== 'undefined' && window.matchMedia('(max-width: 860px)').matches
  );

  // Inline edit state
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  // Internal ID -> visible username
  const [usernamesById, setUsernamesById] = useState({});

  const chatBoxRef = useRef(null);
  const fileInputRef = useRef(null);
  const composerInputRef = useRef(null);
  const lastMessageTimestampRef = useRef(null);
  const prevLengthRef = useRef(0);
  const stickRef = useRef(true);
  const receiptRequestRef = useRef(0);
  const messagesRef = useRef(messages);
  const touchStartRef = useRef(null);
  const typingTimeoutsRef = useRef(new Map());
  const localTypingTimerRef = useRef(null);
  const localTypingRef = useRef(false);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const usernamesRef = useRef({});

  const { markReady, noteOwnMessage, isReady } = useReadTracking({
    roomId,
    scrollRef: chatBoxRef,
    messageCount: messages.length,
  });

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

  // Consume transient STOMP events before treating a payload as a message.
  const handleRealtimeEvent = useCallback((payload) => {
    const type = payload?.type;
    if (!['TYPING', 'PRESENCE', 'PRESENCE_SNAPSHOT', 'MESSAGE_REACTION_UPDATED'].includes(type)) {
      return false;
    }

    // Presence events arriving through the DM queue may refer to any of this user's DMs.
    if (payload.roomId && payload.roomId !== roomId && type !== 'PRESENCE') return true;

    if (type === 'TYPING') {
      const userId = payload.userId;
      if (!userId || userId === currentUserId) return true;
      const existingTimer = typingTimeoutsRef.current.get(userId);
      if (existingTimer) clearTimeout(existingTimer);

      if (payload.typing) {
        setTypingUserIds((previous) => previous.includes(userId) ? previous : [...previous, userId]);
        void resolveUsernames([userId]);
        const timeout = setTimeout(() => {
          setTypingUserIds((previous) => previous.filter((id) => id !== userId));
          typingTimeoutsRef.current.delete(userId);
        }, 2600);
        typingTimeoutsRef.current.set(userId, timeout);
      } else {
        setTypingUserIds((previous) => previous.filter((id) => id !== userId));
        typingTimeoutsRef.current.delete(userId);
      }
      return true;
    }

    if (type === 'PRESENCE') {
      if (!payload.userId || payload.userId === currentUserId) return true;
      setPresenceByUserId((previous) => ({ ...previous, [payload.userId]: Boolean(payload.online) }));
      if (payload.roomId === roomId) {
        setPresenceReady(true);
        setOnlineUserIds((previous) => {
          const next = new Set(previous);
          if (payload.online) next.add(payload.userId);
          else next.delete(payload.userId);
          return [...next];
        });
      }
      return true;
    }

    if (type === 'PRESENCE_SNAPSHOT') {
      const onlineIds = (payload.onlineUserIds || []).filter(Boolean);
      setPresenceReady(true);
      setOnlineUserIds(onlineIds);
      setPresenceByUserId((previous) => {
        const next = { ...previous };
        onlineIds.forEach((id) => { next[id] = true; });
        // A snapshot is authoritative for the currently open DM target.
        if (isDmRef.current && dmTargetRef.current) {
          next[dmTargetRef.current] = onlineIds.includes(dmTargetRef.current);
        }
        return next;
      });
      return true;
    }

    if (type === 'MESSAGE_REACTION_UPDATED') {
      setMessages((previous) => previous.map((message) =>
          (message.id || message.realId) === payload.messageId
              ? { ...message, reactions: payload.reactions || {} }
              : message
      ));
      return true;
    }

    return true;
  }, [roomId, currentUserId, resolveUsernames]);

  useEffect(() => {
    setTypingUserIds([]);
    setOnlineUserIds([]);
    setPresenceReady(false);
    setReactionPickerFor(null);
    localTypingRef.current = false;
    if (localTypingTimerRef.current) clearTimeout(localTypingTimerRef.current);
    typingTimeoutsRef.current.forEach((timer) => clearTimeout(timer));
    typingTimeoutsRef.current.clear();
  }, [roomId]);

  useEffect(() => () => {
    if (localTypingTimerRef.current) clearTimeout(localTypingTimerRef.current);
    typingTimeoutsRef.current.forEach((timer) => clearTimeout(timer));
    typingTimeoutsRef.current.clear();
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
    setReadReceipt(null);
    setReceiptLoadingFor(null);
    receiptRequestRef.current += 1;
    setUnreadMarker(null);
    setNewBelow(0);
    stickRef.current = true;
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
   * Load message history and unread count before enabling automatic read tracking.
   */
  useEffect(() => {
    if (!connected || !roomId) return undefined;

    let cancelled = false;

    const loadMessages = async () => {
      setUnreadMarker(null);
      setNewBelow(0);
      stickRef.current = true;

      try {
        const loadedMessages = await getMessages(roomId);
        if (cancelled) return;

        // Fetch the unread count before any observer-triggered PATCH /read calls.
        let unreadCount = 0;
        try {
          unreadCount = await getUnreadCountApi(roomId);
        } catch {
          // A newly opened DM may not exist yet. Keep the chat usable without the badge.
        }
        if (cancelled) return;

        const unreadInLoadedPage = Math.min(Math.max(0, Number(unreadCount) || 0), loadedMessages.length);
        const firstUnreadIndex = loadedMessages.length - unreadInLoadedPage;
        const firstUnread = unreadInLoadedPage > 0 ? loadedMessages[firstUnreadIndex] : null;
        const lastRead = firstUnreadIndex > 0 ? loadedMessages[firstUnreadIndex - 1] : null;

        // Prevent the initial history render from being mistaken for new incoming messages.
        prevLengthRef.current = loadedMessages.length;
        flushSync(() => {
          setMessages(loadedMessages);
          setUnreadMarker(firstUnread?.id ? { id: firstUnread.id, count: Number(unreadCount) || unreadInLoadedPage } : null);
        });

        if (loadedMessages.length > 0) {
          lastMessageTimestampRef.current = loadedMessages[loadedMessages.length - 1].timeStamp;
        } else {
          lastMessageTimestampRef.current = null;
        }

        const box = chatBoxRef.current;
        if (box) {
          const firstUnreadElement = firstUnread?.id
              ? box.querySelector(`[data-mid="${CSS.escape(firstUnread.id)}"]`)
              : null;

          if (firstUnreadElement) {
            firstUnreadElement.scrollIntoView({ block: 'start' });
            stickRef.current = false;
          } else {
            box.scrollTop = box.scrollHeight;
            stickRef.current = true;
          }
        }

        markReady(lastRead);

        if (loadedMessages.length > 0) {
          await resolveUsernames(loadedMessages.map((message) => message.sender));
        }
      } catch (error) {
        if (cancelled) return;
        if (isDm && error?.response?.status === 404) {
          prevLengthRef.current = 0;
          setMessages([]);
          markReady(null);
          return;
        }
        toast.error('Unable to load message history.');
      }
    };

    void loadMessages();
    return () => { cancelled = true; };
  }, [connected, roomId, isDm, resolveUsernames, markReady]);

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
                  if (handleRealtimeEvent(payload)) return;

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
                  dispatchUnreadUpdate({ roomId: payload.roomId || roomId, messageId: payload.id });
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

                if (handleRealtimeEvent(payload)) return;

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

                if (payload.roomId) {
                  dispatchUnreadUpdate({ roomId: payload.roomId, messageId: payload.id });
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

        // Presence snapshots are private to the authenticated WebSocket user.
        client.subscribe('/user/queue/presence', (message) => {
          try {
            handleRealtimeEvent(JSON.parse(message.body));
          } catch {
            // Ignore malformed presence data.
          }
        });

        client.publish({
          destination: `/app/chat/presence/${roomId}`,
          body: '{}',
        });

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
        setStompClient(null);
        toast.error(
            'Unable to connect to chat server.'
        );
      },

      onWebSocketClose: () => {
        setStompClient(null);
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
    handleRealtimeEvent,
    setConnected,
    setDmTarget,
    setIsDm,
    setRoomId,
  ]);

  /*
   * New messages scroll only when the user was already at the bottom.
   * Own messages keep the sender's local pointer synchronized.
   */
  useEffect(() => {
    const added = messages.length - prevLengthRef.current;
    prevLengthRef.current = messages.length;

    if (added <= 0 || !isReady()) return;

    const lastMessage = messages[messages.length - 1];
    const isOwnMessage = lastMessage?.sender === currentUserId;

    if (isOwnMessage) noteOwnMessage(lastMessage);

    if (isOwnMessage || stickRef.current) {
      stickRef.current = true;
      setNewBelow(0);
      scrollToBottom();
    } else {
      setNewBelow((count) => count + added);
    }
  }, [messages.length, currentUserId, isReady, noteOwnMessage]);

  const handleScroll = () => {
    const box = chatBoxRef.current;
    if (!box) return;

    const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
    stickRef.current = nearBottom;
    if (nearBottom) setNewBelow(0);
  };

  const publishTypingState = useCallback((typing) => {
    if (!stompClient || !connected || !roomId) return;
    if (!stompClient.connected) {
      // If a connection drops mid-composition, let the remote timeout clear state
      // and reset locally so a reconnect can publish a fresh typing=true event.
      if (!typing) localTypingRef.current = false;
      return;
    }
    if (localTypingRef.current === typing) return;
    try {
      stompClient.publish({
        destination: `/app/chat/typing/${roomId}`,
        body: JSON.stringify({ typing }),
      });
      localTypingRef.current = typing;
    } catch {
      // Typing is best-effort; message delivery is independent.
    }
  }, [stompClient, connected, roomId]);

  const toggleReaction = (messageId, emoji) => {
    if (!stompClient || !connected || !messageId || !roomId) return;
    try {
      stompClient.publish({
        destination: `/app/chat/reaction/${roomId}`,
        body: JSON.stringify({ messageId, emoji }),
      });
      setReactionPickerFor(null);
    } catch {
      toast.error('Could not send reaction. Please try again.');
    }
  };

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

    const messageText = input.trim();
    const payload = {
      message: messageText,
    };

    try {
      const destination = isDm
          ? `/app/dm/${dmTarget}`
          : `/app/sendMessages/${roomId}`;

      stompClient.publish({
        destination,
        body: JSON.stringify(payload),
      });

      if (localTypingTimerRef.current) clearTimeout(localTypingTimerRef.current);
      publishTypingState(false);
      setInput('');
      if (composerInputRef.current) composerInputRef.current.style.height = 'auto';
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

    setDeleteTarget(message);
  };

  const confirmDeleteMessage = () => {
    if (!deleteTarget || !stompClient || !connected) return;
    try {
      stompClient.publish({
        destination: '/app/chat/del',
        body: JSON.stringify({ messId: deleteTarget.realId, roomId }),
      });
      setDeleteTarget(null);
    } catch (error) {
      toast.error(`Failed to delete message: ${error.message}`);
    }
  };

  const handleComposerChange = (event) => {
    const nextValue = event.target.value;
    setInput(nextValue);
    event.target.style.height = 'auto';
    event.target.style.height = `${Math.min(event.target.scrollHeight, 160)}px`;

    if (localTypingTimerRef.current) clearTimeout(localTypingTimerRef.current);
    if (nextValue.trim()) {
      publishTypingState(true);
      localTypingTimerRef.current = setTimeout(() => publishTypingState(false), 1500);
    } else {
      publishTypingState(false);
    }
  };

  const handleComposerKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent?.isComposing) {
      event.preventDefault();
      sendMessage();
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
    prevLengthRef.current = 0;
    setRoomUsers([]);

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

  const openRoomFromSidebar = (targetRoomId) => {
    if (!targetRoomId || !currentUserId) return;
    if (!isDm && targetRoomId === roomId) {
      setMobileRoomsOpen(false);
      return;
    }

    if (stompClient) stompClient.deactivate();
    setMessages([]);
    prevLengthRef.current = 0;
    lastMessageTimestampRef.current = null;
    setCurrentUser(currentUserId);
    setRoomUsers([]);
    setIsDm(false);
    setDmTarget('');
    setRoomId(targetRoomId);
    setConnected(true);
    setMobileRoomsOpen(false);
  };

  const openDmFromSidebar = (targetUserId) => {
    handleStartDm(targetUserId);
    setMobileRoomsOpen(false);
  };

  const handleChatTouchStart = (event) => {
    const touch = event.touches?.[0];
    if (touch) touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleChatTouchEnd = (event) => {
    const start = touchStartRef.current;
    const touch = event.changedTouches?.[0];
    touchStartRef.current = null;
    if (!start || !touch || window.innerWidth > 860) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = Math.abs(touch.clientY - start.y);
    if (start.x <= 24 && deltaX >= 90 && deltaY <= 64) {
      setMobileRoomsOpen(true);
    } else if (mobileRoomsOpen && start.x >= 40 && deltaX <= -90 && deltaY <= 64) {
      setMobileRoomsOpen(false);
    }
  };

  // Recalculate the divider after the server confirms a pointer advance. This
  // removes the unread marker when the unread count reaches zero.
  useEffect(() => {
    const refreshUnreadMarker = async (event) => {
      if (event.detail?.roomId !== roomId) return;

      try {
        const unreadCount = Math.max(0, Number(await getUnreadCountApi(roomId)) || 0);
        const currentMessages = messagesRef.current;
        if (unreadCount === 0 || currentMessages.length === 0) {
          setUnreadMarker(null);
          return;
        }

        const unreadInLoadedPage = Math.min(unreadCount, currentMessages.length);
        const firstUnreadIndex = currentMessages.length - unreadInLoadedPage;
        const firstUnread = currentMessages[firstUnreadIndex];
        setUnreadMarker(firstUnread?.id ? { id: firstUnread.id, count: unreadCount } : null);
      } catch {
        // Preserve the last known divider if the network is temporarily unavailable.
      }
    };

    window.addEventListener('chatcom:unread-updated', refreshUnreadMarker);
    return () => window.removeEventListener('chatcom:unread-updated', refreshUnreadMarker);
  }, [roomId]);

  const openReadReceipts = async (message) => {
    if (!message?.realId || message.sender !== currentUserId) return;

    const requestNumber = ++receiptRequestRef.current;
    setReceiptLoadingFor(message.realId);
    setReadReceipt({
      messageId: message.realId,
      readerIds: [],
      readers: [],
      readCount: 0,
      totalRecipients: 0,
      loading: true,
    });

    try {
      const response = await getMessageReadReceiptsApi(message.realId);
      const readerIds = Array.isArray(response?.readerIds) ? response.readerIds : [];
      const namesById = await resolveUsernames(readerIds);
      if (requestNumber !== receiptRequestRef.current) return;
      setReceiptSummaryById((previous) => ({
        ...previous,
        [message.realId]: {
          readCount: Number(response?.readCount ?? readerIds.length),
          totalRecipients: Number(response?.totalRecipients ?? 0),
        },
      }));

      setReadReceipt({
        ...response,
        readerIds,
        readers: readerIds.map((id) => ({
          id,
          username: namesById[id] || 'Unknown user',
        })),
        loading: false,
      });
    } catch (error) {
      if (requestNumber === receiptRequestRef.current) {
        setReadReceipt(null);
        const responseMessage = error?.response?.data?.message || error?.response?.data;
        toast.error(typeof responseMessage === 'string' ? responseMessage : 'Unable to load read receipts.');
      }
    } finally {
      if (requestNumber === receiptRequestRef.current) setReceiptLoadingFor(null);
    }
  };

  const closeReadReceipts = () => {
    receiptRequestRef.current += 1;
    setReadReceipt(null);
    setReceiptLoadingFor(null);
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
  const typingLabel = useMemo(() => {
    const names = typingUserIds.map((id) => usernamesById[id] || 'Someone');
    if (!names.length) return '';
    if (names.length === 1) return `${names[0]} is typing`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing`;
    return `${names.length} people are typing`;
  }, [typingUserIds, usernamesById]);
  const dmTargetOnline = onlineUserIds.includes(dmTarget);

  /*
   * Visible message data.
   * realId = the server id (undefined if the message has none yet),
   * used for edit / delete.
   */
  const groupedMessages = useMemo(() => {
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;

    const normalized = messages.map((message, index) => {
      const epoch = toEpoch(message.timeStamp);
      const date = epoch ? new Date(epoch) : null;
      const dateKey = date ? `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}` : '';
      const dateLabel = !date ? '' : dateKey === todayKey ? 'Today' : dateKey === yesterdayKey ? 'Yesterday' : date.toLocaleDateString([], { month: 'short', day: 'numeric', year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
      return {
        ...message,
        epoch,
        dateKey,
        dateLabel,
        realId: message.id,
        id: message.id || `${message.sender}-${message.content}-${index}`,
        displaySender: usernamesById[message.sender] || (message.sender === currentUserId ? currentUsername : 'Unknown user'),
      };
    });

    return normalized.map((message, index) => {
      const previous = normalized[index - 1];
      const sameDate = Boolean(message.dateKey && previous?.dateKey === message.dateKey);
      const groupedWithPrevious = Boolean(
          previous && sameDate && previous.sender === message.sender &&
          message.epoch && previous.epoch && message.epoch >= previous.epoch &&
          message.epoch - previous.epoch <= 5 * 60 * 1000
      );
      return {
        ...message,
        showDateDivider: Boolean(message.dateKey && (!previous || previous.dateKey !== message.dateKey)),
        groupedWithPrevious,
      };
    });
  }, [messages, usernamesById, currentUserId, currentUsername]);

  return (
      <div className="chat-page page-enter" onTouchStart={handleChatTouchStart} onTouchEnd={handleChatTouchEnd}>
        <aside className="chat-rail">
          <div className="chat-rail-top">
            <button type="button" className="icon-button" onClick={() => navigate('/')} title="Home" aria-label="Home">
              <span className="brand-mark" style={{ width: 34, height: 34, borderRadius: 10 }}>C</span>
            </button>
            {!isDm && <button type="button" className="icon-button" onClick={openMembers} title="Members" aria-label="Members"><MdGroup size={18} /></button>}
            <button type="button" className="icon-button" onClick={() => navigate('/discover')} title="Discover rooms" aria-label="Discover rooms"><MdExplore size={18} /></button>
            <button type="button" className="icon-button" onClick={() => navigate('/profile')} title="Profile" aria-label="Profile"><MdPerson size={18} /></button>
            <span className="chat-rail-label">live workspace</span>
          </div>
          <button type="button" className="icon-button" onClick={handleLogout} title="Log out" aria-label="Log out"><MdLogout size={18} /></button>
        </aside>

        <ChatSidebar
            mobileOpen={mobileRoomsOpen}
            presenceByUserId={presenceByUserId}
            onLogout={handleLogout}
            onCloseMobile={() => setMobileRoomsOpen(false)}
            onOpenRoom={openRoomFromSidebar}
            onOpenDm={openDmFromSidebar}
        />

        <AnimatePresence initial={false}>
          {showMembers && <MembersModal key="members-modal" members={memberViewModels} onMessagePrivately={handleStartDm} onViewProfile={setProfileUserId} onClose={() => setShowMembers(false)} />}
          {profileUserId && (
              <UserProfileModal
                  key={`profile-${profileUserId}`}
                  userId={profileUserId}
                  onMessage={(id) => { setProfileUserId(null); setShowMembers(false); handleStartDm(id); }}
                  onClose={() => setProfileUserId(null)}
              />
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {readReceipt && (
              <motion.div key="read-receipt-overlay" className="read-receipt-overlay" role="presentation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }} onClick={closeReadReceipts}>
                <motion.section
                    className="read-receipt-dialog"
                    initial={{ opacity: 0, scale: 0.96, y: 7 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, y: 4 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="read-receipt-title"
                    onClick={(event) => event.stopPropagation()}
                >
                  <div className="read-receipt-header">
                    <div>
                      <div className="page-kicker">message details</div>
                      <h2 id="read-receipt-title" className="read-receipt-title">Read receipts</h2>
                      <p className="read-receipt-summary">
                        {readReceipt.loading
                            ? 'Loading readers…'
                            : `Read by ${readReceipt.readCount ?? readReceipt.readers?.length ?? 0} of ${readReceipt.totalRecipients ?? 0} active recipients`}
                      </p>
                    </div>
                    <button type="button" className="icon-button" onClick={closeReadReceipts} aria-label="Close read receipts" title="Close">
                      <MdClose size={18} />
                    </button>
                  </div>

                  {readReceipt.loading ? (
                      <div className="read-receipt-empty">Loading reader list…</div>
                  ) : readReceipt.readers?.length ? (
                      <ul className="read-receipt-list">
                        {readReceipt.readers.map((reader) => (
                            <li key={reader.id} className="read-receipt-reader">
                    <span className="read-receipt-avatar" aria-hidden="true">
                      {(reader.username?.[0] || '?').toUpperCase()}
                    </span>
                              <span className="read-receipt-username">@{reader.username}</span>
                              <span className="read-receipt-status">Read</span>
                            </li>
                        ))}
                      </ul>
                  ) : (
                      <div className="read-receipt-empty">
                        {(readReceipt.totalRecipients ?? 0) === 0
                            ? 'There are no other active recipients in this room.'
                            : 'Nobody has read this message yet.'}
                      </div>
                  )}
                </motion.section>
              </motion.div>
          )}
        </AnimatePresence>

        <ActionDialog
            open={Boolean(deleteTarget)}
            eyebrow="message moderation"
            title="Delete this message?"
            description="This message will be removed from the conversation for everyone. This action cannot be undone."
            confirmLabel="Delete message"
            destructive
            onConfirm={confirmDeleteMessage}
            onCancel={() => setDeleteTarget(null)}
        />

        <section className="chat-workspace">
          <header className="chat-header">
            <div className="chat-header-main">
              <div className="chat-header-kicker">{isDm ? 'direct conversation' : 'live room'}</div>
              <div className="chat-header-title">{isDm ? <><span>@</span>{dmTargetUsername}</> : <><span>#</span>{roomId}</>}</div>
              {presenceReady && (isDm || onlineUserIds.length > 0) && (
                  <div className="chat-presence-summary">
                    <span className={`presence-dot${(isDm ? dmTargetOnline : onlineUserIds.length > 0) ? ' is-online' : ''}`} />
                    {isDm ? (dmTargetOnline ? 'Online' : 'Offline') : `${onlineUserIds.length} online`}
                  </div>
              )}
            </div>
            <div className="chat-header-actions">
              <div className={`connection-pill${stompClient?.connected ? '' : ' is-reconnecting'}`} aria-live="polite"><span className="live-dot" /> {stompClient?.connected ? 'Connected' : 'Reconnecting…'}</div>
              {!isDm && <button type="button" className="btn btn-secondary" onClick={openMembers}><MdGroup size={16} /> Members</button>}
              <button type="button" className="icon-button" onClick={handleLeaveRoom} title={isDm ? 'Close conversation' : 'Leave room'} aria-label={isDm ? 'Close conversation' : 'Leave room'}><MdClose size={18} /></button>
            </div>
          </header>

          <main ref={chatBoxRef} className="chat-scroll" aria-label="Messages" onScroll={handleScroll}>
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
                  <AnimatePresence initial={false}>
                    {groupedMessages.flatMap((message) => {
                      const isOwn = message.sender === currentUserId;
                      const isTextMessage = !message.type || message.type === 'TEXT';
                      const isEditing = editingId !== null && editingId === message.realId;
                      const canModify = isOwn && Boolean(message.realId) && !isEditing;
                      const items = [];

                      if (message.showDateDivider) {
                        items.push(
                            <motion.div
                                key={`date-${message.dateKey}`}
                                className="message-date-separator"
                                role="separator"
                                aria-label={message.dateLabel}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -3 }}
                                transition={{ duration: 0.18 }}
                            >
                              <span>{message.dateLabel}</span>
                            </motion.div>
                        );
                      }

                      if (message.realId && unreadMarker?.id === message.realId) {
                        items.push(
                            <motion.div
                                key={`unread-${message.realId}`}
                                className="unread-divider"
                                role="separator"
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -3 }}
                                transition={{ duration: 0.18 }}
                            >
                              <span>{unreadMarker.count} new message{unreadMarker.count === 1 ? '' : 's'}</span>
                            </motion.div>
                        );
                      }

                      items.push(
                          <motion.article
                              key={message.id}
                              layout
                              initial={{ opacity: 0, x: isOwn ? 12 : -12, y: 4 }}
                              animate={{ opacity: 1, x: 0, y: 0 }}
                              exit={{ opacity: 0, x: isOwn ? 8 : -8 }}
                              transition={{ type: 'spring', stiffness: 430, damping: 38, mass: 0.7 }}
                              className={`message-row${message.groupedWithPrevious ? ' is-grouped' : ''}`}
                              data-mid={message.realId || undefined}
                              data-ts={message.realId ? toEpoch(message.timeStamp) : undefined}
                          >
                            <div className={`message-avatar${message.groupedWithPrevious ? ' is-hidden' : ''}`} aria-hidden={message.groupedWithPrevious ? 'true' : undefined}>
                              {!message.groupedWithPrevious && <Avatar src={avatarOf(message.sender)} name={message.displaySender} size={36} />}
                            </div>
                            <div className="message-content">
                              <div className="message-meta">
                                <span className={`message-author ${isOwn ? 'is-self' : ''}`}>{message.displaySender}</span>
                                <span className="message-time">{formatTime(message.timeStamp)}</span>
                                {message.edited && <span className="message-edited">edited</span>}
                                {isOwn && message.realId && (() => {
                                  const summary = receiptSummaryById[message.realId];
                                  const wasRead = Number(summary?.readCount || 0) > 0;
                                  return (
                                      <button
                                          type="button"
                                          className={`message-delivery-status${wasRead ? ' is-read' : ''}`}
                                          onClick={() => openReadReceipts(message)}
                                          disabled={receiptLoadingFor === message.realId}
                                          title={summary ? `Read by ${summary.readCount} of ${summary.totalRecipients} recipients · View details` : 'View read details'}
                                          aria-label={summary ? `Read by ${summary.readCount} of ${summary.totalRecipients} recipients. View details` : 'View read details'}
                                      >
                                        {receiptLoadingFor === message.realId ? <span className="delivery-loading">…</span> : <span aria-hidden="true">{wasRead ? '✓✓' : '✓'}</span>}
                                      </button>
                                  );
                                })()}
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
                              {Object.entries(message.reactions || {}).some(([, users]) => Array.isArray(users) && users.length > 0) && (
                                  <div className="message-reactions" aria-label="Message reactions">
                                    {Object.entries(message.reactions || {}).filter(([, users]) => Array.isArray(users) && users.length > 0).map(([emoji, users]) => (
                                        <button key={emoji} type="button" className={`reaction-chip${users.includes(currentUserId) ? ' is-selected' : ''}`} onClick={() => toggleReaction(message.realId, emoji)} aria-label={`${emoji}, ${users.length} reactions`}>
                                          <span>{emoji}</span><span>{users.length}</span>
                                        </button>
                                    ))}
                                  </div>
                              )}
                              {reactionPickerFor === message.realId && (
                                  <div className="reaction-picker" role="group" aria-label="Choose a reaction">
                                    {REACTION_EMOJIS.map((emoji) => (
                                        <button key={emoji} type="button" onClick={() => toggleReaction(message.realId, emoji)} aria-label={`React with ${emoji}`}>{emoji}</button>
                                    ))}
                                  </div>
                              )}
                            </div>
                            {message.realId && (
                                <div className="message-actions">
                                  <button type="button" className="message-action" onClick={() => setReactionPickerFor((id) => id === message.realId ? null : message.realId)} title="Add reaction" aria-label="Add reaction"><MdAddReaction size={16} /></button>
                                  {canModify && isTextMessage && <button type="button" className="message-action" onClick={() => startEdit(message)} title="Edit message" aria-label="Edit message"><MdEdit size={15} /></button>}
                                  {canModify && <button type="button" className="message-action is-danger" onClick={() => deleteMessage(message)} title="Delete message" aria-label="Delete message"><MdDelete size={15} /></button>}
                                </div>
                            )}
                          </motion.article>
                      );
                      return items;
                    })}
                  </AnimatePresence>
              )}
            </div>
          </main>

          {newBelow > 0 && (
              <button
                  type="button"
                  className="jump-latest"
                  onClick={() => {
                    scrollToBottom();
                    stickRef.current = true;
                    setNewBelow(0);
                  }}
              >
                <MdVisibility size={16} />
                {newBelow} new message{newBelow === 1 ? '' : 's'}
              </button>
          )}

          <AnimatePresence initial={false}>
            {typingLabel && (
                <motion.div className="typing-indicator" role="status" aria-live="polite" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }} transition={{ duration: 0.18 }}>
                  <span className="typing-dots" aria-hidden="true"><i /><i /><i /></span>
                  <span>{typingLabel}</span>
                </motion.div>
            )}
          </AnimatePresence>

          <footer className="composer-wrap">
            <div className="composer">
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,video/*,audio/*" multiple />
              <button type="button" className="icon-button" onClick={() => fileInputRef.current?.click()} title="Attach media" aria-label="Attach media"><MdAttachFile size={18} /></button>
              <textarea
                  ref={composerInputRef}
                  value={input}
                  onChange={handleComposerChange}
                  onKeyDown={handleComposerKeyDown}
                  onBlur={() => {
                    if (localTypingTimerRef.current) clearTimeout(localTypingTimerRef.current);
                    publishTypingState(false);
                  }}
                  rows={1}
                  placeholder={isDm ? `Message @${dmTargetUsername}` : `Message #${roomId}`}
                  aria-label="Message"
                  aria-describedby="composer-help"
              />
              <button type="button" className="btn btn-primary" onClick={sendMessage} disabled={!input.trim()} title="Send message"><MdSend size={18} /><span className="hidden sm:inline">Send</span></button>
            </div>
            <div className="composer-note" id="composer-help"><span>media supported · image / video / audio</span><span>Enter to send · Shift + Enter for a new line</span></div>
          </footer>
        </section>

        <nav className="chat-mobile-tabs" aria-label="Primary navigation">
          <button type="button" className="chat-mobile-tab" onClick={() => navigate('/')} aria-label="Home">
            <MdHome size={20} /><span>Home</span>
          </button>
          <button type="button" className="chat-mobile-tab is-active" onClick={() => setMobileRoomsOpen(true)} aria-label="Rooms and direct messages">
            <MdMeetingRoom size={20} /><span>Rooms</span>
          </button>
          <button type="button" className="chat-mobile-tab" onClick={() => navigate('/discover')} aria-label="Discover">
            <MdExplore size={20} /><span>Discover</span>
          </button>
          <button type="button" className="chat-mobile-tab" onClick={() => navigate('/profile')} aria-label="Profile">
            <MdPerson size={20} /><span>Profile</span>
          </button>
        </nav>
      </div>
  );
};
export default ChatPage;