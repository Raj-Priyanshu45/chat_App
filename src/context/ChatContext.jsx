import { createContext, useContext, useMemo, useState } from "react";

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const [roomId, setRoomId] = useState("");
  const [connected, setConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState("");
  const [roomUsers, setRoomUsers] = useState([]);
  const [isDm, setIsDm] = useState(false);
  const [dmTarget, setDmTarget] = useState("");

  const value = useMemo(
    () => ({
      roomId,
      connected,
      currentUser,
      roomUsers,
      isDm,
      dmTarget,
      setRoomId,
      setConnected,
      setCurrentUser,
      setRoomUsers,
      setIsDm,
      setDmTarget,
    }),
    [roomId, connected, currentUser, roomUsers, isDm, dmTarget]
  );

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

const useChatContext = () => useContext(ChatContext);

export default useChatContext;