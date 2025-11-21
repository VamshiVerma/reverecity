// MinimalChatBot.tsx - Clean, Google-style AI Chat Interface
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic, Send, X, Minimize2, MessageSquare, Sparkles, StopCircle, Cloud, Train, Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useBrowserSpeechRecognition } from '@/hooks/useBrowserSpeechRecognition';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

const QUICK_ACTIONS = [
  { icon: Cloud, label: 'Weather', query: "What's the weather in Revere?" },
  { icon: Train, label: 'Transit', query: 'Show me MBTA Blue Line status' },
  { icon: Users, label: 'Demographics', query: 'Tell me about Revere demographics' },
];

export const MinimalChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{
    id: '1',
    content: 'Hi! I can help you with information about Revere. Ask me anything or use voice mode.',
    role: 'assistant',
    timestamp: new Date()
  }]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const {
    isListening,
    transcript,
    finalTranscript,
    isSupported: speechSupported,
    startListening,
    stopListening,
    resetTranscript
  } = useBrowserSpeechRecognition();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (messageText?: string) => {
    const text = messageText || currentMessage.trim() || transcript.trim();
    if (!text) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: text,
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsLoading(true);
    resetTranscript();

    try {
      const response = await fetch('http://localhost:8001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });

      if (response.ok) {
        const data = await response.json();
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: data.response,
          role: 'assistant',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error('API error');
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `I heard: "${text}"\n\nI can help with weather, transit, and city information about Revere.`,
        role: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
      if (transcript.trim()) {
        handleSendMessage();
      }
    } else {
      if (!speechSupported) {
        toast({
          title: "Not supported",
          description: "Speech recognition requires Chrome or Edge",
          variant: "destructive"
        });
        return;
      }
      startListening();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 z-50"
      >
        <Sparkles className="h-6 w-6 text-white" />
      </button>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 w-[400px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 border border-gray-200 ${isMinimized ? 'h-16' : 'h-[600px]'} transition-all duration-300`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-gray-900">AI Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-8 w-8 p-0"
          >
            {isMinimized ? <MessageSquare className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <div className="text-sm prose prose-sm max-w-none prose-headings:mt-3 prose-headings:mb-2 prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <div className="text-sm">{message.content}</div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t border-gray-100 bg-white">
            {/* Quick Actions - Clean Pills */}
            {messages.length <= 1 && !isListening && (
              <div className="px-4 pt-3 pb-2">
                <div className="flex gap-2 overflow-x-auto">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => handleSendMessage(action.query)}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-full text-xs text-gray-700 whitespace-nowrap transition-colors border border-gray-200"
                    >
                      <action.icon className="h-3.5 w-3.5" />
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Voice Indicator - Minimal */}
            {isListening && (
              <div className="px-4 pt-3 pb-2">
                <div className="flex items-center gap-2 text-xs text-red-600">
                  <div className="flex gap-0.5">
                    <div className="w-1 h-3 bg-red-500 rounded-full animate-pulse" style={{animationDelay: '0ms'}}></div>
                    <div className="w-1 h-4 bg-red-500 rounded-full animate-pulse" style={{animationDelay: '100ms'}}></div>
                    <div className="w-1 h-3 bg-red-500 rounded-full animate-pulse" style={{animationDelay: '200ms'}}></div>
                  </div>
                  <span className="font-medium">Listening...</span>
                </div>
              </div>
            )}

            <div className="p-4">
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Input
                    value={isListening ? transcript : currentMessage}
                    onChange={(e) => !isListening && setCurrentMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !isListening) {
                        handleSendMessage();
                      }
                    }}
                    placeholder={isListening ? "Listening..." : "Ask anything..."}
                    disabled={isLoading}
                    className="border-gray-200 focus:border-blue-500 h-11"
                  />
                </div>
                <Button
                  onClick={handleVoiceToggle}
                  disabled={isLoading}
                  variant={isListening ? "destructive" : "outline"}
                  size="sm"
                  className="h-11 w-11 p-0"
                >
                  {isListening ? <StopCircle className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>
                <Button
                  onClick={() => handleSendMessage()}
                  disabled={!currentMessage.trim() || isLoading || isListening}
                  size="sm"
                  className="h-11 w-11 p-0 bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
