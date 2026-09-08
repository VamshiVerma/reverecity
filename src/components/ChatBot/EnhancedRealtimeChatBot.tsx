// EnhancedRealtimeChatBot.tsx - SOTA Voice-enabled ChatBot with real-time streaming
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic, MicOff, Send, Upload, Volume2, VolumeX,
  Zap, Activity, Waves, Globe, RefreshCw, Copy,
  MessageSquare, FileText, Settings, X, Minimize2, Maximize2,
  MapPin, Cloud, Train, Users, Trash2, Pause, Square, PlayCircle,
  StopCircle, RotateCcw, Check, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useBrowserSpeechRecognition } from '@/hooks/useBrowserSpeechRecognition';
import { getLatestWeatherData } from '@/services/weatherService';
import { realTimeDataService } from '@/services/realTimeDataService';
import { supabase } from '@/integrations/supabase/client';
import { langchainService } from '@/services/langchainService';
import ReactMarkdown from 'react-markdown';
import './EnhancedRealtimeChatBot.css';

interface Message {
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

interface EnhancedRealtimeChatBotProps {
  className?: string;
  pageContext?: string;
}

export const EnhancedRealtimeChatBot: React.FC<EnhancedRealtimeChatBotProps> = ({
  className = '',
  pageContext = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // Always start with fresh welcome message
  const [messages, setMessages] = useState<Message[]>([{
    id: '1',
    content: `🤖 **Welcome to Revere's AI Assistant!**

Powered by **LangChain + Gemini 2.5 Flash** with advanced RAG & Memory

🧠 **Smart Features:**
• Remembers our entire conversation
• Intelligent context retrieval
• Natural language understanding
• Real-time data integration

🚔 **Police Activity & Safety:**
• Recent incidents and police calls
• Crime statistics and trends
• Location-based activity reports

📊 **Real-Time City Data:**
• Live weather conditions
• MBTA Blue Line transit updates
• Demographics and city statistics
• Municipal services information

🎯 **Just ask naturally!**
• "What activities happened this week?"
• "Tell me more about that first incident"
• "What's the weather?"
• "Compare today vs yesterday"

I remember everything we discuss!`,
    role: 'assistant',
    timestamp: new Date(),
    type: 'text'
  }]);

  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState({ online: true, lastCheck: new Date() });
  const [uploadedDocuments, setUploadedDocuments] = useState<any[]>([]);
  const [currentMode, setCurrentMode] = useState<'text' | 'voice'>('text');
  const [voiceRecordingState, setVoiceRecordingState] = useState<'idle' | 'recording' | 'paused' | 'processing' | 'ready-to-submit' | 'error'>('idle');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Wrapper around toast that respects maximize state
  const showToast = useCallback((toastOptions: any) => {
    // Don't show toasts when chatbot is maximized
    if (!isMaximized) {
      toast(toastOptions);
    }
  }, [isMaximized, toast]);

  // Hide global toasts when chatbot is maximized
  useEffect(() => {
    if (isMaximized) {
      document.body.setAttribute('data-chatbot-maximized', 'true');
    } else {
      document.body.removeAttribute('data-chatbot-maximized');
    }

    return () => {
      document.body.removeAttribute('data-chatbot-maximized');
    };
  }, [isMaximized]);

  // Browser-based speech recognition
  const {
    isListening,
    transcript,
    interimTranscript,
    finalTranscript,
    isSupported: speechSupported,
    error: speechError,
    startListening,
    stopListening,
    resetTranscript
  } = useBrowserSpeechRecognition();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Clear chat when closing
  useEffect(() => {
    if (!isOpen) {
      // Reset to welcome message when chat is closed
      setMessages([{
        id: '1',
        content: `🎙️ **Welcome to Revere's Enhanced AI Assistant!**

I now support **real-time voice conversations** with live streaming capabilities!

🔊 **Advanced Voice Features:**
• Real-time speech transcription as you speak
• Streaming audio responses with natural speech
• Voice activity detection with visual feedback
• Advanced noise cancellation and echo suppression

📊 **Enhanced Data Integration:**
• Live weather conditions from Visual Crossing API
• Real-time MBTA transit data for Blue Line
• Current demographics from US Census Bureau
• Municipal data from Massachusetts Open Data

🎯 **Try saying:** "What's the weather like?" or "Show me MBTA status"`,
        role: 'assistant',
        timestamp: new Date(),
        type: 'text'
      }]);
    }
  }, [isOpen]);

  // Update current message with live transcription
  useEffect(() => {
    if (transcript) {
      setCurrentMessage(transcript);
    }
  }, [transcript]);

  // Loading states for different data types
  const [loadingStates, setLoadingStates] = useState({
    weather: false,
    mbta: false,
    census: false,
    municipal: false
  });

  // Update loading state for specific data type
  const setDataLoading = (dataType: keyof typeof loadingStates, loading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [dataType]: loading }));
  };

  // Production-ready enhanced response generation with LangChain + Gemini 2.5 Flash + RAG
  const generateEnhancedResponse = async (userMessage: string): Promise<{ content: string; metadata: any }> => {
    try {
      // Use LangChain service with full RAG, memory, and conversation chains
      const result = await langchainService.generateResponse(userMessage);
      return result;
    } catch (error) {
      console.error('Error in generateEnhancedResponse:', error);
      return {
        content: `I apologize, but I'm experiencing technical difficulties. Please try again in a moment.`,
        metadata: {
          dataSource: 'Error',
          apiCalls: [],
          processingTime: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  };

  const handleSendMessage = async (messageOverride?: string) => {
    const messageText = messageOverride || currentMessage;
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageText,
      role: 'user',
      timestamp: new Date(),
      type: currentMode,
      confidence: currentMode === 'voice' ? 95 : 100
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsLoading(true);

    // Reset voice recording state after sending
    if (currentMode === 'voice') {
      setVoiceRecordingState('idle');
      resetTranscript();
    }

    try {
      // Generate enhanced response with real-time data
      const { content, metadata } = await generateEnhancedResponse(messageText);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content,
        role: 'assistant',
        timestamp: new Date(),
        type: 'text',
        metadata
      };

      setMessages(prev => [...prev, aiMessage]);

      showToast({
        title: "✅ Enhanced response generated!",
        description: `APIs called: ${metadata.apiCalls.length} | Time: ${metadata.processingTime}ms`,
      });

    } catch (error) {
      console.error('Error generating response:', error);

      // Provide a helpful fallback response
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `I heard you say: "${messageText}"\n\nI'm having trouble accessing the live data APIs right now, but I'm here to help!

🎯 **I can assist with:**
• Weather information for Revere
• MBTA Blue Line transit updates
• City demographics and statistics
• Municipal services information

💡 **Try asking me about:**
• "What's the weather like?"
• "Show me MBTA status"
• "Tell me about Revere"
• "What services are available?"

The data services will be back online soon!`,
        role: 'assistant',
        timestamp: new Date(),
        type: 'text'
      };

      setMessages(prev => [...prev, errorMessage]);

      showToast({
        title: "⚠️ API Connection Issue",
        description: "Using fallback mode. Try again in a moment.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Voice recording controls
  const startVoiceRecording = async () => {
    try {
      if (!speechSupported) {
        showToast({
          title: "❌ Not supported",
          description: "Speech recognition is not supported in this browser. Try Chrome.",
          variant: "destructive"
        });
        return;
      }

      setVoiceRecordingState('recording');
      setRecordingDuration(0);
      resetTranscript();

      startListening();

      // Start recording timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      showToast({
        title: "🎙️ Recording started",
        description: "Speak clearly - transcription will appear in real-time"
      });
    } catch (error) {
      console.error('Failed to start recording:', error);
      setVoiceRecordingState('error');
      showToast({
        title: "❌ Recording failed",
        description: "Please check microphone permissions",
        variant: "destructive"
      });
    }
  };

  const pauseVoiceRecording = () => {
    try {
      setVoiceRecordingState('paused');
      stopListening();
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      showToast({
        title: "⏸️ Recording paused",
        description: "Resume to continue or Submit to send"
      });
    } catch (error) {
      console.error('Failed to pause recording:', error);
      setVoiceRecordingState('error');
    }
  };

  const resumeVoiceRecording = async () => {
    try {
      setVoiceRecordingState('recording');
      startListening();

      // Resume recording timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      showToast({
        title: "🎙️ Recording resumed",
        description: "Continue speaking clearly"
      });
    } catch (error) {
      console.error('Failed to resume recording:', error);
      setVoiceRecordingState('error');
      showToast({
        title: "❌ Resume failed",
        description: "Please try starting a new recording",
        variant: "destructive"
      });
    }
  };

  const stopVoiceRecording = async () => {
    try {
      // Stop the recording
      stopListening();

      // Stop the recording timer
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      if (transcript && transcript.trim()) {
        setVoiceRecordingState('ready-to-submit');
        showToast({
          title: "✅ Recording complete",
          description: "Review and submit your message"
        });
      } else {
        setVoiceRecordingState('error');
        showToast({
          title: "⚠️ No speech detected",
          description: "Please try recording again",
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Failed to stop recording:', error);
      setVoiceRecordingState('error');
      showToast({
        title: "❌ Processing failed",
        description: "Please try recording again",
        variant: "destructive"
      });
    }
  };

  // Cancel/Reset recording
  const cancelVoiceRecording = () => {
    try {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      stopListening();
      resetTranscript();
      setVoiceRecordingState('idle');
      setRecordingDuration(0);
      setCurrentMessage('');

      showToast({
        title: "🗑️ Recording cancelled",
        description: "You can start a new recording"
      });
    } catch (error) {
      console.error('Failed to cancel recording:', error);
    }
  };

  // Voice mode toggle
  const toggleVoiceMode = () => {
    try {
      if (currentMode === 'text') {
        if (!speechSupported) {
          showToast({
            title: "❌ Not supported",
            description: "Speech recognition is not supported in this browser. Please use Chrome or Edge.",
            variant: "destructive"
          });
          return;
        }

        setCurrentMode('voice');
        showToast({
          title: "🎙️ Voice mode activated",
          description: "Click 'Start Recording' to begin speaking"
        });
      } else {
        setCurrentMode('text');
        if (voiceRecordingState !== 'idle') {
          stopVoiceRecording();
        }
        showToast({
          title: "✏️ Text mode activated",
          description: "Type your messages normally"
        });
      }
    } catch (error) {
      console.error('Error toggling voice mode:', error);
      showToast({
        title: "❌ Error",
        description: "Failed to switch voice mode",
        variant: "destructive"
      });
    }
  };

  // Format recording duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Quick action handlers
  const handleQuickAction = async (action: string) => {
    const actions = {
      weather: "What's the current weather in Revere?",
      mbta: "Show me MBTA Blue Line status",
      demographics: "What's Revere's current population?",
      services: "What city services are available?"
    };

    const message = actions[action as keyof typeof actions];
    if (message) {
      // Immediately send the message without waiting for voice mode
      await handleSendMessage(message);
    }
  };

  return (
    <>
      {/* Main Chat Toggle Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-gradient-to-br from-highlight to-[hsl(199_91%_44%)] shadow-glow hover:brightness-110 hover:scale-105 transition-all duration-300 backdrop-blur-sm group ${className} ${isOpen ? 'hidden' : ''}`}
        size="icon"
      >
        <div className="relative">
          <MessageSquare className="h-6 w-6 text-primary-foreground relative z-10 group-hover:scale-110 transition-transform duration-300" />
          {currentMode === 'voice' && isListening && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-highlight-secondary rounded-full ring-2 ring-popover" />
          )}
        </div>
      </Button>

      {/* Enhanced Chat Interface */}
      {isOpen && (
        <div className={`fixed z-50 bg-popover/95 backdrop-blur-xl shadow-lift border border-white/10 flex flex-col overflow-hidden transition-all duration-300 ${
          isMaximized
            ? 'inset-0 w-full h-full rounded-none'
            : `bottom-6 right-6 w-96 max-w-[90vw] rounded-2xl ${isMinimized ? 'h-auto' : 'h-[600px] max-h-[80vh]'}`
        }`}>
          {/* Header - Compact Design */}
          <div className="p-3 bg-white/[0.02] border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="relative bg-gradient-to-br from-highlight to-[hsl(199_91%_44%)] p-1.5 rounded-xl shadow-glow">
                    <Zap className="h-4 w-4 text-primary-foreground" />
                    {isListening && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-highlight-secondary rounded-full ring-2 ring-popover" />
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground text-sm">AI Assistant</h3>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                    <Badge
                      variant={currentMode === 'voice' ? 'default' : 'secondary'}
                      className={`text-[10px] font-semibold py-0 px-1.5 h-4 ${currentMode === 'voice' ? 'bg-highlight/15 text-highlight border border-highlight/25' : ''}`}
                    >
                      {currentMode === 'voice' ? '🎙️ Voice' : '✏️ Text'}
                    </Badge>
                    {currentMode === 'voice' && speechSupported && (
                      <Badge variant="outline" className="text-[10px] text-highlight border-highlight/30 bg-highlight/10 font-semibold py-0 px-1.5 h-4">
                        ✅ Ready
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="h-6 w-6 p-0 hover:bg-white/10 transition-colors"
                  title={isMinimized ? "Expand" : "Minimize"}
                >
                  {isMinimized ? (
                    <MessageSquare className="h-3 w-3" />
                  ) : (
                    <Minimize2 className="h-3 w-3" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsMaximized(!isMaximized);
                    if (!isMaximized && isMinimized) {
                      setIsMinimized(false);
                    }
                  }}
                  className="h-6 w-6 p-0 hover:bg-white/10 transition-colors"
                  title={isMaximized ? "Restore" : "Maximize"}
                >
                  <Maximize2 className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-6 w-6 p-0 hover:bg-white/10 transition-colors"
                  title="Close"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Voice Visualizer - Compact Design */}
            {currentMode === 'voice' && !isMinimized && (
              <div className="mt-2 p-2.5 bg-white/[0.03] rounded-xl backdrop-blur-sm border border-white/10 shadow-sm">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Waves className="w-3 h-3 text-highlight" />
                    Voice
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isListening ? 'bg-highlight/15 text-highlight' : 'bg-white/[0.04] text-muted-foreground'}`}>
                    {isListening ? '🔴 Live' : 'Standby'}
                  </span>
                </div>

                {/* Compact Animated Waveform */}
                <div className="h-8 bg-white/[0.03] border border-white/10 rounded-lg flex items-center justify-center overflow-hidden relative">
                  <div className="absolute inset-0 bg-highlight/5 animate-pulse"></div>
                  {isListening ? (
                    <div className="flex items-center gap-1 relative z-10">
                      <div className="w-1 h-4 bg-highlight rounded-full animate-pulse shadow-sm" style={{animationDelay: '0ms', animationDuration: '0.8s'}}></div>
                      <div className="w-1 h-6 bg-highlight rounded-full animate-pulse shadow-sm" style={{animationDelay: '100ms', animationDuration: '0.9s'}}></div>
                      <div className="w-1 h-5 bg-highlight rounded-full animate-pulse shadow-sm" style={{animationDelay: '200ms', animationDuration: '1s'}}></div>
                      <div className="w-1 h-7 bg-highlight rounded-full animate-pulse shadow-sm" style={{animationDelay: '300ms', animationDuration: '0.85s'}}></div>
                      <div className="w-1 h-5 bg-highlight rounded-full animate-pulse shadow-sm" style={{animationDelay: '400ms', animationDuration: '0.95s'}}></div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 relative z-10">
                      <div className="w-1 h-3 bg-white/20 rounded-full"></div>
                      <div className="w-1 h-3 bg-white/20 rounded-full"></div>
                      <div className="w-1 h-3 bg-white/20 rounded-full"></div>
                      <div className="w-1 h-3 bg-white/20 rounded-full"></div>
                      <div className="w-1 h-3 bg-white/20 rounded-full"></div>
                    </div>
                  )}
                </div>

                {/* Compact transcription preview */}
                {(interimTranscript || finalTranscript) && (
                  <div className="mt-1.5 p-2 bg-white/[0.04] rounded-lg border border-highlight/25">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${interimTranscript ? 'bg-highlight animate-pulse' : 'bg-highlight-secondary'}`}></div>
                      <span className="text-[10px] text-highlight uppercase tracking-wide font-bold">
                        {interimTranscript ? 'Speaking...' : 'Done'}
                      </span>
                    </div>
                    <div className="font-medium text-xs text-foreground line-clamp-2">
                      {finalTranscript && <span className="opacity-70">{finalTranscript} </span>}
                      {interimTranscript && <span className="text-foreground font-bold">{interimTranscript}</span>}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Messages Area */}
          {!isMinimized && (
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-xl p-3 transition-all duration-300 ${
                        message.role === 'user'
                          ? 'bg-highlight/15 border border-highlight/25 text-foreground'
                          : 'bg-white/[0.04] border border-white/10 text-foreground backdrop-blur-sm'
                      }`}
                    >
                      {message.role === 'assistant' ? (
                        <div className="text-sm prose prose-sm dark:prose-invert max-w-none prose-headings:font-bold prose-p:my-1 prose-ul:my-1 prose-li:my-0.5">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <div className="text-sm whitespace-pre-wrap break-words">
                          {message.content}
                        </div>
                      )}

                      {/* Source Citations */}
                      {message.role === 'assistant' && message.metadata?.sources && message.metadata.sources.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-border/30">
                          <div className="text-xs text-muted-foreground space-y-1.5">
                            <div className="font-medium mb-1.5">Sources:</div>
                            {message.metadata.sources.map((source: any, idx: number) => (
                              <div key={idx} className="flex items-start gap-1.5">
                                <span className="text-[10px] mt-0.5">{source.icon}</span>
                                <div className="flex-1 min-w-0">
                                  <span className="font-medium">{source.name}</span>
                                  {source.type && (
                                    <span className="text-muted-foreground/70"> · {source.type}</span>
                                  )}
                                  {source.description && (
                                    <div className="text-[10px] text-muted-foreground/60 mt-0.5">
                                      {source.description}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Message metadata */}
                      <div className="mt-2 flex items-center gap-2 text-xs opacity-70">
                        <span>{message.timestamp.toLocaleTimeString()}</span>
                        {message.type === 'voice' && (
                          <Badge variant="outline" className="text-xs">
                            🎙️ {message.confidence}%
                          </Badge>
                        )}
                        {message.metadata && (
                          <Badge variant="outline" className="text-xs">
                            📊 {message.metadata.apiCalls.length} API{message.metadata.apiCalls.length !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>

                      {/* Quick actions for assistant messages */}
                      {message.role === 'assistant' && (
                        <div className="mt-2 flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => navigator.clipboard.writeText(message.content)}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Real-time voice transcription display */}
                {currentMode === 'voice' && isListening && interimTranscript && (
                  <div className="flex justify-end animate-in slide-in-from-right duration-300">
                    <div className="max-w-[80%] rounded-xl p-4 bg-highlight/15 text-foreground border border-highlight/30 shadow-glow backdrop-blur-xl relative overflow-hidden">
                      <div className="absolute inset-0 bg-highlight/5 animate-pulse"></div>
                      <div className="relative z-10">
                        <div className="text-xs text-highlight uppercase tracking-wide mb-2 flex items-center gap-2 font-bold">
                          <span className="w-2.5 h-2.5 bg-highlight-secondary rounded-full"></span>
                          Speaking...
                        </div>
                        <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                          {finalTranscript && <span className="opacity-70">{finalTranscript} </span>}
                          <span className="font-bold text-foreground">{interimTranscript}</span>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
                          <Activity className="w-3 h-3" />
                          Live transcription • Real-time
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isLoading && (
                  <div className="flex justify-start chat-message-enter">
                    <div className="bg-white/[0.04] border border-white/10 backdrop-blur-sm rounded-xl p-4 shadow-lg">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-8 h-8 border-2 border-highlight/20 border-t-highlight rounded-full animate-spin"></div>
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-foreground">AI is thinking...</div>
                          <div className="flex gap-1 mt-1">
                            <div className="w-2 h-2 bg-highlight rounded-full typing-dot"></div>
                            <div className="w-2 h-2 bg-highlight rounded-full typing-dot"></div>
                            <div className="w-2 h-2 bg-highlight rounded-full typing-dot"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div ref={messagesEndRef} />
            </ScrollArea>
          )}

          {/* Enhanced Input Area */}
          {!isMinimized && (
            <div className="p-4 border-t border-white/10 bg-white/[0.02]">
              {/* Quick Actions - Always show */}
              <div className="mb-3">
                <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => handleQuickAction('weather')}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] hover:border-highlight/40 border border-white/10 rounded-full text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Cloud className="h-3.5 w-3.5" />
                      Weather
                    </button>
                    <button
                      onClick={() => handleQuickAction('mbta')}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] hover:border-highlight/40 border border-white/10 rounded-full text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Train className="h-3.5 w-3.5" />
                      Transit
                    </button>
                    <button
                      onClick={() => handleQuickAction('demographics')}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] hover:border-highlight/40 border border-white/10 rounded-full text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Users className="h-3.5 w-3.5" />
                      Demographics
                    </button>
                  </div>
                </div>

              {/* Single Input Bar */}
              <div className="flex gap-2 items-center">
                <div className="flex-1 relative">
                  <Input
                    value={isListening ? transcript : currentMessage}
                    onChange={(e) => !isListening && setCurrentMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !isListening) {
                        handleSendMessage();
                      }
                    }}
                    placeholder={isListening ? "Listening..." : "Type a message..."}
                    disabled={isLoading}
                    className="bg-white/[0.04] border-white/10 rounded-xl text-foreground placeholder:text-muted-foreground focus:border-highlight/50 h-11 pr-20"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                    <Button
                      onClick={() => {
                        if (isListening) {
                          stopListening();
                          if (finalTranscript.trim() || interimTranscript.trim()) {
                            const messageText = (finalTranscript + ' ' + interimTranscript).trim();
                            handleSendMessage(messageText);
                            resetTranscript();
                          }
                        } else {
                          if (!speechSupported) {
                            showToast({
                              title: "Not supported",
                              description: "Speech recognition requires Chrome or Edge",
                              variant: "destructive"
                            });
                            return;
                          }
                          resetTranscript();
                          startListening();
                        }
                      }}
                      disabled={isLoading}
                      variant="ghost"
                      size="sm"
                      className={`h-7 w-7 p-0 rounded-lg ${isListening ? 'text-highlight-secondary hover:brightness-110 hover:bg-white/10' : 'text-muted-foreground hover:text-foreground hover:bg-white/10'}`}
                    >
                      {isListening ? <StopCircle className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>
                    <Button
                      onClick={() => handleSendMessage()}
                      disabled={(!currentMessage.trim() && !transcript.trim()) || isLoading || isListening}
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 rounded-lg bg-highlight text-primary-foreground hover:brightness-110 hover:bg-highlight disabled:opacity-40 disabled:bg-transparent disabled:text-muted-foreground"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};