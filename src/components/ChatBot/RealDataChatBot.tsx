import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageCircle, X, Send, Bot, User, Mic, MicOff, Volume2, VolumeX,
  Sparkles, Zap, RefreshCw, Copy, ThumbsUp, Settings, Minimize2, Maximize2,
  Upload, File, FileText, Trash2, Paperclip, FileAudio, Image
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { getLatestWeatherData } from '@/services/weatherService';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  type?: 'text' | 'voice' | 'data-insight' | 'document' | 'hybrid';
  metadata?: {
    dataSource?: string;
    apiCalls?: string[];
    processingTime?: number;
    documentSources?: string[];
    hasDocuments?: boolean;
  };
}

interface UploadedDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string;
  chunks: string[];
  uploadedAt: Date;
}

interface RealDataChatBotProps {
  className?: string;
  currentPage?: string;
}

const RealDataChatBot: React.FC<RealDataChatBotProps> = ({ className = "", currentPage = "dashboard" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: `🧠 **Welcome to Revere's RAG-Powered AI Assistant!**

I now use an intelligent knowledge base to answer your questions about Revere!

🎙️ **Enhanced Voice Features:**
• Real-time speech-to-text as you speak
• Live volume monitoring and confidence levels
• Streaming transcription display
• Voice activity detection

📚 **RAG Knowledge System:**
• Semantic search through Revere documents
• Intelligent question answering with sources
• Context-aware responses from knowledge base
• Evidence-based answers with citations

📄 **Document Features:**
• Upload PDF, Word, Text, Audio files
• Ask questions about your documents
• Combine document insights with knowledge base

🎯 **Try asking:** "What is Revere Beach?" or "Tell me about city services" or "How do I contact City Hall?"`,
      role: 'assistant',
      timestamp: new Date(),
      type: 'data-insight',
      metadata: {
        dataSource: 'Built-in',
        apiCalls: [],
        processingTime: 0
      }
    }
  ]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [voiceVolume, setVoiceVolume] = useState(0);
  const [voiceConfidence, setVoiceConfidence] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const { toast } = useToast();

  // Document processing functions
  const processDocument = useCallback(async (file: File): Promise<UploadedDocument> => {
    const content = await extractFileContent(file);
    const chunks = chunkContent(content);

    return {
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      type: file.type,
      size: file.size,
      content,
      chunks,
      uploadedAt: new Date()
    };
  }, []);

  const extractFileContent = async (file: File): Promise<string> => {
    console.log(`📄 Extracting content from ${file.name} (${file.type})`);

    try {
      if (file.type.startsWith('text/') || file.type === 'text/plain') {
        // Text files - direct extraction
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsText(file);
        });

      } else if (file.type === 'application/pdf') {
        // PDF files - extract text using PDF.js
        return new Promise(async (resolve, reject) => {
          try {
            const arrayBuffer = await file.arrayBuffer();

            // Dynamic import of PDF.js
            const pdfjsLib = await import('pdfjs-dist');

            // Set worker source to local file
            pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            let textContent = '';

            // Extract text from all pages
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
              const page = await pdf.getPage(pageNum);
              const content = await page.getTextContent();
              const pageText = content.items.map((item: any) => item.str).join(' ');
              textContent += `\n\n=== Page ${pageNum} ===\n${pageText}`;
            }

            if (textContent.trim()) {
              resolve(`📄 **PDF Document: ${file.name}**\n\n**Extracted Content:**\n${textContent}`);
            } else {
              resolve(`📄 **PDF Document: ${file.name}**\n\n⚠️ This PDF appears to be image-based or encrypted. No text could be extracted. You can still ask me general questions about the document structure or upload a text-based PDF for full content analysis.`);
            }
          } catch (error) {
            console.error('PDF processing error:', error);
            resolve(`📄 **PDF Document: ${file.name}**\n\n❌ Error processing PDF: ${error instanceof Error ? error.message : 'Unknown error'}. You can still ask me general questions about the document.`);
          }
        });

      } else if (file.type.includes('word') || file.type.includes('document') || file.name.endsWith('.docx')) {
        // Word documents - extract using mammoth
        return new Promise(async (resolve, reject) => {
          try {
            const arrayBuffer = await file.arrayBuffer();

            // Dynamic import of mammoth
            const mammoth = await import('mammoth');

            const result = await mammoth.extractRawText({ arrayBuffer });
            const textContent = result.value;

            if (textContent.trim()) {
              resolve(`📄 **Word Document: ${file.name}**\n\n**Extracted Content:**\n${textContent}`);
            } else {
              resolve(`📄 **Word Document: ${file.name}**\n\n⚠️ This document appears to be empty or contains only images/formatting. You can still ask me general questions about the document.`);
            }
          } catch (error) {
            console.error('Word document processing error:', error);
            resolve(`📄 **Word Document: ${file.name}**\n\n❌ Error processing document: ${error instanceof Error ? error.message : 'Unknown error'}. You can still ask me general questions about the document.`);
          }
        });

      } else if (file.type.startsWith('audio/')) {
        // Audio files - placeholder for transcription
        return `🎵 **Audio File: ${file.name}**\n\n⚠️ Audio transcription is not yet implemented, but would use services like:\n• OpenAI Whisper\n• Google Speech-to-Text\n• Azure Speech Services\n\nOnce transcribed, you could ask:\n• "What was discussed in this audio?"\n• "Summarize the main topics"\n• "Find mentions of [specific topic]"`;

      } else {
        // Other file types
        return `📄 **Document: ${file.name}**\n\n⚠️ This file type (${file.type}) is not yet supported for content extraction. Supported formats:\n• Text files (.txt, .md)\n• PDF files (.pdf)\n• Word documents (.docx)\n• Audio files (.mp3, .wav, etc.)\n\nYou can still ask me general questions about the document.`;
      }
    } catch (error) {
      console.error('File processing error:', error);
      return `❌ **Error processing ${file.name}**\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease try uploading the file again or use a different format.`;
    }
  };

  const chunkContent = (content: string): string[] => {
    const chunkSize = 1000;
    const chunks: string[] = [];

    for (let i = 0; i < content.length; i += chunkSize) {
      chunks.push(content.slice(i, i + chunkSize));
    }

    return chunks;
  };

  const searchDocuments = (query: string): { chunk: string; docName: string; score: number }[] => {
    const results: { chunk: string; docName: string; score: number }[] = [];
    const queryLower = query.toLowerCase().trim();

    console.log(`🔍 Searching documents for: "${query}"`);
    console.log(`📄 Available documents: ${uploadedDocuments.length}`);

    if (!queryLower || uploadedDocuments.length === 0) {
      return results;
    }

    uploadedDocuments.forEach(doc => {
      console.log(`🔍 Searching in document: ${doc.name} (${doc.chunks.length} chunks)`);

      doc.chunks.forEach((chunk, index) => {
        const chunkLower = chunk.toLowerCase();
        let score = 0;

        // Extract meaningful words (remove common stopwords)
        const stopwords = new Set(['the', 'is', 'at', 'which', 'on', 'and', 'a', 'to', 'are', 'as', 'was', 'for', 'in', 'of', 'with', 'by', 'from', 'that', 'this', 'it']);
        const queryWords = queryLower.split(/\s+/).filter(word =>
          word.length > 2 && !stopwords.has(word)
        );

        // Score based on different matching strategies
        queryWords.forEach(word => {
          // Exact word matches (higher score)
          const exactMatches = (chunkLower.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
          score += exactMatches * 5;

          // Partial matches (lower score)
          if (chunkLower.includes(word)) {
            score += 2;
          }

          // Context scoring - higher score if words appear near each other
          if (queryWords.length > 1) {
            const wordIndex = chunkLower.indexOf(word);
            if (wordIndex !== -1) {
              queryWords.forEach(otherWord => {
                if (word !== otherWord) {
                  const otherIndex = chunkLower.indexOf(otherWord);
                  if (otherIndex !== -1 && Math.abs(wordIndex - otherIndex) < 100) {
                    score += 1;
                  }
                }
              });
            }
          }
        });

        // Bonus points for questions about document structure
        if (queryLower.includes('document') || queryLower.includes('summarize') ||
            queryLower.includes('main') || queryLower.includes('key') ||
            queryLower.includes('important') || queryLower.includes('about') ||
            queryLower.includes('what') || queryLower.includes('tell') ||
            queryLower.includes('explain') || queryLower.includes('this')) {
          score += 3;
        }

        // Lower threshold - include more potential matches
        if (score > 0) {
          results.push({
            chunk: chunk.length > 500 ? chunk.substring(0, 500) + '...' : chunk,
            docName: doc.name,
            score
          });
          console.log(`✓ Found match in chunk ${index + 1} with score: ${score}`);
        }
      });
    });

    // More inclusive sorting - include lower-scored results too
    const sortedResults = results.sort((a, b) => b.score - a.score).slice(0, 5);
    console.log(`🎯 Found ${sortedResults.length} relevant chunks`);

    // If no results but this looks like a general document question, return first chunk of each document
    if (sortedResults.length === 0 && uploadedDocuments.length > 0) {
      const generalQueries = ['what', 'about', 'document', 'this', 'tell', 'explain', 'summarize', 'content'];
      const isGeneralQuery = generalQueries.some(term => queryLower.includes(term)) || queryLower.length < 20;

      if (isGeneralQuery) {
        console.log('🔄 No specific matches, but looks like general document query - returning overview...');
        uploadedDocuments.forEach(doc => {
          if (doc.chunks.length > 0) {
            results.push({
              chunk: doc.chunks[0].length > 500 ? doc.chunks[0].substring(0, 500) + '...' : doc.chunks[0],
              docName: doc.name,
              score: 1 // Low score but still included
            });
          }
        });
        return results.slice(0, 5);
      }
    }

    return sortedResults;
  };

  // Handle file upload
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingDoc(true);
    const file = files[0];

    try {
      toast({
        title: "📄 Processing document...",
        description: `Analyzing "${file.name}"`,
      });

      const processedDoc = await processDocument(file);
      setUploadedDocuments(prev => [...prev, processedDoc]);

      const uploadMessage: Message = {
        id: Date.now().toString(),
        content: `✅ **Document Uploaded Successfully!**

📄 **File:** ${processedDoc.name}
📊 **Size:** ${(processedDoc.size / 1024).toFixed(1)} KB
🔢 **Chunks:** ${processedDoc.chunks.length}
⏰ **Processed:** ${processedDoc.uploadedAt.toLocaleTimeString()}

🎯 **Ready for Questions!**
You can now ask me about this document content, or combine it with live Revere data:

• "What is this document about?"
• "Compare this document with current weather"
• "Summarize this with today's MBTA data"
• "Find [topic] in my document"

I'll provide intelligent answers using both your document and real-time data!`,
        role: 'assistant',
        timestamp: new Date(),
        type: 'document',
        metadata: {
          dataSource: 'Document Upload',
          documentSources: [processedDoc.name],
          hasDocuments: true
        }
      };

      setMessages(prev => [...prev, uploadMessage]);

      toast({
        title: "✅ Document ready!",
        description: `"${file.name}" processed successfully`,
      });

    } catch (error) {
      console.error('Document processing error:', error);
      toast({
        title: "❌ Processing failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setIsUploadingDoc(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [processDocument, toast]);

  const removeDocument = (docId: string) => {
    setUploadedDocuments(prev => prev.filter(doc => doc.id !== docId));
    toast({
      title: "🗑️ Document removed",
      description: "Document deleted from memory",
    });
  };

  // Initialize speech recognition and synthesis
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        toast({
          title: "🎤 Listening...",
          description: "Speak clearly and I'll transcribe your message",
        });
      };

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setCurrentMessage(transcript);
        setIsListening(false);

        toast({
          title: "✅ Voice captured!",
          description: `I heard: "${transcript}"`,
        });

        // Auto-send the voice message
        setTimeout(() => handleSendMessage(transcript), 500);
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
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // WebSocket connection for RAG integration
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setConnectionStatus('connecting');
    const ws = new WebSocket('ws://localhost:8001/ws');

    ws.onopen = () => {
      setConnectionStatus('connected');
      console.log('🔗 Connected to RAG voice server');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      setConnectionStatus('disconnected');
      console.log('🔌 Disconnected from voice server');
    };

    ws.onerror = (error) => {
      setConnectionStatus('disconnected');
      console.error('WebSocket error:', error);
    };

    wsRef.current = ws;
  }, []);

  // Helper function to add messages
  const addMessage = (content: string, role: 'user' | 'assistant', type: string = 'text', metadata?: any) => {
    const message: Message = {
      id: Date.now().toString(),
      content,
      role,
      timestamp: new Date(),
      type: type as any,
      metadata
    };
    setMessages(prev => [...prev, message]);
  };

  // Handle WebSocket messages
  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'transcription_partial':
        setStreamingText(data.text);
        setVoiceConfidence(data.confidence || 0);
        break;

      case 'transcription_complete':
        setStreamingText('');
        setCurrentMessage(data.text);
        setIsListening(false);
        break;

      case 'text_response':
        setIsLoading(false);
        addMessage(data.content, 'assistant', 'voice', {
          method: data.metadata?.method || 'rag_retrieval',
          sources: data.metadata?.data_sources?.length || 0,
          processingTime: data.metadata?.processing_time_ms || 0
        });
        break;

      case 'error':
        setIsLoading(false);
        setIsListening(false);
        toast({
          title: "Voice Error",
          description: data.message || "An error occurred",
          variant: "destructive"
        });
        break;
    }
  };

  // Enhanced voice recognition with streaming
  const startListening = async () => {
    try {
      // Connect to WebSocket if not connected
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        connectWebSocket();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      // Setup audio analysis for volume meter
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      analyserRef.current.fftSize = 256;
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      // Start volume monitoring
      const updateVolume = () => {
        if (analyserRef.current && isListening) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setVoiceVolume(average / 255 * 100);
          requestAnimationFrame(updateVolume);
        }
      };
      updateVolume();

      // Setup MediaRecorder for audio data
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const reader = new FileReader();
          reader.onload = () => {
            wsRef.current?.send(reader.result as ArrayBuffer);
          };
          reader.readAsArrayBuffer(event.data);
        }
      };

      mediaRecorder.start(100);
      mediaRecorderRef.current = mediaRecorder;

      setIsListening(true);
      setStreamingText('');

    } catch (error) {
      console.error('Error starting voice recording:', error);
      toast({
        title: "Microphone Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    setIsListening(false);
    setVoiceVolume(0);

    if (streamingText.trim()) {
      addMessage(streamingText, 'user', 'voice');
      setIsLoading(true);

      // Send to RAG server for processing
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'text_input',
          text: streamingText
        }));
      }
    }

    setStreamingText('');
  };

  // Text-to-speech functions
  const speakMessage = (text: string) => {
    if (synthRef.current) {
      synthRef.current.cancel(); // Stop any ongoing speech

      // Clean up markdown formatting for speech
      const cleanText = text
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown
        .replace(/\*(.*?)\*/g, '$1') // Remove italic markdown
        .replace(/#{1,6}\s/g, '') // Remove headers
        .replace(/•/g, '') // Remove bullet points
        .replace(/📊|🌤️|🚇|🔍|🎙️|🔊|📋|✅|❌/g, '') // Remove emojis
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

  const fetchRealWeatherData = async () => {
    try {
      console.log('🌤️ Fetching REAL weather from Visual Crossing API...');
      const weatherData = await getLatestWeatherData();
      if (weatherData?.currentConditions) {
        return {
          temperature: Math.round(weatherData.currentConditions.temp),
          humidity: Math.round(weatherData.currentConditions.humidity),
          condition: weatherData.currentConditions.conditions,
          source: 'Visual Crossing Weather API'
        };
      }
    } catch (error) {
      console.error('Weather API failed:', error);
    }
    return null;
  };

  const fetchRealCensusData = async () => {
    try {
      console.log('📊 Fetching REAL data from US Census Bureau...');
      const response = await fetch('https://api.census.gov/data/2022/acs/acs5?get=B01003_001E,B19013_001E&for=place:57130&in=state:25');
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 1) {
          return {
            population: parseInt(data[1][0]),
            medianIncome: parseInt(data[1][1]),
            source: 'US Census Bureau API'
          };
        }
      }
    } catch (error) {
      console.error('Census API failed:', error);
    }
    return null;
  };

  const fetchRealMBTAData = async () => {
    try {
      console.log('🚇 Fetching REAL data from MBTA API v3...');
      const response = await fetch('https://api-v3.mbta.com/predictions?filter[route]=Blue&filter[stop]=place-wondl,place-rbmnl&limit=5');
      if (response.ok) {
        const data = await response.json();
        return {
          predictions: data.data?.length || 0,
          route: 'Blue Line',
          source: 'MBTA API v3'
        };
      }
    } catch (error) {
      console.error('MBTA API failed:', error);
    }
    return null;
  };

  const generateHybridResponse = async (userMessage: string): Promise<{ content: string; metadata: any }> => {
    const lowerMessage = userMessage.toLowerCase();
    const startTime = Date.now();
    console.log('🤖 Generating HYBRID response (docs + real data) for:', userMessage);
    console.log('📄 Available documents:', uploadedDocuments.length);

    const apiCalls: string[] = [];
    const documentSources: string[] = [];
    let response = '';
    let responseType = 'text';

    // Check if user needs live data
    const needsWeatherData = lowerMessage.includes('weather') || lowerMessage.includes('temperature');
    const needsCensusData = lowerMessage.includes('population') || lowerMessage.includes('census') || lowerMessage.includes('demographics');
    const needsMBTAData = lowerMessage.includes('mbta') || lowerMessage.includes('transit') || lowerMessage.includes('blue line') || lowerMessage.includes('train');
    const needsLiveData = needsWeatherData || needsCensusData || needsMBTAData;

    // Search uploaded documents first (always, if available)
    const documentResults = uploadedDocuments.length > 0 ? searchDocuments(userMessage) : [];
    const hasDocumentResults = documentResults.length > 0;

    // PRIORITY 1: If documents are uploaded, ALWAYS search them first
    if (uploadedDocuments.length > 0) {
      console.log('📄 Documents available - searching for relevant content...');
      const hasSpecificMatches = hasDocumentResults;

      // CASE 1: User asks specifically about documents + live data (hybrid response)
      if (hasSpecificMatches && needsLiveData) {
        responseType = 'hybrid';
        response = `🔄 **Hybrid Response: Your Documents + Live Revere Data**\n\n`;

        // Add document insights
        response += `📄 **Document Insights:**\n\n`;
        documentResults.forEach((result, index) => {
          response += `**${result.docName}** (Relevance: ${result.score}):\n`;
          response += `${result.chunk}\n\n`;
          documentSources.push(result.docName);
        });

        response += `---\n\n📡 **Live Revere Data (Current):**\n\n`;

        // Add live data
        if (needsWeatherData) {
          apiCalls.push('Visual Crossing Weather API');
          const weatherData = await fetchRealWeatherData();
          if (weatherData) {
            response += `🌤️ **Weather**: ${weatherData.temperature}°F, ${weatherData.condition} (${weatherData.humidity}% humidity)\n`;
          }
        }

        if (needsMBTAData) {
          apiCalls.push('MBTA API v3');
          const mbtaData = await fetchRealMBTAData();
          if (mbtaData) {
            response += `🚇 **Transit**: ${mbtaData.predictions} predictions for ${mbtaData.route}\n`;
          }
        }

        if (needsCensusData) {
          apiCalls.push('US Census Bureau API');
          const censusData = await fetchRealCensusData();
          if (censusData) {
            response += `📊 **Demographics**: Population ${censusData.population.toLocaleString()}, Median Income $${censusData.medianIncome.toLocaleString()}\n`;
          }
        }

        response += `\n💡 **Analysis**: This combines information from your uploaded documents with current real-time data from Revere's systems.`;

      // CASE 2: User asks about documents with specific matches found
      } else if (hasSpecificMatches) {
        responseType = 'document';
        response = `📄 **Analysis Based on Your Documents:**\n\n`;

        // Provide context-aware responses
        if (lowerMessage.includes('summarize') || lowerMessage.includes('summary')) {
          response += `**📋 Document Summary:**\n\n`;
          documentResults.forEach((result, index) => {
            response += `**From ${result.docName}:**\n${result.chunk}\n\n`;
            documentSources.push(result.docName);
          });
          response += `**Key insights**: This summary is based on the most relevant sections from your ${uploadedDocuments.length} uploaded document(s).`;

        } else if (lowerMessage.includes('what') || lowerMessage.includes('explain') || lowerMessage.includes('about')) {
          response += `**🔍 Relevant Information:**\n\n`;
          documentResults.forEach((result, index) => {
            response += `**${result.docName}** (Relevance Score: ${result.score}):\n`;
            response += `${result.chunk}\n\n`;
            if (index < documentResults.length - 1) response += `---\n\n`;
            documentSources.push(result.docName);
          });
          response += `💡 **Answer**: Based on the content above, I found ${documentResults.length} relevant section(s) that address your question.`;

        } else if (lowerMessage.includes('find') || lowerMessage.includes('search') || lowerMessage.includes('contains')) {
          response += `**🎯 Search Results:**\n\n`;
          documentResults.forEach((result, index) => {
            response += `**📄 ${result.docName}** - Match ${index + 1}:\n`;
            response += `${result.chunk}\n\n`;
            documentSources.push(result.docName);
          });
          response += `🔍 **Found**: ${documentResults.length} matching section(s) across your documents.`;

        } else {
          // General document query with matches
          response += `**📖 Document Content:**\n\n`;
          documentResults.forEach((result, index) => {
            response += `**${result.docName}**:\n`;
            response += `${result.chunk}\n\n`;
            if (index < documentResults.length - 1) response += `---\n\n`;
            documentSources.push(result.docName);
          });
          response += `📚 **Context**: This information comes from ${uploadedDocuments.length} uploaded document(s). Ask me specific questions to get more targeted answers!`;
        }

      // CASE 3: No specific matches BUT documents exist - CRITICAL CASE that was missing!
      } else {
        console.log('📄 No specific matches found, but documents exist - providing document overview...');
        responseType = 'document';

        // This is the key fix - when documents exist but no matches, still show document content
        const isGeneralDocumentQuery = lowerMessage.includes('document') || lowerMessage.includes('about') ||
                                      lowerMessage.includes('this') || lowerMessage.includes('what') ||
                                      lowerMessage.includes('tell') || lowerMessage.includes('explain') ||
                                      lowerMessage.includes('summarize') || lowerMessage.includes('content') ||
                                      lowerMessage.includes('file') || userMessage.length < 20; // Short queries likely want overview

        if (isGeneralDocumentQuery || !needsLiveData) {
          // Show document content even without specific matches
          response = `📄 **Your Uploaded Documents:**\n\n`;

          uploadedDocuments.forEach((doc, index) => {
            response += `**📄 ${doc.name}**\n`;
            // Show first few chunks of each document as an overview
            const overviewChunks = doc.chunks.slice(0, 2); // First 2 chunks
            overviewChunks.forEach((chunk, chunkIndex) => {
              const displayChunk = chunk.length > 400 ? chunk.substring(0, 400) + '...' : chunk;
              response += `${displayChunk}\n\n`;
            });

            if (doc.chunks.length > 2) {
              response += `*(${doc.chunks.length - 2} more sections available)*\n\n`;
            }

            documentSources.push(doc.name);
            if (index < uploadedDocuments.length - 1) response += `---\n\n`;
          });

          response += `💡 **Ask me specific questions** about your documents for more targeted answers:\n`;
          response += `• "What does this document say about [topic]?"\n`;
          response += `• "Summarize the key points"\n`;
          response += `• "Find information about [specific term]"`;
        } else if (needsLiveData) {
          // Handle live data even when documents exist but no document matches found
          response = `📡 **Live Revere Data:**\n\n`;

          if (needsWeatherData) {
            apiCalls.push('Visual Crossing Weather API');
            const weatherData = await fetchRealWeatherData();
            if (weatherData) {
              response += `🌤️ **Weather**: ${weatherData.temperature}°F, ${weatherData.condition} (${weatherData.humidity}% humidity)\n\n`;
            }
          }

          if (needsMBTAData) {
            apiCalls.push('MBTA API v3');
            const mbtaData = await fetchRealMBTAData();
            if (mbtaData) {
              response += `🚇 **Transit**: ${mbtaData.predictions} predictions for ${mbtaData.route}\n\n`;
            }
          }

          if (needsCensusData) {
            apiCalls.push('US Census Bureau API');
            const censusData = await fetchRealCensusData();
            if (censusData) {
              response += `📊 **Demographics**: Population ${censusData.population.toLocaleString()}, Median Income $${censusData.medianIncome.toLocaleString()}\n\n`;
            }
          }

          response += `📄 **Note**: You have ${uploadedDocuments.length} document(s) uploaded. Ask me about them too!`;
          responseType = 'data-insight';
        } else {
          // Fallback - show helpful suggestions
          const docList = uploadedDocuments.map(d => `• ${d.name}`).join('\n');
          response = `🤖 **I'm ready to help!** I can analyze your uploaded documents and provide live Revere data.\n\n📄 **Your Documents (${uploadedDocuments.length}):**\n${docList}\n\n🎯 **Try these questions:**\n• "What is my document about?"\n• "Summarize the key points"\n• "Find information about [specific topic]"\n• "Compare this with current weather"\n• "What's the current weather in Revere?"\n• "Show population data"\n\n💡 **Tip**: Ask specific questions about your documents for better results!`;
        }
      }

    // CASE 4: No documents uploaded - handle live data or general help
    } else if (needsLiveData) {
      responseType = 'data-insight';
      response = `📡 **Live Revere Data:**\n\n`;

      if (needsWeatherData) {
        apiCalls.push('Visual Crossing Weather API');
        const weatherData = await fetchRealWeatherData();
        if (weatherData) {
          response += `🌤️ **REAL Weather Data for Revere:**\n\n• **Temperature**: ${weatherData.temperature}°F\n• **Humidity**: ${weatherData.humidity}%\n• **Conditions**: ${weatherData.condition}\n• **Data Source**: ${weatherData.source}\n• **Updated**: Just now\n\nThis is live weather data fetched from external APIs, not mock data!\n\n`;
        }
      }

      if (needsMBTAData) {
        apiCalls.push('MBTA API v3');
        const mbtaData = await fetchRealMBTAData();
        if (mbtaData) {
          response += `🚇 **REAL MBTA Data:**\n\n• Active Predictions: ${mbtaData.predictions} for ${mbtaData.route}\n• Revere Stations: Wonderland, Revere Beach, Beachmont, Suffolk Downs\n• Data Source: ${mbtaData.source}\n\nThis is live MBTA data, not mock data!\n\n`;
        }
      }

      if (needsCensusData) {
        apiCalls.push('US Census Bureau API');
        const censusData = await fetchRealCensusData();
        if (censusData) {
          response += `📊 **REAL Census Data for Revere:**\n\n• Population: ${censusData.population.toLocaleString()} residents\n• Median Household Income: $${censusData.medianIncome.toLocaleString()}\n• Data Source: ${censusData.source}\n\nThis is real census data from 2022 ACS, not mock data!\n\n`;
        }
      }

    // CASE 5: No documents, no specific live data - general help
    } else {
      response = `🌟 **Welcome to Revere's AI Assistant!**\n\nI can provide real-time data about Revere, MA:\n\n📊 **Available Live Data:**\n• Weather conditions (Visual Crossing API)\n• MBTA transit info (Blue Line)\n• Demographics & census data\n• Municipal information\n\n📤 **Upload Documents:**\nUpload PDF, Word, or text files to ask questions that combine your content with live city data!\n\n🎯 **Examples:**\n• "What's the weather?"\n• "Show MBTA Blue Line info"\n• "What's Revere's population?"\n\n**After uploading documents:**\n• "Compare my document with current weather"\n• "Summarize my document with today's data"`;
    }

    return {
      content: response,
      metadata: {
        dataSource: responseType === 'hybrid' ? 'Hybrid (Documents + Live APIs)' :
                   responseType === 'document' ? 'Uploaded Documents' : 'Live APIs',
        apiCalls,
        processingTime: Date.now() - startTime,
        documentSources: documentSources.length > 0 ? [...new Set(documentSources)] : undefined,
        hasDocuments: hasDocumentResults
      }
    };
  };

  const handleSendMessage = async (messageOverride?: string) => {
    const messageText = messageOverride || currentMessage;
    console.log('🚀 handleSendMessage called with:', messageText, 'isLoading:', isLoading);

    if (!messageText.trim()) {
      console.log('❌ Message is empty, returning');
      return;
    }

    if (isLoading) {
      console.log('❌ Already loading, returning');
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
    setIsTyping(true);
    console.log('✅ Message sent, loading started');

    // Simulate typing delay for better UX
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      const { content, metadata } = await generateHybridResponse(messageText);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content,
        role: 'assistant',
        timestamp: new Date(),
        type: metadata.hasDocuments ? (metadata.apiCalls && metadata.apiCalls.length > 0 ? 'hybrid' : 'document') : 'data-insight',
        metadata
      };

      setMessages(prev => [...prev, aiMessage]);

      // Auto-speak if enabled and not already speaking
      if (autoSpeak && !isSpeaking) {
        setTimeout(() => speakMessage(content), 500);
      }

      // Show success toast with API info
      toast({
        title: "✅ Real data fetched!",
        description: `APIs called: ${metadata.apiCalls.length || 0} | Time: ${metadata.processingTime}ms`,
      });

    } catch (error) {
      console.error('Error generating response:', error);

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `❌ I encountered an error while fetching real data. This might be due to API rate limits or network issues. Please try again in a moment.

**Error details**: ${error instanceof Error ? error.message : 'Unknown error'}`,
        role: 'assistant',
        timestamp: new Date(),
        type: 'text',
        metadata: {
          dataSource: 'Error',
          apiCalls: [],
          processingTime: 0
        }
      };

      setMessages(prev => [...prev, errorMessage]);

      toast({
        title: "❌ API Error",
        description: "Failed to fetch real data. Please try again.",
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
        className={`fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary shadow-lg hover:shadow-xl transition-all duration-300 ${className} ${isOpen ? 'hidden' : ''}`}
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 h-[500px] bg-card rounded-lg shadow-2xl border flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-primary text-primary-foreground rounded-t-lg">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <span className="font-semibold">Real Data AI</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {message.role === 'assistant' && (
                    <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex flex-col gap-2 max-w-[280px]">
                    <div className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground ml-12'
                        : 'bg-muted'
                    }`}>
                      {message.content}
                    </div>

                    {/* Message metadata and controls */}
                    {message.role === 'assistant' && message.metadata && (
                      <div className="flex flex-wrap gap-1 text-xs">
                        {message.metadata.dataSource && (
                          <Badge variant="secondary" className="text-xs py-0 px-2">
                            📊 {message.metadata.dataSource}
                          </Badge>
                        )}
                        {message.metadata.apiCalls && message.metadata.apiCalls.length > 0 && (
                          <Badge variant="outline" className="text-xs py-0 px-2">
                            🔗 {message.metadata.apiCalls.length} API{message.metadata.apiCalls.length !== 1 ? 's' : ''}
                          </Badge>
                        )}
                        {message.metadata.processingTime && (
                          <Badge variant="outline" className="text-xs py-0 px-2">
                            ⚡ {message.metadata.processingTime}ms
                          </Badge>
                        )}
                        {message.type === 'voice' && (
                          <Badge variant="secondary" className="text-xs py-0 px-2 bg-blue-500/10 text-blue-600">
                            🎤 Voice
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Voice controls for assistant messages */}
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
                            title: "✅ Helpful response!",
                            description: "Thanks for the feedback!"
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

              {/* Real-time streaming text as you speak */}
              {streamingText && (
                <div className="flex gap-3 justify-end">
                  <div className="flex flex-col gap-2 max-w-[280px]">
                    <div className="rounded-lg px-3 py-2 text-sm bg-blue-500/20 text-blue-700 border-2 border-blue-300 animate-pulse ml-12">
                      {streamingText}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-blue-600">
                      <Progress value={voiceConfidence * 100} className="h-1 flex-1" />
                      <span>{Math.round(voiceConfidence * 100)}% confidence</span>
                    </div>
                  </div>
                  <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                    <AvatarFallback className="bg-blue-500 text-white">
                      <Mic className="h-4 w-4 animate-pulse" />
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}

              {/* Enhanced typing indicator */}
              {(isLoading || isTyping) && (
                <div className="flex gap-3 justify-start">
                  <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs animate-pulse">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-lg px-3 py-2 max-w-[280px] text-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                      </div>
                      <span className="text-muted-foreground">Fetching real data...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Document Management Section */}
          <div className="px-4 py-3 border-t bg-muted/20">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <File className="h-4 w-4" />
                Documents ({uploadedDocuments.length})
                {isUploadingDoc && <RefreshCw className="h-3 w-3 animate-spin" />}
              </h3>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingDoc}
                  className="h-7 px-3 text-xs"
                >
                  <Upload className="h-3 w-3 mr-1" />
                  Upload
                </Button>
                {uploadedDocuments.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setUploadedDocuments([]);
                      toast({ title: "🗑️ All documents removed" });
                    }}
                    className="h-7 px-2 text-xs"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            {uploadedDocuments.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded">
                No documents uploaded yet
              </div>
            ) : (
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {uploadedDocuments.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-2 bg-muted/50 rounded text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      {doc.type.startsWith('audio/') ? <FileAudio className="h-3 w-3 text-blue-500 flex-shrink-0" /> :
                       doc.type.includes('image') ? <Image className="h-3 w-3 text-green-500 flex-shrink-0" /> :
                       <FileText className="h-3 w-3 text-purple-500 flex-shrink-0" />}
                      <div className="min-w-0">
                        <p className="font-medium truncate">{doc.name}</p>
                        <p className="text-muted-foreground">
                          {(doc.size / 1024).toFixed(1)} KB • {doc.chunks.length} chunks
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDocument(doc.id)}
                      className="h-6 w-6 p-0 flex-shrink-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

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

                <Badge variant="secondary" className="text-xs">
                  {messages.length - 1} messages
                </Badge>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="h-7 px-2"
                >
                  {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setMessages([messages[0]]); // Keep welcome message
                    toast({ title: "🗑️ Chat cleared", description: "Conversation history removed" });
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
            <div className="flex gap-1 mb-3">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={() => {
                  handleSendMessage("What's the weather?");
                }}
                disabled={isLoading}
              >
                🌤️ Weather
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={() => {
                  handleSendMessage("Show population data");
                }}
                disabled={isLoading}
              >
                📊 Demographics
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={() => {
                  handleSendMessage("MBTA Blue Line info");
                }}
                disabled={isLoading}
              >
                🚇 MBTA
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={() => {
                  if (uploadedDocuments.length > 0) {
                    handleSendMessage("Summarize my documents with current weather");
                  } else {
                    toast({
                      title: "📄 No documents uploaded",
                      description: "Please upload a document first to use this feature"
                    });
                  }
                }}
                disabled={isLoading}
              >
                📄 {uploadedDocuments.length > 0 ? 'Hybrid' : 'Upload'}
              </Button>
            </div>

            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  placeholder={isListening ? "🎤 Listening..." : (uploadedDocuments.length > 0 ? "Ask about documents + live data..." : "Ask about real data or upload documents...")}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading || isListening}
                  className={`flex-1 pr-16 ${
                    isListening ? 'border-blue-500 bg-blue-50/50' : ''
                  }`}
                />

                {/* Upload and Voice buttons */}
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading || isUploadingDoc}
                  >
                    {isUploadingDoc ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Paperclip className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-8 w-8 p-0 ${
                      isListening ? 'text-blue-600 bg-blue-100' : ''
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
                className="relative"
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
                  <div className="flex items-center gap-2 text-blue-600">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                    <span>Recording</span>
                    <div className="flex items-center gap-1">
                      <Progress value={voiceVolume} className="h-1 w-12" />
                      <span className="text-xs">{Math.round(voiceVolume)}%</span>
                    </div>
                  </div>
                )}
                {isSpeaking && (
                  <div className="flex items-center gap-1 text-green-600">
                    <Volume2 className="h-3 w-3" />
                    <span>Speaking response</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-500' :
                  connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                  'bg-red-500'
                }`}></div>
                <span>{connectionStatus === 'connected' ? 'RAG Online' :
                       connectionStatus === 'connecting' ? 'Connecting...' :
                       'RAG Offline'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,.md,.doc,.docx,.csv,.mp3,.wav,.m4a,.ogg,.webm,.jpg,.jpeg,.png,.gif,.webp"
        onChange={handleFileUpload}
        className="hidden"
      />
    </>
  );
};

export default RealDataChatBot;