import { createContext, useContext, useMemo, useState } from "react";

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const [roomId, setRoomId] = useState("");
  const [connected, setConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState("");

  const value = useMemo(
    () => ({
      roomId,
      connected,
      currentUser,
      setRoomId,
      setConnected,
      setCurrentUser,
    }),
    [roomId, connected, currentUser]
  );

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

const useChatContext = () => useContext(ChatContext);

export default useChatContext;