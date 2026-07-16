import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import toast from 'react-hot-toast';
import { MdSend } from 'react-icons/md';
import useChatContext from '../context/ChatContext';
import { baseURL } from '../config/AxiosHelper';
import { getMessages } from '../services/RoomService';
import { formatTime } from '../config/helper';

const ChatPage = () => {
  const { roomId, currentUser, connected, setConnected, setRoomId, setCurrentUser } = useChatContext();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [stompClient, setStompClient] = useState(null);
  const chatBoxRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!connected) {
      navigate('/');
      return;
    }

    const loadMessages = async () => {
      try {
        const loadedMessages = await getMessages(roomId);
        setMessages(loadedMessages);
      } catch (error) {
        toast.error('Unable to load older messages.');
      }
    };

    loadMessages();
  }, [connected, navigate, roomId]);

  useEffect(() => {
    if (!connected || !roomId) return undefined;

    const socket = new SockJS(`${baseURL}/chat`);
    const client = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      onConnect: () => {
        setStompClient(client);
        toast.success('Connected to chat');
        client.subscribe(`/topic/room/${roomId}`, (message) => {
          const payload = JSON.parse(message.body);
          setMessages((prev) => [...prev, payload]);
        });
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
  }, [connected, roomId]);

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = () => {
    if (!stompClient || !connected || !input.trim()) return;

    const payload = {
      message: input.trim(),
      sender: currentUser,
      roomId,
    };

    stompClient.publish({
      destination: `/app/sendMessages/${roomId}`,
      body: JSON.stringify(payload),
    });

    setInput('');
  };

  const handleLogout = () => {
    if (stompClient) {
      stompClient.deactivate();
    }
    setConnected(false);
    setRoomId('');
    setCurrentUser('');
    navigate('/');
  };

  const groupedMessages = useMemo(() => {
    return messages.map((message, index) => ({
      ...message,
      id: `${message.sender}-${message.content}-${index}`,
    }));
  }, [messages]);

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),_transparent_40%),linear-gradient(135deg,#020617_0%,#0f172a_100%)] text-slate-100">
      <header className="border-b border-slate-800/70 bg-slate-900/80 px-4 py-4 shadow-sm backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-400">Live room</p>
            <h1 className="mt-1 text-xl font-semibold text-white">Room: {roomId}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">
              {currentUser}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full border border-slate-700 px-3 py-2 text-sm transition hover:bg-slate-800"
            >
              Leave room
            </button>
          </div>
        </div>
      </header>

      <main ref={chatBoxRef} className="mx-auto flex-1 w-full max-w-6xl overflow-y-auto px-4 py-6 sm:px-6">
        {groupedMessages.length === 0 ? (
          <div className="mt-12 rounded-[24px] border border-dashed border-slate-700 bg-slate-900/70 p-8 text-center text-slate-400 shadow-lg">
            No messages yet. Start the conversation.
          </div>
        ) : (
          groupedMessages.map((message) => (
            <div
              key={message.id}
              className={`mb-4 flex ${message.sender === currentUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-[20px] px-4 py-3 shadow-sm ${message.sender === currentUser ? 'bg-cyan-600 text-white' : 'bg-slate-800/90 text-slate-100'}`}
              >
                <div className="mb-1 text-sm font-semibold">{message.sender}</div>
                <div className="break-words text-sm">{message.content || message.message}</div>
                <div className={`mt-2 text-[11px] ${message.sender === currentUser ? 'text-cyan-100' : 'text-slate-400'}`}>
                  {formatTime(message.timeStamp)}
                </div>
              </div>
            </div>
          ))
        )}
      </main>

      <footer className="border-t border-slate-800/70 bg-slate-900/80 px-4 py-4 shadow-inner backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center gap-3 rounded-full border border-slate-700 bg-slate-800/90 px-3 py-3">
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
