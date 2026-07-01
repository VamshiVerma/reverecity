import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/integrations/supabase/client';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyDjm7WuesLoSLJlZ3wEU9Vmm-wKBq7GUkg';

export class BudgetVectorService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  }

  /**
   * Search budget chunks using semantic similarity
   */
  async searchBudgetChunks(query: string, matchCount: number = 10, matchThreshold: number = 0.2): Promise<any[]> {
    try {
      // Generate embedding for the query
      const model = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
      const result = await model.embedContent(query);
      const queryEmbedding = Array.from(result.embedding.values);

      console.log('🔍 Budget vector search for:', query);
      console.log('📊 Embedding length:', queryEmbedding.length);

      // Search for similar chunks using RPC function
      const { data, error } = await supabase.rpc('match_budget_chunks', {
        query_embedding: queryEmbedding,
        match_threshold: matchThreshold,
        match_count: matchCount,
      });

      console.log('✅ Vector search results:', data?.length || 0, 'chunks found');

      if (error) {
        console.error('Vector search error:', error);
        return [];
      }

      // Log what we found
      if (data && data.length > 0) {
        console.log('📄 Top results:');
        data.slice(0, 3).forEach((chunk: any, i: number) => {
          console.log(`  [${i+1}] ${(chunk.similarity * 100).toFixed(1)}%: ${chunk.content.substring(0, 100)}...`);
        });
      }

      return data || [];
    } catch (error) {
      console.error('Budget vector search failed:', error);
      return [];
    }
  }

  /**
   * Build context string from search results
   */
  buildBudgetContext(searchResults: any[]): string {
    if (!searchResults || searchResults.length === 0) {
      return '';
    }

    let context = '\n\n💰 **BUDGET INFORMATION (FY2025)**:\n\n';

    searchResults.forEach((result, idx) => {
      context += `[Relevance: ${(result.similarity * 100).toFixed(1)}%]\n`;
      context += `${result.content}\n\n`;

      if (idx < searchResults.length - 1) {
        context += '---\n\n';
      }
    });

    return context;
  }

  /**
   * Answer budget question with RAG
   */
  async answerBudgetQuestion(question: string): Promise<{ context: string; chunks: any[] }> {
    const chunks = await this.searchBudgetChunks(question, 5, 0.3);
    const context = this.buildBudgetContext(chunks);

    return { context, chunks };
  }
}

export const budgetVectorService = new BudgetVectorService();
