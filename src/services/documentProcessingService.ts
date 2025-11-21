import { supabase } from '@/integrations/supabase/client';

export interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    fileName: string;
    fileType: string;
    chunkIndex: number;
    pageNumber?: number;
    timestamp: string;
  };
  embeddings?: number[];
}

export interface ProcessedDocument {
  id: string;
  fileName: string;
  fileType: string;
  totalChunks: number;
  uploadedAt: string;
  chunks: DocumentChunk[];
}

class DocumentProcessingService {
  private documents: Map<string, ProcessedDocument> = new Map();

  // Supported file types
  private supportedTypes = [
    'application/pdf',
    'text/plain',
    'text/markdown',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/csv'
  ];

  // Process uploaded file
  async processDocument(file: File): Promise<ProcessedDocument> {
    if (!this.supportedTypes.includes(file.type)) {
      throw new Error(`Unsupported file type: ${file.type}`);
    }

    const documentId = this.generateDocumentId(file.name);
    let content = '';

    try {
      // Extract content based on file type
      switch (file.type) {
        case 'application/pdf':
          content = await this.extractPDFContent(file);
          break;
        case 'text/plain':
        case 'text/markdown':
        case 'text/csv':
          content = await this.extractTextContent(file);
          break;
        case 'application/msword':
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          content = await this.extractDocxContent(file);
          break;
        default:
          content = await this.extractTextContent(file);
      }

      // Chunk the content
      const chunks = this.chunkContent(content, file.name, file.type);

      // Create processed document
      const processedDoc: ProcessedDocument = {
        id: documentId,
        fileName: file.name,
        fileType: file.type,
        totalChunks: chunks.length,
        uploadedAt: new Date().toISOString(),
        chunks
      };

      // Store in memory and database
      this.documents.set(documentId, processedDoc);
      await this.saveToDatabase(processedDoc);

      return processedDoc;
    } catch (error) {
      console.error('Error processing document:', error);
      throw new Error(`Failed to process document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Extract content from PDF (simplified - in production use PDF.js or similar)
  private async extractPDFContent(file: File): Promise<string> {
    // For demo purposes, we'll use a simple text extraction
    // In production, you'd use a library like PDF.js
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        // This is a simplified extraction - real PDF extraction would be more complex
        const text = `[PDF Content from ${file.name}]\n\nThis is extracted content from the PDF document. In a production environment, this would use PDF.js or a similar library to extract actual text content from the PDF file.\n\nFor demonstration purposes, you can ask questions about this document and the AI will respond based on this placeholder content.`;
        resolve(text);
      };
      reader.readAsArrayBuffer(file);
    });
  }

  // Extract content from text files
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

  // Extract content from Word documents (simplified)
  private async extractDocxContent(file: File): Promise<string> {
    // For demo purposes - in production use mammoth.js or similar
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const text = `[Word Document Content from ${file.name}]\n\nThis is extracted content from the Word document. In a production environment, this would use mammoth.js or a similar library to extract actual text content from DOCX files.\n\nYou can ask questions about this document content and the AI will provide answers based on this extracted text.`;
        resolve(text);
      };
      reader.readAsArrayBuffer(file);
    });
  }

  // Chunk content into smaller pieces for better RAG performance
  private chunkContent(content: string, fileName: string, fileType: string): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const chunkSize = 1000; // characters per chunk
    const overlap = 200; // character overlap between chunks

    let start = 0;
    let chunkIndex = 0;

    while (start < content.length) {
      const end = Math.min(start + chunkSize, content.length);
      const chunkContent = content.slice(start, end);

      // Try to break at sentence boundaries
      let actualEnd = end;
      if (end < content.length) {
        const lastSentence = chunkContent.lastIndexOf('. ');
        const lastNewline = chunkContent.lastIndexOf('\n');
        const breakPoint = Math.max(lastSentence, lastNewline);

        if (breakPoint > start + chunkSize * 0.5) { // Don't make chunks too small
          actualEnd = start + breakPoint + 1;
        }
      }

      const chunk: DocumentChunk = {
        id: `${fileName}_chunk_${chunkIndex}`,
        content: content.slice(start, actualEnd).trim(),
        metadata: {
          fileName,
          fileType,
          chunkIndex,
          timestamp: new Date().toISOString()
        }
      };

      chunks.push(chunk);
      start = actualEnd - overlap;
      chunkIndex++;
    }

    return chunks;
  }

  // Generate embeddings for better semantic search (simplified)
  private generateSimpleEmbeddings(text: string): number[] {
    // This is a very simplified embedding generation
    // In production, you'd use OpenAI embeddings or similar
    const words = text.toLowerCase().split(/\s+/);
    const embedding = new Array(100).fill(0);

    // Simple hash-based embedding
    words.forEach((word, index) => {
      const hash = this.simpleHash(word) % 100;
      embedding[hash] += 1 / (index + 1);
    });

    return embedding;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Search for relevant chunks based on query
  searchDocuments(query: string, topK: number = 5): DocumentChunk[] {
    const allChunks: DocumentChunk[] = [];

    // Collect all chunks from all documents
    for (const doc of this.documents.values()) {
      allChunks.push(...doc.chunks);
    }

    // Score chunks based on keyword matching (simplified)
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/);

    const scoredChunks = allChunks.map(chunk => {
      let score = 0;
      const chunkLower = chunk.content.toLowerCase();

      // Exact query match
      if (chunkLower.includes(queryLower)) {
        score += 10;
      }

      // Individual word matches
      queryWords.forEach(word => {
        const wordCount = (chunkLower.match(new RegExp(word, 'g')) || []).length;
        score += wordCount * 2;
      });

      // Partial word matches
      queryWords.forEach(word => {
        if (word.length > 3) { // Only for longer words
          const partialMatches = chunkLower.split(' ').filter(chunkWord =>
            chunkWord.includes(word) || word.includes(chunkWord)
          ).length;
          score += partialMatches * 0.5;
        }
      });

      return { ...chunk, score };
    });

    // Return top K results
    return scoredChunks
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .filter(chunk => chunk.score > 0);
  }

  // Generate answer based on document content
  generateDocumentAnswer(query: string, relevantChunks: DocumentChunk[]): string {
    if (relevantChunks.length === 0) {
      return "I couldn't find relevant information in the uploaded documents to answer your question. Please try rephrasing your question or upload a document that contains the information you're looking for.";
    }

    // Build context from relevant chunks
    const context = relevantChunks.map((chunk, index) =>
      `[Document: ${chunk.metadata.fileName}, Chunk ${chunk.metadata.chunkIndex}]\n${chunk.content}`
    ).join('\n\n---\n\n');

    // Generate answer based on context
    const answer = `Based on the uploaded documents, here's what I found:

${this.extractRelevantInfo(query, relevantChunks)}

**Sources:**
${relevantChunks.map(chunk =>
  `• ${chunk.metadata.fileName} (chunk ${chunk.metadata.chunkIndex})`
).join('\n')}

**Context used:**
${context.substring(0, 500)}${context.length > 500 ? '...' : ''}`;

    return answer;
  }

  private extractRelevantInfo(query: string, chunks: DocumentChunk[]): string {
    // Simple extraction logic - in production, you'd use an LLM
    const queryLower = query.toLowerCase();

    // Look for direct answers in the chunks
    for (const chunk of chunks) {
      const sentences = chunk.content.split(/[.!?]+/);

      for (const sentence of sentences) {
        if (sentence.toLowerCase().includes(queryLower.split(' ')[0])) {
          return sentence.trim();
        }
      }
    }

    // Return first chunk as fallback
    return chunks[0].content.substring(0, 300) + '...';
  }

  // Save processed document to database
  private async saveToDatabase(doc: ProcessedDocument): Promise<void> {
    try {
      const { error } = await supabase
        .from('processed_documents')
        .insert({
          id: doc.id,
          file_name: doc.fileName,
          file_type: doc.fileType,
          total_chunks: doc.totalChunks,
          uploaded_at: doc.uploadedAt,
          chunks: doc.chunks
        });

      if (error) {
        console.error('Error saving document to database:', error);
      }
    } catch (error) {
      console.error('Database save failed:', error);
    }
  }

  // Get all processed documents
  getDocuments(): ProcessedDocument[] {
    return Array.from(this.documents.values());
  }

  // Remove document
  removeDocument(documentId: string): boolean {
    return this.documents.delete(documentId);
  }

  private generateDocumentId(fileName: string): string {
    return `doc_${Date.now()}_${fileName.replace(/[^a-zA-Z0-9]/g, '_')}`;
  }

  // Get document by ID
  getDocument(documentId: string): ProcessedDocument | undefined {
    return this.documents.get(documentId);
  }
}

export const documentProcessingService = new DocumentProcessingService();