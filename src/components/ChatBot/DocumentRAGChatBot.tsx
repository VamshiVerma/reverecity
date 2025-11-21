import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageCircle, X, Send, Bot, User, Mic, MicOff, Volume2, VolumeX,
  Upload, File, FileText, Trash2, Search, BookOpen, AlertCircle, CheckCircle2,
  Download, Eye, RefreshCw, Copy, ThumbsUp, Brain, Database
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { documentProcessingService, ProcessedDocument, DocumentChunk } from '@/services/documentProcessingService';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  type?: 'text' | 'voice' | 'document-answer';
  metadata?: {
    sourceDocuments?: string[];
    relevantChunks?: number;
    processingTime?: number;
    confidence?: number;
  };
}

interface DocumentRAGChatBotProps {
  className?: string;
}

const DocumentRAGChatBot: React.FC<DocumentRAGChatBotProps> = ({ className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: `📚 **Welcome to Document Q&A Assistant!**

I can help you analyze and answer questions about your documents.

🔥 **What I Can Do:**
• **Upload Documents**: PDF, Word, Text files, CSV
• **Smart Analysis**: Extract and understand content
• **Q&A Mode**: Ask questions about your documents
• **Voice Interaction**: Speak your questions naturally

📁 **Supported Formats:**
• PDF (.pdf)
• Word Documents (.docx, .doc)
• Text Files (.txt, .md)
• CSV Files (.csv)

🚀 **Get Started:**
1. Click "Upload Document" to add your files
2. Wait for processing to complete
3. Ask questions about the content
4. Get intelligent answers with source citations

Try uploading a document and ask: "What is this document about?" or "Summarize the key points"`,
      role: 'assistant',
      timestamp: new Date(),
      type: 'text'
    }
  ]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingDoc, setIsProcessingDoc] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<ProcessedDocument[]>([]);
  const [showDocuments, setShowDocuments] = useState(true);

  // Voice features
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  const { toast } = useToast();

  // Initialize speech services
  useEffect(() => {
    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onend = () => setIsListening(false);

      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');

        setCurrentMessage(transcript);

        if (event.results[0].isFinal) {
          setTimeout(() => handleSendMessage(transcript), 500);
        }
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        toast({
          title: "❌ Voice recognition error",
          description: "Please try again or type your message",
          variant: "destructive"
        });
      };
    }

    // Initialize speech synthesis
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (synthRef.current) synthRef.current.cancel();
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
        toast({
          title: "🎤 Listening...",
          description: "Ask a question about your documents",
        });
      } catch (error) {
        toast({
          title: "❌ Voice not supported",
          description: "Please use a modern browser",
          variant: "destructive"
        });
      }
    }
  };

  const speakMessage = (text: string) => {
    if (synthRef.current) {
      synthRef.current.cancel();
      const cleanText = text
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/[📚🔥📁🚀🎤🔊❌✅]/g, '')
        .trim();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      synthRef.current.speak(utterance);
    }
  };

  // Document upload handler
  const handleDocumentUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingDoc(true);

    try {
      const file = files[0];

      toast({
        title: "📄 Processing document...",
        description: `Analyzing "${file.name}"`,
      });

      const processedDoc = await documentProcessingService.processDocument(file);
      setUploadedDocs(prev => [...prev, processedDoc]);

      const successMessage: Message = {
        id: Date.now().toString(),
        content: `✅ **Document Processed Successfully!**

**File:** ${processedDoc.fileName}
**Type:** ${processedDoc.fileType}
**Chunks:** ${processedDoc.totalChunks} text segments
**Uploaded:** ${new Date(processedDoc.uploadedAt).toLocaleString()}

🎯 **You can now ask questions like:**
• "What is this document about?"
• "Summarize the main points"
• "Find information about [specific topic]"
• "What are the key conclusions?"

The document has been processed and is ready for Q&A!`,
        role: 'assistant',
        timestamp: new Date(),
        type: 'document-answer',
        metadata: {
          sourceDocuments: [processedDoc.fileName],
          relevantChunks: processedDoc.totalChunks,
          processingTime: 0
        }
      };

      setMessages(prev => [...prev, successMessage]);

      toast({
        title: "✅ Document ready!",
        description: `"${file.name}" processed into ${processedDoc.totalChunks} chunks`,
      });

    } catch (error) {
      console.error('Document processing error:', error);
      toast({
        title: "❌ Processing failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setIsProcessingDoc(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, []);

  // Send message handler
  const handleSendMessage = async (messageOverride?: string) => {
    const messageText = messageOverride || currentMessage;
    if (!messageText.trim() || isLoading) return;

    if (uploadedDocs.length === 0) {
      toast({
        title: "📁 No documents uploaded",
        description: "Please upload a document first to ask questions",
        variant: "destructive"
      });
      return;
    }

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

    const startTime = Date.now();

    try {
      // Search for relevant document chunks
      const relevantChunks = documentProcessingService.searchDocuments(messageText, 5);

      if (relevantChunks.length === 0) {
        const noResultsMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: `🔍 **No Relevant Information Found**

I couldn't find information related to "${messageText}" in your uploaded documents.

🎯 **Suggestions:**
• Try rephrasing your question
• Use different keywords
• Ask about general topics in the document
• Upload additional documents with relevant content

**Available documents:** ${uploadedDocs.map(doc => doc.fileName).join(', ')}`,
          role: 'assistant',
          timestamp: new Date(),
          type: 'document-answer',
          metadata: {
            sourceDocuments: uploadedDocs.map(doc => doc.fileName),
            relevantChunks: 0,
            processingTime: Date.now() - startTime,
            confidence: 0
          }
        };

        setMessages(prev => [...prev, noResultsMessage]);
        return;
      }

      // Generate answer from document chunks
      const answer = documentProcessingService.generateDocumentAnswer(messageText, relevantChunks);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: answer,
        role: 'assistant',
        timestamp: new Date(),
        type: 'document-answer',
        metadata: {
          sourceDocuments: [...new Set(relevantChunks.map(chunk => chunk.metadata.fileName))],
          relevantChunks: relevantChunks.length,
          processingTime: Date.now() - startTime,
          confidence: relevantChunks.length > 0 ? Math.min(95, relevantChunks.length * 20) : 0
        }
      };

      setMessages(prev => [...prev, aiMessage]);

      // Auto-speak if enabled
      if (autoSpeak && !isSpeaking) {
        setTimeout(() => speakMessage(answer), 500);
      }

      toast({
        title: "🎯 Answer generated",
        description: `Found ${relevantChunks.length} relevant sections`,
      });

    } catch (error) {
      console.error('Error generating answer:', error);

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `❌ **Error Processing Question**

I encountered an error while analyzing your question. Please try again.

**Error:** ${error instanceof Error ? error.message : 'Unknown error'}`,
        role: 'assistant',
        timestamp: new Date(),
        type: 'text'
      };

      setMessages(prev => [...prev, errorMessage]);

      toast({
        title: "❌ Processing error",
        description: "Failed to generate answer",
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

  const removeDocument = (docId: string) => {
    documentProcessingService.removeDocument(docId);
    setUploadedDocs(prev => prev.filter(doc => doc.id !== docId));
    toast({
      title: "🗑️ Document removed",
      description: "Document deleted from memory",
    });
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 shadow-lg hover:shadow-xl transition-all duration-300 ${className} ${isOpen ? 'hidden' : ''}`}
        size="icon"
      >
        <BookOpen className="h-6 w-6 text-white" />
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[500px] h-[700px] bg-card rounded-lg shadow-2xl border flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-t-lg">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              <span className="font-semibold">Document Q&A</span>
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-xs">
                <Database className="h-3 w-3 mr-1" />
                RAG
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Documents Panel */}
          {showDocuments && (
            <div className="p-4 bg-muted/30 border-b">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-1">
                  <File className="h-4 w-4" />
                  Documents ({uploadedDocs.length})
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingDoc}
                  className="h-7 px-3 text-xs"
                >
                  {isProcessingDoc ? (
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Upload className="h-3 w-3 mr-1" />
                  )}
                  Upload
                </Button>
              </div>

              {uploadedDocs.length === 0 ? (
                <Card className="p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-2">No documents uploaded yet</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-7 text-xs"
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    Upload First Document
                  </Button>
                </Card>
              ) : (
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {uploadedDocs.map(doc => (
                    <Card key={doc.id} className="p-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{doc.fileName}</p>
                            <p className="text-xs text-muted-foreground">
                              {doc.totalChunks} chunks
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDocument(doc.id)}
                          className="h-6 w-6 p-0"
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

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {message.role === 'assistant' && (
                    <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                      <AvatarFallback className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs">
                        <BookOpen className="h-4 w-4" />
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

                    {/* Message metadata */}
                    {message.role === 'assistant' && message.metadata && (
                      <div className="space-y-1">
                        <div className="flex flex-wrap gap-1 text-xs">
                          {message.metadata.confidence !== undefined && (
                            <Badge variant="outline" className="text-xs py-0 px-2">
                              📊 {message.metadata.confidence}% confidence
                            </Badge>
                          )}
                          {message.metadata.relevantChunks && (
                            <Badge variant="outline" className="text-xs py-0 px-2">
                              📄 {message.metadata.relevantChunks} chunks
                            </Badge>
                          )}
                          {message.metadata.processingTime && (
                            <Badge variant="outline" className="text-xs py-0 px-2">
                              ⚡ {message.metadata.processingTime}ms
                            </Badge>
                          )}
                        </div>

                        {message.metadata.sourceDocuments && (
                          <div className="text-xs text-muted-foreground">
                            📚 Sources: {message.metadata.sourceDocuments.join(', ')}
                          </div>
                        )}
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
                          onClick={() => toast({ title: "✅ Feedback recorded!", description: "Thanks!" })}
                        >
                          <ThumbsUp className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {message.role === 'user' && (
                    <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                      <AvatarFallback className={`text-xs ${
                        message.type === 'voice' ? 'bg-blue-500 text-white' : 'bg-muted'
                      }`}>
                        {message.type === 'voice' ? <Mic className="h-4 w-4" /> : <User className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                    <AvatarFallback className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs animate-pulse">
                      <Search className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-lg px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                      </div>
                      <span>Analyzing documents...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Controls */}
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
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDocuments(!showDocuments)}
                  className="h-7 px-2"
                >
                  <Eye className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  placeholder={uploadedDocs.length === 0 ? "Upload a document first..." : (isListening ? "🎤 Listening..." : "Ask about your documents...")}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading || isListening || uploadedDocs.length === 0}
                  className={`pr-10 ${isListening ? 'border-blue-500 bg-blue-50/50' : ''}`}
                />

                <Button
                  variant="ghost"
                  size="sm"
                  className={`absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 ${
                    isListening ? 'text-blue-600 bg-blue-100' : ''
                  }`}
                  onClick={isListening ? () => recognitionRef.current?.stop() : startListening}
                  disabled={isLoading || uploadedDocs.length === 0}
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
                disabled={!currentMessage.trim() || isLoading || isListening || uploadedDocs.length === 0}
                size="icon"
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                {isListening && (
                  <div className="flex items-center gap-1 text-blue-600">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                    <span>Voice active</span>
                  </div>
                )}
                {isSpeaking && (
                  <div className="flex items-center gap-1 text-green-600">
                    <Volume2 className="h-3 w-3" />
                    <span>Speaking</span>
                  </div>
                )}
                {!isListening && !isSpeaking && uploadedDocs.length > 0 && (
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    <span>Ready for questions</span>
                  </div>
                )}
                {uploadedDocs.length === 0 && (
                  <div className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 text-yellow-500" />
                    <span>Upload document to start</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                <span>Document AI</span>
              </div>
            </div>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.md,.doc,.docx,.csv"
            onChange={handleDocumentUpload}
            className="hidden"
          />
        </div>
      )}
    </>
  );
};

export default DocumentRAGChatBot;