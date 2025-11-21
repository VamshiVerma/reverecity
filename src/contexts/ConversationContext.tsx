// ConversationContext.tsx - Context management for conversation state
import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  type: 'text' | 'voice' | 'streaming';
  confidence?: number;
  metadata?: {
    dataSource: string;
    apiCalls: string[];
    processingTime: number;
    audioLength?: number;
  };
}

export interface ConversationState {
  messages: Message[];
  currentMode: 'text' | 'voice';
  isLoading: boolean;
  isConnected: boolean;
  context: {
    location: string;
    recentTopics: string[];
    preferredDataSources: string[];
    conversationTurn: number;
  };
  voiceState: {
    isRecording: boolean;
    isPlaying: boolean;
    transcription: string;
    partialTranscription: string;
    confidence: number;
  };
}

type ConversationAction =
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'SET_MODE'; payload: 'text' | 'voice' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'UPDATE_VOICE_STATE'; payload: Partial<ConversationState['voiceState']> }
  | { type: 'UPDATE_CONTEXT'; payload: Partial<ConversationState['context']> }
  | { type: 'CLEAR_MESSAGES' }
  | { type: 'ADD_TOPIC'; payload: string };

const initialState: ConversationState = {
  messages: [],
  currentMode: 'text',
  isLoading: false,
  isConnected: false,
  context: {
    location: 'Revere, MA',
    recentTopics: [],
    preferredDataSources: ['weather', 'mbta', 'census'],
    conversationTurn: 0
  },
  voiceState: {
    isRecording: false,
    isPlaying: false,
    transcription: '',
    partialTranscription: '',
    confidence: 0
  }
};

function conversationReducer(state: ConversationState, action: ConversationAction): ConversationState {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload],
        context: {
          ...state.context,
          conversationTurn: state.context.conversationTurn + 1
        }
      };

    case 'SET_MODE':
      return {
        ...state,
        currentMode: action.payload
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };

    case 'SET_CONNECTED':
      return {
        ...state,
        isConnected: action.payload
      };

    case 'UPDATE_VOICE_STATE':
      return {
        ...state,
        voiceState: {
          ...state.voiceState,
          ...action.payload
        }
      };

    case 'UPDATE_CONTEXT':
      return {
        ...state,
        context: {
          ...state.context,
          ...action.payload
        }
      };

    case 'CLEAR_MESSAGES':
      return {
        ...state,
        messages: [],
        context: {
          ...state.context,
          recentTopics: [],
          conversationTurn: 0
        }
      };

    case 'ADD_TOPIC':
      const newTopics = [action.payload, ...state.context.recentTopics.slice(0, 4)];
      return {
        ...state,
        context: {
          ...state.context,
          recentTopics: Array.from(new Set(newTopics))
        }
      };

    default:
      return state;
  }
}

interface ConversationContextType {
  state: ConversationState;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  setMode: (mode: 'text' | 'voice') => void;
  setLoading: (loading: boolean) => void;
  setConnected: (connected: boolean) => void;
  updateVoiceState: (voiceState: Partial<ConversationState['voiceState']>) => void;
  updateContext: (context: Partial<ConversationState['context']>) => void;
  clearMessages: () => void;
  addTopic: (topic: string) => void;
  getRecentContext: () => string;
  shouldFetchDataSource: (source: string) => boolean;
}

const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

export const useConversation = (): ConversationContextType => {
  const context = useContext(ConversationContext);
  if (!context) {
    throw new Error('useConversation must be used within a ConversationProvider');
  }
  return context;
};

interface ConversationProviderProps {
  children: ReactNode;
}

export const ConversationProvider: React.FC<ConversationProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(conversationReducer, initialState);

  const addMessage = useCallback((message: Omit<Message, 'id' | 'timestamp'>) => {
    const fullMessage: Message = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    dispatch({ type: 'ADD_MESSAGE', payload: fullMessage });

    // Extract topics from message content for context
    if (message.role === 'user') {
      const content = message.content.toLowerCase();
      if (content.includes('weather')) addTopic('weather');
      if (content.includes('mbta') || content.includes('transit')) addTopic('transit');
      if (content.includes('population') || content.includes('census')) addTopic('demographics');
      if (content.includes('service')) addTopic('municipal');
    }
  }, []);

  const setMode = useCallback((mode: 'text' | 'voice') => {
    dispatch({ type: 'SET_MODE', payload: mode });
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, []);

  const setConnected = useCallback((connected: boolean) => {
    dispatch({ type: 'SET_CONNECTED', payload: connected });
  }, []);

  const updateVoiceState = useCallback((voiceState: Partial<ConversationState['voiceState']>) => {
    dispatch({ type: 'UPDATE_VOICE_STATE', payload: voiceState });
  }, []);

  const updateContext = useCallback((context: Partial<ConversationState['context']>) => {
    dispatch({ type: 'UPDATE_CONTEXT', payload: context });
  }, []);

  const clearMessages = useCallback(() => {
    dispatch({ type: 'CLEAR_MESSAGES' });
  }, []);

  const addTopic = useCallback((topic: string) => {
    dispatch({ type: 'ADD_TOPIC', payload: topic });
  }, []);

  const getRecentContext = useCallback(() => {
    const recentMessages = state.messages.slice(-5);
    const topics = state.context.recentTopics.join(', ');
    const location = state.context.location;

    return `Location: ${location}. Recent topics: ${topics}. Recent conversation: ${
      recentMessages.map(m => `${m.role}: ${m.content.substring(0, 100)}`).join(' | ')
    }`;
  }, [state.messages, state.context]);

  const shouldFetchDataSource = useCallback((source: string) => {
    // Smart data source selection based on conversation context
    const recentTopics = state.context.recentTopics;
    const preferredSources = state.context.preferredDataSources;

    // Always fetch if it's a preferred source
    if (preferredSources.includes(source)) return true;

    // Fetch weather if recently discussed
    if (source === 'weather' && recentTopics.includes('weather')) return true;

    // Fetch transit if recently discussed
    if (source === 'mbta' && recentTopics.includes('transit')) return true;

    // Fetch demographics if recently discussed
    if (source === 'census' && recentTopics.includes('demographics')) return true;

    return false;
  }, [state.context]);

  const contextValue: ConversationContextType = {
    state,
    addMessage,
    setMode,
    setLoading,
    setConnected,
    updateVoiceState,
    updateContext,
    clearMessages,
    addTopic,
    getRecentContext,
    shouldFetchDataSource
  };

  return (
    <ConversationContext.Provider value={contextValue}>
      {children}
    </ConversationContext.Provider>
  );
};