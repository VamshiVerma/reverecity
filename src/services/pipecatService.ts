import { RTVIClient, RTVIEvent } from '@pipecat-ai/client-js';
import { supabase } from '@/integrations/supabase/client';

// Knowledge base for RAG
const REVERE_KNOWLEDGE_BASE = [
  {
    id: 'demographics',
    content: 'Revere, Massachusetts has a population of approximately 62,186 residents (2023 estimate). The city is highly diverse with a significant immigrant population. Median household income is around $66,000. The city has a younger demographic with median age of 38 years.',
    embeddings: ['population', 'demographics', 'residents', 'income', 'diversity', 'age'],
    source: 'US Census Bureau',
    lastUpdated: '2023'
  },
  {
    id: 'geography',
    content: 'Revere is located in Suffolk County, directly north of Boston. It covers 10 square miles with 5.9 miles of beachfront along the Atlantic Ocean. Revere Beach was the first public beach in the United States.',
    embeddings: ['location', 'geography', 'beach', 'suffolk', 'boston', 'ocean'],
    source: 'City of Revere',
    lastUpdated: '2024'
  },
  {
    id: 'transportation',
    content: 'Revere is served by the MBTA Blue Line with stations at Wonderland, Revere Beach, Beachmont, and Suffolk Downs. The city has excellent public transit access to Boston. Route 1A and Route 1 provide major highway access.',
    embeddings: ['mbta', 'blue line', 'transit', 'transportation', 'wonderland', 'train'],
    source: 'MBTA',
    lastUpdated: '2024'
  },
  {
    id: 'education',
    content: 'Revere Public Schools serves over 7,800 students across 11 schools. The district includes Revere High School, 3 middle schools, and 7 elementary schools. The graduation rate is approximately 82%.',
    embeddings: ['education', 'schools', 'students', 'revere high', 'graduation'],
    source: 'Revere Public Schools',
    lastUpdated: '2024'
  },
  {
    id: 'economy',
    content: 'Major employers include Massachusetts General Hospital, Market Basket, Amazon distribution center. The city has a growing hospitality sector with hotels near Logan Airport. Retail and restaurant sectors are strong along Broadway and Revere Beach.',
    embeddings: ['economy', 'jobs', 'employment', 'business', 'amazon', 'hospital'],
    source: 'City Economic Development',
    lastUpdated: '2024'
  },
  {
    id: 'housing',
    content: 'Median home value in Revere is approximately $550,000. The city has a mix of single-family homes, condos, and apartments. About 45% of residents are homeowners. Housing costs have increased significantly in recent years.',
    embeddings: ['housing', 'real estate', 'homes', 'property', 'rent', 'value'],
    source: 'Zillow/Redfin Data',
    lastUpdated: '2024'
  },
  {
    id: 'government',
    content: 'Revere has a mayor-council government. The current mayor is Patrick Keefe (elected 2023). The City Council has 11 members. City Hall is located at 281 Broadway.',
    embeddings: ['government', 'mayor', 'council', 'city hall', 'politics'],
    source: 'City of Revere',
    lastUpdated: '2024'
  },
  {
    id: 'recreation',
    content: 'Revere Beach is the main recreation area with events throughout summer. The city has multiple parks including Gibson Park, Costa Park, and Griswold Park. The Revere Beach Boulevard hosts the annual Sand Sculpting Festival.',
    embeddings: ['recreation', 'parks', 'beach', 'events', 'festival', 'entertainment'],
    source: 'Parks & Recreation Dept',
    lastUpdated: '2024'
  }
];

// Vector similarity search (simplified - in production, use proper embeddings)
function findRelevantContext(query: string, topK: number = 3): any[] {
  const queryLower = query.toLowerCase();

  // Score each knowledge item based on keyword matches
  const scored = REVERE_KNOWLEDGE_BASE.map(item => {
    let score = 0;

    // Check for exact matches in content
    if (item.content.toLowerCase().includes(queryLower)) {
      score += 10;
    }

    // Check for embedding matches
    item.embeddings.forEach(embedding => {
      if (queryLower.includes(embedding)) {
        score += 5;
      }
    });

    // Check for partial word matches
    const words = queryLower.split(' ');
    words.forEach(word => {
      if (item.content.toLowerCase().includes(word)) {
        score += 1;
      }
    });

    return { ...item, score };
  });

  // Sort by score and return top K
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .filter(item => item.score > 0);
}

export class PipecatRAGService {
  private client: RTVIClient | null = null;
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    // Use environment variables or default values
    this.apiKey = import.meta.env.VITE_PIPECAT_API_KEY || '';
    this.baseUrl = import.meta.env.VITE_PIPECAT_BASE_URL || 'https://api.pipecat.ai';
  }

  async initialize(): Promise<void> {
    try {
      if (!this.apiKey) {
        console.log('Pipecat API key not found, using fallback mode');
        return;
      }

      this.client = new RTVIClient({
        baseUrl: this.baseUrl,
        enableMic: true,
        enableCam: false,
        timeout: 15000,
      });

      // Set up event listeners
      this.client.on(RTVIEvent.Connected, () => {
        console.log('✅ Pipecat connected');
      });

      this.client.on(RTVIEvent.Disconnected, () => {
        console.log('❌ Pipecat disconnected');
      });

      this.client.on(RTVIEvent.Error, (error) => {
        console.error('Pipecat error:', error);
      });

    } catch (error) {
      console.error('Failed to initialize Pipecat:', error);
    }
  }

  async connect(): Promise<void> {
    if (!this.client) {
      throw new Error('Pipecat client not initialized');
    }

    try {
      await this.client.connect({
        apiKey: this.apiKey,
        configName: 'revere-assistant',
      });
    } catch (error) {
      console.error('Failed to connect to Pipecat:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
    }
  }

  // RAG-enhanced response generation
  async generateRAGResponse(userQuery: string): Promise<{
    response: string;
    sources: any[];
    context: any[];
  }> {
    // 1. Retrieve relevant context using vector search
    const relevantContext = findRelevantContext(userQuery);

    // 2. Build context string for the prompt
    const contextString = relevantContext
      .map(ctx => `[${ctx.source}]: ${ctx.content}`)
      .join('\n\n');

    // 3. Create RAG prompt
    const ragPrompt = `You are an AI assistant for the City of Revere, Massachusetts.
    Use the following context to answer the user's question accurately.
    If the context doesn't contain relevant information, say so and provide general guidance.

    Context:
    ${contextString}

    User Question: ${userQuery}

    Instructions:
    - Be specific and cite sources when possible
    - Use the real data from the context
    - If you need current/live data (weather, transit), mention that you'll fetch it
    - Be helpful and conversational`;

    // 4. If Pipecat is available, use it for generation
    if (this.client) {
      try {
        // Send to Pipecat for LLM processing
        const response = await this.sendToPipecat(ragPrompt);

        return {
          response,
          sources: relevantContext.map(ctx => ({
            source: ctx.source,
            lastUpdated: ctx.lastUpdated
          })),
          context: relevantContext
        };
      } catch (error) {
        console.error('Pipecat generation failed, using fallback:', error);
      }
    }

    // 5. Fallback to rule-based response with context
    const fallbackResponse = this.generateFallbackResponse(userQuery, relevantContext);

    return {
      response: fallbackResponse,
      sources: relevantContext.map(ctx => ({
        source: ctx.source,
        lastUpdated: ctx.lastUpdated
      })),
      context: relevantContext
    };
  }

  private async sendToPipecat(prompt: string): Promise<string> {
    if (!this.client) {
      throw new Error('Pipecat client not available');
    }

    // Send message to Pipecat and wait for response
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Pipecat response timeout'));
      }, 10000);

      this.client!.on('bot:response', (data: any) => {
        clearTimeout(timeout);
        resolve(data.text || 'I received your message but need more information.');
      });

      this.client!.sendMessage({
        type: 'text',
        text: prompt
      });
    });
  }

  private generateFallbackResponse(query: string, context: any[]): string {
    if (context.length === 0) {
      return `I don't have specific information about that in my knowledge base.
      You can try asking about demographics, transportation, education, housing, or recreation in Revere.`;
    }

    // Generate response based on context
    const primaryContext = context[0];
    let response = `Based on ${primaryContext.source} data:\n\n${primaryContext.content}`;

    if (context.length > 1) {
      response += '\n\nRelated information:\n';
      context.slice(1).forEach(ctx => {
        response += `• ${ctx.content.substring(0, 100)}...\n`;
      });
    }

    response += `\n\nSources: ${context.map(c => c.source).join(', ')}`;

    return response;
  }

  // Store conversations for improving RAG
  async storeConversation(
    userId: string,
    query: string,
    response: string,
    context: any[]
  ): Promise<void> {
    try {
      await supabase.from('chat_history').insert({
        user_id: userId,
        query,
        response,
        context,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to store conversation:', error);
    }
  }

  // Update knowledge base from database
  async updateKnowledgeBase(): Promise<void> {
    try {
      // Fetch latest data from various tables
      const { data: budgetData } = await supabase
        .from('budget_summaries')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      const { data: weatherData } = await supabase
        .from('weather_data')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(1);

      // Add new knowledge items if data is available
      if (budgetData && budgetData.length > 0) {
        REVERE_KNOWLEDGE_BASE.push({
          id: 'budget_current',
          content: `Current fiscal year budget: ${JSON.stringify(budgetData[0])}`,
          embeddings: ['budget', 'fiscal', 'spending', 'revenue'],
          source: 'City Budget Office',
          lastUpdated: new Date().toISOString()
        });
      }

      if (weatherData && weatherData.length > 0) {
        REVERE_KNOWLEDGE_BASE.push({
          id: 'weather_current',
          content: `Current weather: ${JSON.stringify(weatherData[0])}`,
          embeddings: ['weather', 'temperature', 'conditions'],
          source: 'Weather Service',
          lastUpdated: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('Failed to update knowledge base:', error);
    }
  }
}

// Singleton instance
export const pipecatRAGService = new PipecatRAGService();