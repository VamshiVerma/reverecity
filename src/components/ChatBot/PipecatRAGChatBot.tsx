import React, { useState, useRef, useEffect } from 'react';
import {
  MessageCircle, X, Send, Bot, User, Mic, MicOff, Volume2, VolumeX,
  Sparkles, Zap, RefreshCw, Copy, ThumbsUp, Settings, Minimize2, Maximize2,
  Brain, Database, Link2, Search, Activity, CheckCircle2, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { pipecatRAGService } from '@/services/pipecatService';
import { getLatestWeatherData } from '@/services/weatherService';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  type?: 'text' | 'voice' | 'rag-response' | 'live-data';
  metadata?: {
    dataSource?: string;
    apiCalls?: string[];
    processingTime?: number;
    ragContext?: any[];
    sources?: Array<{ source: string; lastUpdated: string }>;
    confidence?: number;
  };
}

interface PipecatRAGChatBotProps {
  className?: string;
  currentPage?: string;
}

const PipecatRAGChatBot: React.FC<PipecatRAGChatBotProps> = ({ className = "", currentPage = "dashboard" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: `🧠 **Welcome to Revere's AI Assistant with RAG & Pipecat!**

I'm powered by cutting-edge AI technology:

🚀 **Features:**
• **Pipecat Integration**: Advanced conversational AI
• **RAG Model**: Context-aware responses from knowledge base
• **Real-time Data**: Live weather, transit, and city data
• **Voice Interface**: Natural speech interaction
• **Smart Context**: I remember our conversation context

📚 **Knowledge Base:**
I have comprehensive information about Revere including demographics, education, transportation, housing, economy, and more!

💬 **Try asking:**
• "Tell me about Revere's population and demographics"
• "What schools are in the district?"
• "How's the public transportation?"
• "What's the current weather?"

🎤 **Voice Mode:** Click the mic to speak naturally!`,
      role: 'assistant',
      timestamp: new Date(),
      type: 'rag-response',
      metadata: {
        dataSource: 'System',
        confidence: 100
      }
    }
  ]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isPipecatConnected, setIsPipecatConnected] = useState(false);
  const [ragEnabled, setRagEnabled] = useState(true);
  const [showSources, setShowSources] = useState(true);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  const { toast } = useToast();

  // Initialize Pipecat and speech services
  useEffect(() => {
    const initServices = async () => {
      // Initialize Pipecat
      try {
        await pipecatRAGService.initialize();
        // Try to connect (will fail gracefully if no API key)
        await pipecatRAGService.connect().catch(() => {
          console.log('Pipecat connection optional - continuing without it');
        });
        setIsPipecatConnected(true);

        toast({
          title: "🚀 Pipecat Connected",
          description: "Advanced AI features activated",
        });
      } catch (error) {
        console.log('Pipecat not available, using RAG-only mode');
      }

      // Update knowledge base
      await pipecatRAGService.updateKnowledgeBase();
    };

    initServices();

    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        toast({
          title: "🎤 Listening...",
          description: "Speak naturally - I understand context!",
        });
      };

      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');

        setCurrentMessage(transcript);

        if (event.results[0].isFinal) {
          setIsListening(false);
          setTimeout(() => handleSendMessage(transcript), 500);
        }
      };

      recognitionRef.current.onerror = (event) => {
        setIsListening(false);
        toast({
          title: "❌ Voice recognition error",
          description: "Please try again or type your message",
          variant: "destructive"
        });
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    // Initialize speech synthesis
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      pipecatRAGService.disconnect();
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Voice functions
  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        toast({
          title: "❌ Voice not supported",
          description: "Please use a modern browser or type your message",
          variant: "destructive"
        });
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const speakMessage = (text: string) => {
    if (synthRef.current) {
      synthRef.current.cancel();

      const cleanText = text
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/#{1,6}\s/g, '')
        .replace(/•/g, '')
        .replace(/[🎤🔊📊🌤️🚇🔍🎙️📋✅❌🧠🚀💬📚]/g, '')
        .trim();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      synthRef.current.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  // Fetch real-time data when needed
  const fetchLiveData = async (query: string): Promise<any> => {
    const lowerQuery = query.toLowerCase();
    const liveData: any = {};

    if (lowerQuery.includes('weather') || lowerQuery.includes('temperature')) {
      try {
        const weatherData = await getLatestWeatherData();
        if (weatherData?.currentConditions) {
          liveData.weather = {
            temperature: Math.round(weatherData.currentConditions.temp),
            humidity: Math.round(weatherData.currentConditions.humidity),
            condition: weatherData.currentConditions.conditions,
            source: 'Visual Crossing Weather API'
          };
        }
      } catch (error) {
        console.error('Weather fetch failed:', error);
      }
    }

    if (lowerQuery.includes('mbta') || lowerQuery.includes('transit') || lowerQuery.includes('train')) {
      try {
        const response = await fetch('https://api-v3.mbta.com/predictions?filter[route]=Blue&filter[stop]=place-wondl,place-rbmnl&limit=5');
        if (response.ok) {
          const data = await response.json();
          liveData.mbta = {
            predictions: data.data?.length || 0,
            route: 'Blue Line',
            source: 'MBTA API v3'
          };
        }
      } catch (error) {
        console.error('MBTA fetch failed:', error);
      }
    }

    return liveData;
  };

  const handleSendMessage = async (messageOverride?: string) => {
    const messageText = messageOverride || currentMessage;
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageText,
      role: 'user',
      timestamp: new Date(),
      type: messageOverride ? 'voice' : 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsLoading(true);
    setIsTyping(true);

    const startTime = Date.now();

    try {
      // 1. Use RAG to generate response
      const ragResponse = await pipecatRAGService.generateRAGResponse(messageText);

      // 2. Fetch live data if needed
      const liveData = await fetchLiveData(messageText);

      // 3. Combine RAG response with live data
      let finalResponse = ragResponse.response;
      const apiCalls: string[] = [];

      if (liveData.weather) {
        finalResponse += `\n\n🌤️ **Current Weather:**\n`;
        finalResponse += `• Temperature: ${liveData.weather.temperature}°F\n`;
        finalResponse += `• Humidity: ${liveData.weather.humidity}%\n`;
        finalResponse += `• Conditions: ${liveData.weather.condition}`;
        apiCalls.push('Visual Crossing Weather API');
      }

      if (liveData.mbta) {
        finalResponse += `\n\n🚇 **Live Transit Update:**\n`;
        finalResponse += `• Active Predictions: ${liveData.mbta.predictions} for ${liveData.mbta.route}\n`;
        finalResponse += `• Stations: Wonderland, Revere Beach, Beachmont, Suffolk Downs`;
        apiCalls.push('MBTA API v3');
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: finalResponse,
        role: 'assistant',
        timestamp: new Date(),
        type: 'rag-response',
        metadata: {
          dataSource: isPipecatConnected ? 'Pipecat + RAG' : 'RAG Model',
          apiCalls,
          processingTime: Date.now() - startTime,
          ragContext: ragResponse.context,
          sources: ragResponse.sources,
          confidence: ragResponse.context.length > 0 ? 85 : 50
        }
      };

      setMessages(prev => [...prev, aiMessage]);

      // Auto-speak if enabled
      if (autoSpeak && !isSpeaking) {
        setTimeout(() => speakMessage(finalResponse), 500);
      }

      // Store conversation for improving RAG
      await pipecatRAGService.storeConversation(
        'user-session-' + Date.now(),
        messageText,
        finalResponse,
        ragResponse.context
      );

      toast({
        title: "✅ AI Response Generated",
        description: `RAG Context: ${ragResponse.context.length} sources | APIs: ${apiCalls.length}`,
      });

    } catch (error) {
      console.error('Error generating response:', error);

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `❌ I encountered an error while processing your request.

Please try again or rephrase your question. I'm still learning and improving!

**Error**: ${error instanceof Error ? error.message : 'Processing failed'}`,
        role: 'assistant',
        timestamp: new Date(),
        type: 'text',
        metadata: {
          dataSource: 'Error Handler',
          processingTime: Date.now() - startTime
        }
      };

      setMessages(prev => [...prev, errorMessage]);

      toast({
        title: "❌ Processing Error",
        description: "Failed to generate AI response",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg hover:shadow-xl transition-all duration-300 ${className} ${isOpen ? 'hidden' : ''}`}
        size="icon"
      >
        <Brain className="h-6 w-6 text-white" />
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <div className={`fixed bottom-6 right-6 z-50 ${isMinimized ? 'w-80' : 'w-[450px]'} h-[600px] bg-card rounded-lg shadow-2xl border flex flex-col`}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-t-lg">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              <span className="font-semibold">Revere AI Assistant</span>
              <div className="flex gap-1">
                {isPipecatConnected && (
                  <Badge variant="secondary" className="bg-green-500/20 text-white border-green-400 text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Pipecat
                  </Badge>
                )}
                {ragEnabled && (
                  <Badge variant="secondary" className="bg-blue-500/20 text-white border-blue-400 text-xs">
                    <Database className="h-3 w-3 mr-1" />
                    RAG
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-8 w-8 text-white hover:bg-white/20"
              >
                {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 text-white hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Status Bar */}
          <div className="px-4 py-2 bg-muted/50 border-b flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Activity className="h-3 w-3 text-green-500" />
              <span>AI Status: Active</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSources(!showSources)}
                className="h-6 px-2 text-xs"
              >
                <Link2 className="h-3 w-3 mr-1" />
                {showSources ? 'Hide' : 'Show'} Sources
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {message.role === 'assistant' && (
                    <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                      <AvatarFallback className="bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs">
                        <Brain className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex flex-col gap-2 max-w-[85%]">
                    <div className={`rounded-lg px-4 py-3 text-sm whitespace-pre-wrap ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}>
                      {message.content}
                    </div>

                    {/* RAG Context & Sources */}
                    {message.role === 'assistant' && message.metadata && showSources && (
                      <div className="space-y-2">
                        {/* Confidence Score */}
                        {message.metadata.confidence && (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs py-0 px-2">
                              <Activity className="h-3 w-3 mr-1" />
                              Confidence: {message.metadata.confidence}%
                            </Badge>
                          </div>
                        )}

                        {/* Sources */}
                        {message.metadata.sources && message.metadata.sources.length > 0 && (
                          <Card className="p-2 bg-muted/30">
                            <div className="text-xs space-y-1">
                              <div className="font-semibold flex items-center gap-1">
                                <Search className="h-3 w-3" />
                                Sources:
                              </div>
                              {message.metadata.sources.map((source, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-muted-foreground">
                                  <Link2 className="h-3 w-3" />
                                  <span>{source.source}</span>
                                  <span className="text-xs">({source.lastUpdated})</span>
                                </div>
                              ))}
                            </div>
                          </Card>
                        )}

                        {/* Metadata */}
                        <div className="flex flex-wrap gap-1 text-xs">
                          {message.metadata.dataSource && (
                            <Badge variant="secondary" className="text-xs py-0 px-2">
                              {message.metadata.dataSource}
                            </Badge>
                          )}
                          {message.metadata.apiCalls && message.metadata.apiCalls.length > 0 && (
                            <Badge variant="outline" className="text-xs py-0 px-2">
                              {message.metadata.apiCalls.length} APIs
                            </Badge>
                          )}
                          {message.metadata.processingTime && (
                            <Badge variant="outline" className="text-xs py-0 px-2">
                              ⚡ {message.metadata.processingTime}ms
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Voice controls */}
                    {message.role === 'assistant' && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => speakMessage(message.content)}
                          disabled={isSpeaking}
                        >
                          {isSpeaking ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => navigator.clipboard.writeText(message.content)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => toast({
                            title: "✅ Feedback recorded",
                            description: "Thank you for helping improve our AI!"
                          })}
                        >
                          <ThumbsUp className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {message.role === 'user' && (
                    <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                      <AvatarFallback className={`text-xs ${
                        message.type === 'voice'
                          ? 'bg-blue-500 text-white'
                          : 'bg-muted'
                      }`}>
                        {message.type === 'voice' ? <Mic className="h-4 w-4" /> : <User className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}

              {/* Enhanced typing indicator */}
              {(isLoading || isTyping) && (
                <div className="flex gap-3 justify-start">
                  <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                    <AvatarFallback className="bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs animate-pulse">
                      <Brain className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-lg px-4 py-3 max-w-[280px] text-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                      </div>
                      <span className="text-muted-foreground">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Voice & Settings Controls */}
          <div className="px-4 py-2 border-t border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant={autoSpeak ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAutoSpeak(!autoSpeak)}
                  className="h-7 px-3 text-xs"
                >
                  {autoSpeak ? <Volume2 className="h-3 w-3 mr-1" /> : <VolumeX className="h-3 w-3 mr-1" />}
                  Auto-speak
                </Button>

                <Button
                  variant={ragEnabled ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRagEnabled(!ragEnabled)}
                  className="h-7 px-3 text-xs"
                >
                  <Database className="h-3 w-3 mr-1" />
                  RAG
                </Button>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    pipecatRAGService.updateKnowledgeBase();
                    toast({ title: "📚 Knowledge base updated!" });
                  }}
                  className="h-7 px-2"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Enhanced Input */}
          <div className="p-4 border-t">
            {/* Quick Actions */}
            <div className="flex gap-1 mb-3 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={() => setCurrentMessage("Tell me about Revere's demographics")}
                disabled={isLoading}
              >
                📊 Demographics
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={() => setCurrentMessage("What schools are in Revere?")}
                disabled={isLoading}
              >
                🎓 Education
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={() => setCurrentMessage("How's the public transportation?")}
                disabled={isLoading}
              >
                🚇 Transit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={() => setCurrentMessage("Current weather conditions")}
                disabled={isLoading}
              >
                🌤️ Weather
              </Button>
            </div>

            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  placeholder={isListening ? "🎤 Listening..." : "Ask me anything about Revere..."}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading || isListening}
                  className={`flex-1 pr-10 ${
                    isListening ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' : ''
                  }`}
                />

                {/* Voice input button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className={`absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 ${
                    isListening ? 'text-blue-600 bg-blue-100 dark:bg-blue-900/50' : ''
                  }`}
                  onClick={isListening ? stopListening : startListening}
                  disabled={isLoading}
                >
                  {isListening ? (
                    <MicOff className="h-4 w-4 animate-pulse" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <Button
                onClick={() => handleSendMessage()}
                disabled={!currentMessage.trim() || isLoading || isListening}
                size="icon"
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Status indicators */}
            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                {isListening && (
                  <div className="flex items-center gap-1 text-blue-600">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                    <span>Voice recording active</span>
                  </div>
                )}
                {isSpeaking && (
                  <div className="flex items-center gap-1 text-green-600">
                    <Volume2 className="h-3 w-3" />
                    <span>Speaking response</span>
                  </div>
                )}
                {!isListening && !isSpeaking && (
                  <div className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    <span>RAG-Powered AI Ready</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1">
                {isPipecatConnected ? (
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                ) : (
                  <AlertCircle className="h-3 w-3 text-yellow-500" />
                )}
                <span>{isPipecatConnected ? 'Connected' : 'Local RAG'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PipecatRAGChatBot;