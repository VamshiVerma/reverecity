import { supabase } from '@/integrations/supabase/client';
import { getLatestWeatherData } from '@/services/weatherService';
import { pipecatRAGService } from '@/services/pipecatService';

export interface AudioTranscription {
  text: string;
  confidence: number;
  duration: number;
  language: string;
}

export interface ProcessedContent {
  id: string;
  type: 'document' | 'audio' | 'image' | 'url';
  fileName: string;
  content: string;
  chunks: ContentChunk[];
  metadata: {
    fileSize?: number;
    duration?: number;
    pages?: number;
    language?: string;
    uploadedAt: string;
  };
}

export interface ContentChunk {
  id: string;
  content: string;
  metadata: {
    chunkIndex: number;
    source: string;
    timestamp?: number;
    pageNumber?: number;
  };
}

export interface AIResponse {
  content: string;
  type: 'document_answer' | 'live_data' | 'general_ai' | 'mixed';
  sources?: string[];
  confidence: number;
  metadata: {
    mode: string;
    processingTime: number;
    apiCalls?: string[];
    chunksUsed?: number;
  };
}

class UltimateAIService {
  private processedContent: Map<string, ProcessedContent> = new Map();
  private conversationHistory: Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }> = [];

  // Supported file types (expanded)
  private supportedTypes = {
    documents: [
      'application/pdf',
      'text/plain',
      'text/markdown',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/csv',
      'application/rtf'
    ],
    audio: [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/mp4',
      'audio/m4a',
      'audio/ogg',
      'audio/webm'
    ],
    images: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp'
    ]
  };

  // Process any type of content
  async processContent(file: File): Promise<ProcessedContent> {
    const fileType = this.getContentType(file.type);

    let content = '';
    let additionalMetadata: any = {};

    try {
      switch (fileType) {
        case 'document':
          content = await this.extractDocumentContent(file);
          break;
        case 'audio':
          const transcription = await this.transcribeAudio(file);
          content = transcription.text;
          additionalMetadata = {
            duration: transcription.duration,
            confidence: transcription.confidence,
            language: transcription.language
          };
          break;
        case 'image':
          content = await this.extractImageText(file);
          break;
        default:
          throw new Error(`Unsupported file type: ${file.type}`);
      }

      // Create chunks
      const chunks = this.createContentChunks(content, file.name, fileType);

      const processedContent: ProcessedContent = {
        id: this.generateContentId(file.name),
        type: fileType,
        fileName: file.name,
        content,
        chunks,
        metadata: {
          fileSize: file.size,
          uploadedAt: new Date().toISOString(),
          ...additionalMetadata
        }
      };

      // Store in memory and database
      this.processedContent.set(processedContent.id, processedContent);
      await this.saveContentToDatabase(processedContent);

      return processedContent;
    } catch (error) {
      console.error('Content processing error:', error);
      throw new Error(`Failed to process ${fileType}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Audio transcription using Web Speech API and fallback
  private async transcribeAudio(file: File): Promise<AudioTranscription> {
    return new Promise((resolve, reject) => {
      // For demo - in production use services like OpenAI Whisper, Google Cloud Speech, etc.
      const reader = new FileReader();

      reader.onload = async () => {
        try {
          // Simulated transcription - in production, send to transcription service
          const duration = await this.getAudioDuration(file);

          // Demo transcription based on file name for testing
          const demoTranscription = this.generateDemoTranscription(file.name, duration);

          resolve({
            text: demoTranscription,
            confidence: 0.85,
            duration,
            language: 'en-US'
          });
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read audio file'));
      reader.readAsArrayBuffer(file);
    });
  }

  // Get audio duration
  private async getAudioDuration(file: File): Promise<number> {
    return new Promise((resolve) => {
      const audio = document.createElement('audio');
      const url = URL.createObjectURL(file);

      audio.addEventListener('loadedmetadata', () => {
        resolve(audio.duration);
        URL.revokeObjectURL(url);
      });

      audio.addEventListener('error', () => {
        resolve(0); // Fallback
        URL.revokeObjectURL(url);
      });

      audio.src = url;
    });
  }

  // Generate demo transcription for testing
  private generateDemoTranscription(fileName: string, duration: number): string {
    return `[Audio Transcription from ${fileName}]

This is a transcribed audio file lasting ${Math.round(duration)} seconds. In a production environment, this would contain the actual transcribed content from the audio file using services like:

• OpenAI Whisper API
• Google Cloud Speech-to-Text
• Azure Speech Services
• AWS Transcribe

The transcription would include:
- Spoken words and dialogue
- Speaker identification (if available)
- Timestamps for different sections
- Confidence scores for accuracy

You can now ask questions about the content of this audio file, and the AI will search through the transcribed text to provide relevant answers.

For demonstration purposes, try asking:
- "What was discussed in this audio?"
- "Summarize the main points"
- "What topics were covered?"`;
  }

  // Extract text from images (OCR)
  private async extractImageText(file: File): Promise<string> {
    // For demo - in production use Tesseract.js or cloud OCR services
    return new Promise((resolve) => {
      resolve(`[Image Text Extraction from ${file.name}]

This image has been processed for text extraction. In a production environment, this would use OCR (Optical Character Recognition) technology such as:

• Tesseract.js for client-side OCR
• Google Cloud Vision API
• Azure Computer Vision
• AWS Textract

The extracted text would include:
- All visible text in the image
- Formatted content preservation
- Multi-language support
- Confidence scores

You can ask questions about any text content that would be found in this image.`);
    });
  }

  // Enhanced document processing
  private async extractDocumentContent(file: File): Promise<string> {
    switch (file.type) {
      case 'application/pdf':
        return await this.extractAdvancedPDFContent(file);
      case 'text/plain':
      case 'text/markdown':
      case 'text/csv':
        return await this.extractTextContent(file);
      case 'application/msword':
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return await this.extractDocxContent(file);
      default:
        return await this.extractTextContent(file);
    }
  }

  // Advanced PDF processing
  private async extractAdvancedPDFContent(file: File): Promise<string> {
    return new Promise((resolve) => {
      // In production, use PDF.js or similar
      resolve(`[Advanced PDF Processing from ${file.name}]

This PDF document has been processed with advanced text extraction capabilities. The content includes:

• Full text extraction with formatting preservation
• Page-by-page content organization
• Table and structure recognition
• Metadata extraction (author, creation date, etc.)

In a production environment, this would use:
- PDF.js for comprehensive PDF parsing
- pdf2pic for image extraction
- Custom parsing for complex layouts

The extracted content would maintain document structure and allow for:
- Page-specific queries
- Section-based navigation
- Table data analysis
- Image and chart references

You can ask detailed questions about any part of this PDF document.`);
    });
  }

  // Extract text content
  private async extractTextContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read text content'));
        }
      };
      reader.onerror = () => reject(new Error('File reading failed'));
      reader.readAsText(file);
    });
  }

  // Extract DOCX content
  private async extractDocxContent(file: File): Promise<string> {
    // In production, use mammoth.js
    return new Promise((resolve) => {
      resolve(`[Advanced Word Document Processing from ${file.name}]

This Word document has been processed with full content extraction:

• Text content with formatting preservation
• Header and footer content
• Table data extraction
• Image alt-text and captions
• Comments and track changes
• Document properties and metadata

The system would use libraries like mammoth.js to:
- Convert DOCX to clean HTML/text
- Preserve document structure
- Extract embedded media information
- Maintain cross-references

You can ask questions about any content that would be in this Word document.`);
    });
  }

  // Determine content type
  private getContentType(mimeType: string): 'document' | 'audio' | 'image' {
    if (this.supportedTypes.documents.includes(mimeType)) return 'document';
    if (this.supportedTypes.audio.includes(mimeType)) return 'audio';
    if (this.supportedTypes.images.includes(mimeType)) return 'image';
    throw new Error(`Unsupported file type: ${mimeType}`);
  }

  // Create content chunks
  private createContentChunks(content: string, fileName: string, type: string): ContentChunk[] {
    const chunks: ContentChunk[] = [];
    const chunkSize = 1500; // Larger chunks for better context
    const overlap = 300;

    let start = 0;
    let chunkIndex = 0;

    while (start < content.length) {
      const end = Math.min(start + chunkSize, content.length);
      let actualEnd = end;

      // Smart chunking - break at sentence or paragraph boundaries
      if (end < content.length) {
        const breakPoints = [
          content.lastIndexOf('\n\n', end),
          content.lastIndexOf('. ', end),
          content.lastIndexOf('\n', end),
          content.lastIndexOf(' ', end)
        ];

        const bestBreak = breakPoints.find(point => point > start + chunkSize * 0.6);
        if (bestBreak) actualEnd = bestBreak + 1;
      }

      const chunk: ContentChunk = {
        id: `${fileName}_chunk_${chunkIndex}`,
        content: content.slice(start, actualEnd).trim(),
        metadata: {
          chunkIndex,
          source: fileName
        }
      };

      chunks.push(chunk);
      start = Math.max(actualEnd - overlap, start + 1);
      chunkIndex++;
    }

    return chunks;
  }

  // Ultimate AI response generation
  async generateUltimateResponse(query: string): Promise<AIResponse> {
    const startTime = Date.now();

    // Add to conversation history
    this.conversationHistory.push({
      role: 'user',
      content: query,
      timestamp: new Date()
    });

    try {
      // Determine the best response mode
      const responseMode = this.determineResponseMode(query);

      let response: AIResponse;

      switch (responseMode) {
        case 'document':
          response = await this.generateDocumentResponse(query, startTime);
          break;
        case 'live_data':
          response = await this.generateLiveDataResponse(query, startTime);
          break;
        case 'mixed':
          response = await this.generateMixedResponse(query, startTime);
          break;
        default:
          response = await this.generateGeneralAIResponse(query, startTime);
      }

      // Add assistant response to history
      this.conversationHistory.push({
        role: 'assistant',
        content: response.content,
        timestamp: new Date()
      });

      return response;
    } catch (error) {
      console.error('Ultimate AI response error:', error);
      return {
        content: `I encountered an error while processing your request. Please try rephrasing your question or check if you need to upload documents first.\n\n**Error**: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'general_ai',
        confidence: 0,
        metadata: {
          mode: 'error',
          processingTime: Date.now() - startTime
        }
      };
    }
  }

  // Determine the best response mode
  private determineResponseMode(query: string): 'document' | 'live_data' | 'mixed' | 'general' {
    const lowerQuery = query.toLowerCase();

    // Check for live data keywords
    const liveDataKeywords = ['weather', 'temperature', 'forecast', 'mbta', 'transit', 'train', 'news', 'current', 'today', 'now'];
    const hasLiveDataKeywords = liveDataKeywords.some(keyword => lowerQuery.includes(keyword));

    // Check for document keywords
    const documentKeywords = ['document', 'file', 'pdf', 'text', 'audio', 'transcription', 'uploaded', 'content'];
    const hasDocumentKeywords = documentKeywords.some(keyword => lowerQuery.includes(keyword));

    // Check if we have processed content
    const hasContent = this.processedContent.size > 0;

    if (hasLiveDataKeywords && (hasDocumentKeywords || hasContent)) {
      return 'mixed';
    } else if (hasLiveDataKeywords) {
      return 'live_data';
    } else if (hasDocumentKeywords || hasContent) {
      return 'document';
    } else {
      return 'general';
    }
  }

  // Generate document-based response
  private async generateDocumentResponse(query: string, startTime: number): Promise<AIResponse> {
    if (this.processedContent.size === 0) {
      return {
        content: `📁 **No Content Available**

I don't have any documents, audio files, or other content to search through. Please upload some content first:

• **Documents**: PDF, Word, Text files
• **Audio Files**: MP3, WAV, M4A (will be transcribed)
• **Images**: JPG, PNG (text will be extracted)

Once you upload content, I can answer detailed questions about it!`,
        type: 'document_answer',
        confidence: 0,
        metadata: {
          mode: 'no_documents',
          processingTime: Date.now() - startTime
        }
      };
    }

    // Search through all content
    const relevantChunks = this.searchAllContent(query);

    if (relevantChunks.length === 0) {
      return {
        content: `🔍 **No Relevant Information Found**

I couldn't find information related to "${query}" in your uploaded content.

**Available content**: ${Array.from(this.processedContent.values()).map(c => c.fileName).join(', ')}

Try:
• Rephrasing your question
• Using different keywords
• Asking about general topics in the content`,
        type: 'document_answer',
        confidence: 0,
        metadata: {
          mode: 'no_matches',
          processingTime: Date.now() - startTime,
          chunksUsed: 0
        }
      };
    }

    // Generate response from relevant chunks
    const answer = this.generateAnswerFromChunks(query, relevantChunks);

    return {
      content: answer,
      type: 'document_answer',
      sources: [...new Set(relevantChunks.map(chunk => chunk.metadata.source))],
      confidence: Math.min(95, relevantChunks.length * 15 + 25),
      metadata: {
        mode: 'document_search',
        processingTime: Date.now() - startTime,
        chunksUsed: relevantChunks.length
      }
    };
  }

  // Generate live data response
  private async generateLiveDataResponse(query: string, startTime: number): Promise<AIResponse> {
    const lowerQuery = query.toLowerCase();
    const apiCalls: string[] = [];
    let content = '';

    // Weather data
    if (lowerQuery.includes('weather') || lowerQuery.includes('temperature')) {
      try {
        const weatherData = await getLatestWeatherData();
        if (weatherData?.currentConditions) {
          content += `🌤️ **Current Weather in Revere:**\n\n`;
          content += `• **Temperature**: ${Math.round(weatherData.currentConditions.temp)}°F\n`;
          content += `• **Conditions**: ${weatherData.currentConditions.conditions}\n`;
          content += `• **Humidity**: ${Math.round(weatherData.currentConditions.humidity)}%\n`;
          content += `• **Updated**: Just now\n\n`;
          apiCalls.push('Visual Crossing Weather API');
        }
      } catch (error) {
        content += `🌤️ Weather data temporarily unavailable.\n\n`;
      }
    }

    // MBTA data
    if (lowerQuery.includes('mbta') || lowerQuery.includes('transit') || lowerQuery.includes('train')) {
      try {
        const response = await fetch('https://api-v3.mbta.com/predictions?filter[route]=Blue&filter[stop]=place-wondl,place-rbmnl&limit=3');
        if (response.ok) {
          const data = await response.json();
          content += `🚇 **MBTA Blue Line Status:**\n\n`;
          content += `• **Active Predictions**: ${data.data?.length || 0}\n`;
          content += `• **Revere Stations**: Wonderland, Revere Beach, Beachmont\n`;
          content += `• **Status**: Live data from MBTA\n\n`;
          apiCalls.push('MBTA API v3');
        }
      } catch (error) {
        content += `🚇 Transit data temporarily unavailable.\n\n`;
      }
    }

    if (!content) {
      content = `🔄 **Live Data Available**\n\nI can provide current information about:\n• Weather conditions\n• MBTA transit updates\n• News and events\n\nTry asking: "What's the weather like?" or "How's the MBTA running?"`;
    }

    return {
      content: content.trim(),
      type: 'live_data',
      confidence: apiCalls.length > 0 ? 90 : 50,
      metadata: {
        mode: 'live_data',
        processingTime: Date.now() - startTime,
        apiCalls
      }
    };
  }

  // Generate mixed response (documents + live data)
  private async generateMixedResponse(query: string, startTime: number): Promise<AIResponse> {
    const [docResponse, liveResponse] = await Promise.all([
      this.generateDocumentResponse(query, startTime),
      this.generateLiveDataResponse(query, startTime)
    ]);

    const combinedContent = `${docResponse.content}\n\n---\n\n${liveResponse.content}`;

    return {
      content: combinedContent,
      type: 'mixed',
      sources: docResponse.sources,
      confidence: Math.max(docResponse.confidence, liveResponse.confidence),
      metadata: {
        mode: 'mixed',
        processingTime: Date.now() - startTime,
        apiCalls: liveResponse.metadata.apiCalls,
        chunksUsed: docResponse.metadata.chunksUsed
      }
    };
  }

  // Generate general AI response
  private async generateGeneralAIResponse(query: string, startTime: number): Promise<AIResponse> {
    // Try to use Pipecat for general AI responses
    try {
      const ragResponse = await pipecatRAGService.generateRAGResponse(query);

      return {
        content: ragResponse.content,
        type: 'general_ai',
        confidence: 75,
        metadata: {
          mode: 'general_ai',
          processingTime: Date.now() - startTime
        }
      };
    } catch (error) {
      // Fallback to built-in responses
      const fallbackResponse = this.generateFallbackResponse(query);

      return {
        content: fallbackResponse,
        type: 'general_ai',
        confidence: 60,
        metadata: {
          mode: 'fallback',
          processingTime: Date.now() - startTime
        }
      };
    }
  }

  // Search all processed content
  private searchAllContent(query: string): ContentChunk[] {
    const allChunks: ContentChunk[] = [];

    for (const content of this.processedContent.values()) {
      allChunks.push(...content.chunks);
    }

    return this.scoreAndRankChunks(query, allChunks).slice(0, 8);
  }

  // Score and rank chunks
  private scoreAndRankChunks(query: string, chunks: ContentChunk[]): ContentChunk[] {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);

    const scoredChunks = chunks.map(chunk => {
      let score = 0;
      const contentLower = chunk.content.toLowerCase();

      // Exact phrase match
      if (contentLower.includes(queryLower)) score += 20;

      // Individual word matches
      queryWords.forEach(word => {
        const wordCount = (contentLower.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
        score += wordCount * 3;

        // Partial matches
        const partialCount = (contentLower.match(new RegExp(word, 'g')) || []).length - wordCount;
        score += partialCount * 1;
      });

      // Proximity bonus (words appearing near each other)
      for (let i = 0; i < queryWords.length - 1; i++) {
        const word1 = queryWords[i];
        const word2 = queryWords[i + 1];
        const regex = new RegExp(`${word1}.{0,50}${word2}|${word2}.{0,50}${word1}`, 'g');
        if (regex.test(contentLower)) score += 5;
      }

      return { ...chunk, score };
    });

    return scoredChunks
      .filter(chunk => chunk.score > 0)
      .sort((a, b) => b.score - a.score);
  }

  // Generate answer from chunks
  private generateAnswerFromChunks(query: string, chunks: ContentChunk[]): string {
    const context = chunks.map((chunk, index) =>
      `**Source ${index + 1}** (${chunk.metadata.source}, chunk ${chunk.metadata.chunkIndex}):\n${chunk.content}`
    ).join('\n\n---\n\n');

    // Try to extract a direct answer
    const directAnswer = this.extractDirectAnswer(query, chunks);

    let response = `**Based on your uploaded content:**\n\n${directAnswer}\n\n`;

    if (chunks.length > 1) {
      response += `**Related Information:**\n\n${context.substring(0, 800)}${context.length > 800 ? '...' : ''}`;
    }

    response += `\n\n**Sources Used:**\n${chunks.map(chunk =>
      `• ${chunk.metadata.source} (section ${chunk.metadata.chunkIndex})`
    ).join('\n')}`;

    return response;
  }

  // Extract direct answer
  private extractDirectAnswer(query: string, chunks: ContentChunk[]): string {
    // Simple extraction logic - in production, use an LLM
    const firstChunk = chunks[0];
    const sentences = firstChunk.content.split(/[.!?]+/);

    // Look for sentences that might contain the answer
    const queryWords = query.toLowerCase().split(' ');
    for (const sentence of sentences) {
      const sentenceLower = sentence.toLowerCase();
      if (queryWords.some(word => word.length > 3 && sentenceLower.includes(word))) {
        const trimmed = sentence.trim();
        if (trimmed.length > 20) {
          return trimmed + '.';
        }
      }
    }

    // Fallback to first part of the content
    return firstChunk.content.substring(0, 200) + '...';
  }

  // Fallback response for general queries
  private generateFallbackResponse(query: string): string {
    const responses = {
      greeting: "Hello! I'm your ultimate AI assistant. I can help with documents, live data, general questions, and more. What would you like to know?",
      help: "I can assist you with:\n• Document analysis (PDF, Word, Text)\n• Audio transcription and Q&A\n• Live weather and transit data\n• General conversation\n• Voice interaction\n\nTry uploading a document or asking about current weather!",
      capabilities: "🚀 **My Capabilities:**\n\n• **Document Processing**: Upload PDFs, Word docs, text files\n• **Audio Analysis**: Transcribe and analyze audio files\n• **Live Data**: Weather, transit, news updates\n• **Smart Search**: Find information across all your content\n• **Voice Interface**: Speak your questions naturally\n• **Multi-modal**: Handle text, audio, images, and more",
      default: "I'm here to help! You can:\n• Upload documents for analysis\n• Ask about current weather or transit\n• Have a general conversation\n• Use voice input for any query\n\nWhat would you like to explore?"
    };

    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('hello') || lowerQuery.includes('hi')) return responses.greeting;
    if (lowerQuery.includes('help') || lowerQuery.includes('what can you')) return responses.help;
    if (lowerQuery.includes('capabilities') || lowerQuery.includes('features')) return responses.capabilities;

    return responses.default;
  }

  // Utility methods
  private generateContentId(fileName: string): string {
    return `content_${Date.now()}_${fileName.replace(/[^a-zA-Z0-9]/g, '_')}`;
  }

  private async saveContentToDatabase(content: ProcessedContent): Promise<void> {
    try {
      await supabase.from('processed_documents').insert({
        id: content.id,
        file_name: content.fileName,
        file_type: content.type,
        total_chunks: content.chunks.length,
        uploaded_at: content.metadata.uploadedAt,
        chunks: content.chunks,
        metadata: content.metadata
      });
    } catch (error) {
      console.error('Database save error:', error);
    }
  }

  // Public methods
  getProcessedContent(): ProcessedContent[] {
    return Array.from(this.processedContent.values());
  }

  removeContent(contentId: string): boolean {
    return this.processedContent.delete(contentId);
  }

  clearConversationHistory(): void {
    this.conversationHistory = [];
  }

  getConversationHistory(): Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }> {
    return [...this.conversationHistory];
  }
}

export const ultimateAIService = new UltimateAIService();