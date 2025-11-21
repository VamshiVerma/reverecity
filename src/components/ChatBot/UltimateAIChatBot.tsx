import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageCircle, X, Send, Bot, User, Mic, MicOff, Volume2, VolumeX,
  Upload, File, FileText, FileAudio, Image, Trash2, Search, Brain,
  Cloud, Zap, Settings, Eye, EyeOff, RefreshCw, Copy, ThumbsUp,
  Download, PlayCircle, PauseCircle, MoreVertical, Sparkles,
  Activity, CheckCircle2, AlertCircle, Globe, Database, Cpu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { ultimateAIService, ProcessedContent, AIResponse } from '@/services/ultimateAIService';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  type?: 'text' | 'voice' | 'document_answer' | 'live_data' | 'general_ai' | 'mixed';
  metadata?: {
    sources?: string[];
    confidence?: number;
    processingTime?: number;
    apiCalls?: string[];
    chunksUsed?: number;
    mode?: string;
  };
}

interface UltimateAIChatBotProps {
  className?: string;
}

const UltimateAIChatBot: React.FC<UltimateAIChatBotProps> = ({ className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: `🚀 **Welcome to Ultimate AI Assistant!**

I'm your comprehensive AI companion with advanced capabilities:

🧠 **AI Features:**
• **Smart Conversation**: Natural language understanding
• **Live Data Access**: Weather, transit, news, and more
• **Voice Interaction**: Full voice-to-voice conversations
• **Context Awareness**: I remember our entire conversation

📁 **Document Processing:**
• **PDF Analysis**: Extract and analyze PDF content
• **Word Documents**: Process .docx and .doc files
• **Text Files**: Markdown, plain text, CSV files
• **Audio Transcription**: Convert speech to searchable text
• **Image OCR**: Extract text from images (JPG, PNG)

🌐 **Live Data Integration:**
• **Weather Updates**: Current conditions and forecasts
• **Transit Information**: Real-time MBTA schedules
• **News & Events**: Current happenings
• **Mixed Queries**: Combine document data with live information

🎤 **Advanced Voice:**
• **Speech Recognition**: Speak naturally in any language
• **Voice Output**: I can read responses aloud
• **Audio Processing**: Upload audio files for transcription
• **Voice Commands**: Control features with voice

**Try me out:**
• Upload any document and ask questions about it
• Say "What's the weather?" for live updates
• Have a natural conversation about anything
• Use voice input for hands-free interaction

I'm ready to help with whatever you need! 🌟`,
      role: 'assistant',
      timestamp: new Date(),
      type: 'general_ai',
      metadata: { confidence: 100, mode: 'welcome' }
    }
  ]);

  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingContent, setIsProcessingContent] = useState(false);
  const [processedContent, setProcessedContent] = useState<ProcessedContent[]>([]);

  // Voice features
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [voiceLanguage, setVoiceLanguage] = useState('en-US');

  // UI state
  const [showContent, setShowContent] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [currentMode, setCurrentMode] = useState<'auto' | 'document' | 'live' | 'general'>('auto');

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  const { toast } = useToast();

  // Initialize services
  useEffect(() => {
    initializeVoiceServices();
    loadExistingContent();

    return () => {
      cleanupVoiceServices();
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const initializeVoiceServices = () => {
    // Enhanced speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();

      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = voiceLanguage;
      recognitionRef.current.maxAlternatives = 3;

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        toast({
          title: "🎤 Voice Active",
          description: "Listening... Speak naturally about anything!",
        });
      };

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = 0; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        setCurrentMessage(finalTranscript + interimTranscript);

        if (finalTranscript) {
          setIsListening(false);
          setTimeout(() => handleSendMessage(finalTranscript), 800);
        }
      };

      recognitionRef.current.onerror = (event) => {
        setIsListening(false);
        console.error('Speech recognition error:', event.error);

        if (event.error !== 'aborted') {
          toast({
            title: "🎤 Voice Error",
            description: `Speech recognition failed: ${event.error}`,
            variant: "destructive"
          });
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    // Enhanced speech synthesis
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
  };

  const cleanupVoiceServices = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (synthRef.current) {
      synthRef.current.cancel();
    }
  };

  const loadExistingContent = () => {
    const content = ultimateAIService.getProcessedContent();
    setProcessedContent(content);
  };

  // Enhanced voice functions
  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        toast({
          title: "🎤 Voice Not Available",
          description: "Please check your microphone permissions",
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

  const speakMessage = useCallback((text: string, options?: { rate?: number; pitch?: number; voice?: string }) => {
    if (!synthRef.current) return;

    synthRef.current.cancel();

    // Clean text for speech
    const cleanText = text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/#{1,6}\s/g, '')
      .replace(/•/g, '')
      .replace(/[🚀🧠📁🌐🎤🎯🔍💡⚡🌟📊🔄]/g, '')
      .replace(/\n+/g, '. ')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = options?.rate || 0.9;
    utterance.pitch = options?.pitch || 1.0;
    utterance.volume = 0.8;
    utterance.lang = voiceLanguage;

    // Try to use a better voice if available
    const voices = synthRef.current.getVoices();
    const preferredVoice = voices.find(voice =>
      voice.lang === voiceLanguage && (voice.name.includes('Enhanced') || voice.name.includes('Premium'))
    ) || voices.find(voice => voice.lang === voiceLanguage);

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthRef.current.speak(utterance);
  }, [voiceLanguage]);

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  // Enhanced file upload handler
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingContent(true);

    try {
      const file = files[0];
      const fileType = file.type;

      // Show different toasts based on file type
      let toastMessage = `Processing "${file.name}"...`;
      if (fileType.startsWith('audio/')) {
        toastMessage = `🎵 Transcribing audio file...`;
      } else if (fileType.startsWith('image/')) {
        toastMessage = `🖼️ Extracting text from image...`;
      } else if (fileType === 'application/pdf') {
        toastMessage = `📄 Analyzing PDF document...`;
      }

      toast({
        title: "🚀 Processing Content",
        description: toastMessage,
      });

      const processedContent = await ultimateAIService.processContent(file);
      setProcessedContent(prev => [...prev, processedContent]);

      const fileTypeIcon = fileType.startsWith('audio/') ? '🎵' :
                          fileType.startsWith('image/') ? '🖼️' :
                          fileType === 'application/pdf' ? '📄' : '📝';

      const successMessage: Message = {
        id: Date.now().toString(),
        content: `✅ **Content Successfully Processed!**

${fileTypeIcon} **File**: ${processedContent.fileName}
📊 **Type**: ${processedContent.type.toUpperCase()}
🔢 **Chunks**: ${processedContent.chunks.length} searchable segments
📅 **Processed**: ${new Date(processedContent.metadata.uploadedAt).toLocaleString()}
${processedContent.metadata.duration ? `⏱️ **Duration**: ${Math.round(processedContent.metadata.duration)}s` : ''}
${processedContent.metadata.language ? `🌐 **Language**: ${processedContent.metadata.language}` : ''}

🎯 **Ready for Questions!**
You can now ask me anything about this content:
• "What is this ${processedContent.type} about?"
• "Summarize the key points"
• "Find information about [specific topic]"
• "What are the main takeaways?"

The content has been indexed and is ready for intelligent Q&A!`,
        role: 'assistant',
        timestamp: new Date(),
        type: 'document_answer',
        metadata: {
          sources: [processedContent.fileName],
          chunksUsed: processedContent.chunks.length,
          mode: 'content_processed',
          confidence: 100
        }
      };

      setMessages(prev => [...prev, successMessage]);

      toast({
        title: "✅ Content Ready!",
        description: `"${file.name}" processed successfully`,
      });

    } catch (error) {
      console.error('Content processing error:', error);
      toast({
        title: "❌ Processing Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setIsProcessingContent(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, []);

  // Enhanced message sending
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

    try {
      // Generate ultimate AI response
      const aiResponse: AIResponse = await ultimateAIService.generateUltimateResponse(messageText);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponse.content,
        role: 'assistant',
        timestamp: new Date(),
        type: aiResponse.type,
        metadata: {
          sources: aiResponse.sources,
          confidence: aiResponse.confidence,
          processingTime: aiResponse.metadata.processingTime,
          apiCalls: aiResponse.metadata.apiCalls,
          chunksUsed: aiResponse.metadata.chunksUsed,
          mode: aiResponse.metadata.mode
        }
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Auto-speak response if enabled
      if (autoSpeak && !isSpeaking) {
        setTimeout(() => speakMessage(aiResponse.content), 1000);
      }

      // Show success toast with details
      const modeEmoji = aiResponse.type === 'document_answer' ? '📄' :
                       aiResponse.type === 'live_data' ? '🌐' :
                       aiResponse.type === 'mixed' ? '🔄' : '🧠';

      toast({
        title: `${modeEmoji} Response Generated`,
        description: `Mode: ${aiResponse.metadata.mode} | Confidence: ${aiResponse.confidence}%`,
      });

    } catch (error) {
      console.error('Ultimate AI error:', error);

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `❌ **I encountered an error processing your request.**

**Error details**: ${error instanceof Error ? error.message : 'Unknown error'}

**What you can try:**
• Rephrase your question
• Check your internet connection for live data
• Upload relevant documents for document-specific questions
• Try voice input for better recognition

I'm still learning and improving! Please try again.`,
        role: 'assistant',
        timestamp: new Date(),
        type: 'general_ai',
        metadata: { confidence: 0, mode: 'error' }
      };

      setMessages(prev => [...prev, errorMessage]);

      toast({
        title: "❌ Processing Error",
        description: "Failed to generate response",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const removeContent = (contentId: string) => {
    ultimateAIService.removeContent(contentId);
    setProcessedContent(prev => prev.filter(content => content.id !== contentId));
    toast({
      title: "🗑️ Content Removed",
      description: "Content deleted from memory",
    });
  };

  const clearAllContent = () => {
    processedContent.forEach(content => ultimateAIService.removeContent(content.id));
    setProcessedContent([]);
    toast({
      title: "🧹 All Content Cleared",
      description: "All processed content removed",
    });
  };

  const getFileIcon = (type: string) => {
    if (type === 'audio') return <FileAudio className="h-4 w-4 text-blue-600" />;
    if (type === 'image') return <Image className="h-4 w-4 text-green-600" />;
    return <FileText className="h-4 w-4 text-purple-600" />;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'document_answer': return 'bg-purple-500/10 text-purple-600 border-purple-300';
      case 'live_data': return 'bg-blue-500/10 text-blue-600 border-blue-300';
      case 'mixed': return 'bg-gradient-to-r from-purple-500/10 to-blue-500/10 text-indigo-600 border-indigo-300';
      case 'voice': return 'bg-green-500/10 text-green-600 border-green-300';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-300';
    }
  };

  return (
    <>
      {/* Ultimate Chat Toggle Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 h-16 w-16 rounded-full bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-110 ${className} ${isOpen ? 'hidden' : ''}`}
        size="icon"
      >
        <div className="relative">
          <Brain className="h-7 w-7 text-white" />
          <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-400 rounded-full animate-pulse"></div>
        </div>
      </Button>

      {/* Ultimate Chat Window */}
      {isOpen && (
        <div className={`fixed bottom-6 right-6 z-50 ${isMinimized ? 'w-80 h-16' : 'w-[550px] h-[750px]'} bg-card rounded-xl shadow-2xl border-2 border-purple-200/50 flex flex-col transition-all duration-300`}>
          {/* Enhanced Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white rounded-t-xl">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Brain className="h-6 w-6" />
                <div className="absolute -top-1 -right-1 h-2 w-2 bg-green-400 rounded-full animate-pulse"></div>
              </div>
              <div>
                <span className="font-bold text-lg">Ultimate AI</span>
                <div className="flex gap-1 mt-0.5">
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-xs px-1.5 py-0">
                    <Database className="h-2.5 w-2.5 mr-1" />
                    RAG
                  </Badge>
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-xs px-1.5 py-0">
                    <Globe className="h-2.5 w-2.5 mr-1" />
                    Live
                  </Badge>
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-xs px-1.5 py-0">
                    <Cpu className="h-2.5 w-2.5 mr-1" />
                    AI
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="h-8 w-8 text-white hover:bg-white/20"
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-8 w-8 text-white hover:bg-white/20"
              >
                {isMinimized ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
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

          {!isMinimized && (
            <>
              {/* Advanced Settings Panel */}
              {showAdvanced && (
                <div className="p-3 bg-muted/30 border-b">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={currentMode === 'auto' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentMode('auto')}
                      className="h-7 text-xs"
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      Auto
                    </Button>
                    <Button
                      variant={currentMode === 'document' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentMode('document')}
                      className="h-7 text-xs"
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      Docs
                    </Button>
                    <Button
                      variant={currentMode === 'live' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentMode('live')}
                      className="h-7 text-xs"
                    >
                      <Globe className="h-3 w-3 mr-1" />
                      Live
                    </Button>
                    <Button
                      variant={autoSpeak ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setAutoSpeak(!autoSpeak)}
                      className="h-7 text-xs"
                    >
                      {autoSpeak ? <Volume2 className="h-3 w-3 mr-1" /> : <VolumeX className="h-3 w-3 mr-1" />}
                      Speech
                    </Button>
                  </div>
                </div>
              )}

              {/* Content Panel */}
              {showContent && (
                <div className="p-4 bg-muted/20 border-b">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <File className="h-4 w-4" />
                      Processed Content ({processedContent.length})
                      {isProcessingContent && <RefreshCw className="h-3 w-3 animate-spin" />}
                    </h3>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isProcessingContent}
                        className="h-7 px-3 text-xs"
                      >
                        <Upload className="h-3 w-3 mr-1" />
                        Upload
                      </Button>
                      {processedContent.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={clearAllContent}
                          className="h-7 px-2 text-xs"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {processedContent.length === 0 ? (
                    <Card className="p-4 text-center border-dashed">
                      <div className="space-y-2">
                        <div className="flex justify-center gap-2">
                          <FileText className="h-6 w-6 text-muted-foreground" />
                          <FileAudio className="h-6 w-6 text-muted-foreground" />
                          <Image className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground">No content uploaded yet</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isProcessingContent}
                          className="h-8"
                        >
                          <Upload className="h-3 w-3 mr-1" />
                          Upload First File
                        </Button>
                      </div>
                    </Card>
                  ) : (
                    <div className="space-y-2 max-h-28 overflow-y-auto">
                      {processedContent.map(content => (
                        <Card key={content.id} className="p-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              {getFileIcon(content.type)}
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{content.fileName}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>{content.chunks.length} chunks</span>
                                  {content.metadata.duration && <span>{Math.round(content.metadata.duration)}s</span>}
                                  {content.metadata.language && <span>{content.metadata.language}</span>}
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeContent(content.id)}
                              className="h-6 w-6 p-0 flex-shrink-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Enhanced Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-6">
                  {messages.map((message) => (
                    <div key={message.id} className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {message.role === 'assistant' && (
                        <Avatar className="h-10 w-10 mt-1 flex-shrink-0 border-2 border-purple-200">
                          <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600 text-white text-xs">
                            <Brain className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                      )}

                      <div className="flex flex-col gap-3 max-w-[85%]">
                        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                          message.role === 'user'
                            ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                            : 'bg-muted/80 border border-muted-foreground/20'
                        }`}>
                          <div className="whitespace-pre-wrap">{message.content}</div>
                        </div>

                        {/* Enhanced Message Metadata */}
                        {message.role === 'assistant' && message.metadata && (
                          <div className="space-y-2">
                            {/* Confidence and Performance */}
                            <div className="flex flex-wrap gap-1.5">
                              {message.metadata.confidence !== undefined && (
                                <Badge variant="outline" className={`text-xs py-0.5 px-2 ${getTypeColor(message.type || 'text')}`}>
                                  <Activity className="h-2.5 w-2.5 mr-1" />
                                  {message.metadata.confidence}% confidence
                                </Badge>
                              )}
                              {message.metadata.processingTime && (
                                <Badge variant="outline" className="text-xs py-0.5 px-2">
                                  <Zap className="h-2.5 w-2.5 mr-1" />
                                  {message.metadata.processingTime}ms
                                </Badge>
                              )}
                              {message.metadata.chunksUsed && (
                                <Badge variant="outline" className="text-xs py-0.5 px-2">
                                  <Database className="h-2.5 w-2.5 mr-1" />
                                  {message.metadata.chunksUsed} chunks
                                </Badge>
                              )}
                              {message.metadata.apiCalls && message.metadata.apiCalls.length > 0 && (
                                <Badge variant="outline" className="text-xs py-0.5 px-2">
                                  <Globe className="h-2.5 w-2.5 mr-1" />
                                  {message.metadata.apiCalls.length} API{message.metadata.apiCalls.length !== 1 ? 's' : ''}
                                </Badge>
                              )}
                              {message.type && (
                                <Badge variant="secondary" className={`text-xs py-0.5 px-2 ${getTypeColor(message.type)}`}>
                                  {message.type.replace('_', ' ').toUpperCase()}
                                </Badge>
                              )}
                            </div>

                            {/* Sources */}
                            {message.metadata.sources && message.metadata.sources.length > 0 && (
                              <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-2">
                                <div className="font-medium mb-1">📚 Sources:</div>
                                {message.metadata.sources.map((source, idx) => (
                                  <div key={idx} className="flex items-center gap-1">
                                    <Search className="h-2.5 w-2.5" />
                                    <span>{source}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Enhanced Controls */}
                        {message.role === 'assistant' && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => speakMessage(message.content)}
                              disabled={isSpeaking}
                            >
                              {isSpeaking ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => navigator.clipboard.writeText(message.content)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => toast({ title: "✅ Feedback recorded!", description: "Thanks for helping me improve!" })}
                            >
                              <ThumbsUp className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {message.role === 'user' && (
                        <Avatar className="h-10 w-10 mt-1 flex-shrink-0 border-2 border-muted">
                          <AvatarFallback className={`text-xs ${
                            message.type === 'voice'
                              ? 'bg-blue-500 text-white'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {message.type === 'voice' ? <Mic className="h-4 w-4" /> : <User className="h-4 w-4" />}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}

                  {/* Enhanced Loading Indicator */}
                  {isLoading && (
                    <div className="flex gap-4 justify-start">
                      <Avatar className="h-10 w-10 mt-1 flex-shrink-0 border-2 border-purple-200">
                        <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600 text-white text-xs animate-pulse">
                          <Brain className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="bg-muted/80 border border-muted-foreground/20 rounded-2xl px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                            <div className="w-2 h-2 bg-cyan-600 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                          </div>
                          <span className="text-sm text-muted-foreground">AI is thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Status Bar */}
              <div className="px-4 py-2 border-t bg-muted/20">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    {isListening && (
                      <div className="flex items-center gap-1 text-blue-600">
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                        <span>Voice Active</span>
                      </div>
                    )}
                    {isSpeaking && (
                      <div className="flex items-center gap-1 text-green-600">
                        <Volume2 className="h-3 w-3" />
                        <span>Speaking</span>
                      </div>
                    )}
                    {isProcessingContent && (
                      <div className="flex items-center gap-1 text-purple-600">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        <span>Processing...</span>
                      </div>
                    )}
                    {!isListening && !isSpeaking && !isProcessingContent && (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Ready</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Mode: {currentMode}</span>
                    <div className="flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-purple-600" />
                      <span className="font-medium text-purple-600">Ultimate AI</span>
                    </div>
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
                    onClick={() => setCurrentMessage("What's the weather like today?")}
                    disabled={isLoading}
                  >
                    🌤️ Weather
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-3 text-xs"
                    onClick={() => setCurrentMessage("Summarize my uploaded documents")}
                    disabled={isLoading || processedContent.length === 0}
                  >
                    📄 Summary
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-3 text-xs"
                    onClick={() => setCurrentMessage("Tell me about MBTA transit")}
                    disabled={isLoading}
                  >
                    🚇 Transit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-3 text-xs"
                    onClick={() => setCurrentMessage("What can you help me with?")}
                    disabled={isLoading}
                  >
                    ❓ Help
                  </Button>
                </div>

                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input
                      ref={inputRef}
                      value={currentMessage}
                      onChange={(e) => setCurrentMessage(e.target.value)}
                      placeholder={isListening ? "🎤 Listening..." : "Ask me anything - documents, live data, general questions..."}
                      onKeyPress={handleKeyPress}
                      disabled={isLoading || isListening}
                      className={`pr-12 transition-colors ${
                        isListening
                          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20'
                          : 'focus:border-purple-500'
                      }`}
                    />

                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-8 w-8 p-0 ${
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
                  </div>

                  <Button
                    onClick={() => handleSendMessage()}
                    disabled={!currentMessage.trim() || isLoading || isListening}
                    size="icon"
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 transition-all duration-200"
                  >
                    {isLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.md,.doc,.docx,.csv,.mp3,.wav,.m4a,.ogg,.webm,.jpg,.jpeg,.png,.gif,.webp"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      )}
    </>
  );
};

export default UltimateAIChatBot;