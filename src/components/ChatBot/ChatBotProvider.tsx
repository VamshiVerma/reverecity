import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ChatBotContextType {
  isMinimized: boolean;
  setIsMinimized: (minimized: boolean) => void;
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  currentPage: string;
  setCurrentPage: (page: string) => void;
}

const ChatBotContext = createContext<ChatBotContextType | undefined>(undefined);

export const useChatBot = () => {
  const context = useContext(ChatBotContext);
  if (!context) {
    throw new Error('useChatBot must be used within a ChatBotProvider');
  }
  return context;
};

interface ChatBotProviderProps {
  children: ReactNode;
}

export const ChatBotProvider: React.FC<ChatBotProviderProps> = ({ children }) => {
  const [isMinimized, setIsMinimized] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentPage, setCurrentPage] = useState('dashboard');

  const value = {
    isMinimized,
    setIsMinimized,
    unreadCount,
    setUnreadCount,
    currentPage,
    setCurrentPage,
  };

  return (
    <ChatBotContext.Provider value={value}>
      {children}
    </ChatBotContext.Provider>
  );
};