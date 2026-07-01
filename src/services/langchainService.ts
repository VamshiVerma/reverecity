// LangChain-based AI Service with full RAG, Memory, and Conversation Chains
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ConversationChain } from 'langchain/chains';
import { BufferMemory } from 'langchain/memory';
import { PromptTemplate } from '@langchain/core/prompts';
import { supabase } from '@/integrations/supabase/client';
import { realTimeDataService } from './realTimeDataService';
import { budgetVectorService } from './budgetVectorService';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyDjm7WuesLoSLJlZ3wEU9Vmm-wKBq7GUkg';

if (!GEMINI_API_KEY || GEMINI_API_KEY === '') {
  console.error('VITE_GEMINI_API_KEY is not set!');
}

interface ChatContext {
  policeLogs?: any[];
  insights?: any[];
  mbtaAlerts?: any[];
  mbtaTravelTimes?: any[];
  weatherHistory?: any[];
  budgetSummaries?: any[];
  budgetChunks?: any[];
  weatherData?: any;
  mbtaData?: any;
  censusData?: any;
  municipalData?: any;
}

export class LangChainService {
  private model: ChatGoogleGenerativeAI;
  private memory: BufferMemory;
  private chain: ConversationChain | null = null;

  constructor() {
    // Initialize Gemini 2.5 Flash model
    this.model = new ChatGoogleGenerativeAI({
      apiKey: GEMINI_API_KEY,
      model: 'gemini-2.5-flash',
      temperature: 0.7,
      maxOutputTokens: 1000,
    });

    // Initialize conversation memory
    this.memory = new BufferMemory({
      returnMessages: true,
      memoryKey: 'chat_history',
      inputKey: 'input',
      outputKey: 'response',
    });
  }

  /**
   * Fetch relevant context based on user query
   */
  private async fetchContext(userMessage: string): Promise<ChatContext> {
    const lowerMessage = userMessage.toLowerCase();
    const context: ChatContext = {};

    try {
      // ALWAYS fetch police logs
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data: policeLogs } = await supabase
        .from('police_logs')
        .select('*')
        .gte('log_date', weekAgo.toISOString().split('T')[0])
        .order('timestamp', { ascending: false })
        .limit(200);

      context.policeLogs = policeLogs || [];

      // Fetch MBTA alerts (only if exists)
      try {
        const { data: mbtaAlerts } = await supabase
          .from('mbta_alerts')
          .select('*')
          .limit(20);
        context.mbtaAlerts = mbtaAlerts || [];
      } catch (e) {
        console.log('MBTA alerts table unavailable');
      }

      // Fetch MBTA travel times (only if exists)
      try {
        const { data: mbtaTravelTimes } = await supabase
          .from('mbta_travel_times')
          .select('*')
          .limit(50);
        context.mbtaTravelTimes = mbtaTravelTimes || [];
      } catch (e) {
        console.log('MBTA travel times table unavailable');
      }

      // Conditionally fetch real-time API data
      if (lowerMessage.includes('weather') || lowerMessage.includes('temperature')) {
        try {
          context.weatherData = await realTimeDataService.fetchWeatherData();
        } catch (e) {
          console.log('Weather API unavailable');
        }
      }

      if (lowerMessage.includes('mbta') || lowerMessage.includes('transit') || lowerMessage.includes('blue line')) {
        try {
          context.mbtaData = await realTimeDataService.fetchMBTAData();
        } catch (e) {
          console.log('MBTA API unavailable');
        }
      }

      if (lowerMessage.includes('population') || lowerMessage.includes('demographic')) {
        try {
          context.censusData = await realTimeDataService.fetchCensusData();
        } catch (e) {
          console.log('Census API unavailable');
        }
      }

      if (lowerMessage.includes('city hall') || lowerMessage.includes('emergency')) {
        try {
          context.municipalData = await realTimeDataService.fetchMunicipalData();
        } catch (e) {
          console.log('Municipal API unavailable');
        }
      }

      // Fetch budget information using vector search
      if (lowerMessage.includes('budget') || lowerMessage.includes('spending') || lowerMessage.includes('revenue') ||
          lowerMessage.includes('department') || lowerMessage.includes('fiscal') || lowerMessage.includes('fund') ||
          lowerMessage.includes('police')) {
        try {
          console.log('💰 Fetching budget context for:', userMessage);
          const budgetResult = await budgetVectorService.answerBudgetQuestion(userMessage);
          context.budgetChunks = budgetResult.chunks;
          console.log('✓ Budget chunks retrieved:', budgetResult.chunks.length);
        } catch (e) {
          console.error('❌ Budget vector search error:', e);
        }
      }

    } catch (error) {
      console.error('Error fetching context:', error);
    }

    return context;
  }

  /**
   * Build rich context string for RAG
   */
  private buildContextString(context: ChatContext): string {
    let contextStr = '';

    if (context.policeLogs && context.policeLogs.length > 0) {
      contextStr += '\n\n📊 **POLICE LOGS DATA** (Last 7 days):\n';
      contextStr += `Total incidents: ${context.policeLogs.length}\n\n`;

      // Call type breakdown
      const typeCount = context.policeLogs.reduce((acc: any, log: any) => {
        const type = log.call_type_category || 'OTHER';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});

      contextStr += 'Call Type Breakdown:\n';
      Object.entries(typeCount)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([type, count]) => {
          const pct = ((count as number / context.policeLogs!.length) * 100).toFixed(1);
          contextStr += `- ${type.replace(/_/g, ' ')}: ${count} calls (${pct}%)\n`;
        });

      // Most active locations
      const locationCount = context.policeLogs.reduce((acc: any, log: any) => {
        const loc = log.location_street;
        if (loc) acc[loc] = (acc[loc] || 0) + 1;
        return acc;
      }, {});

      const topLocations = Object.entries(locationCount)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 5);

      if (topLocations.length > 0) {
        contextStr += '\nMost Active Locations:\n';
        topLocations.forEach(([loc, count]) => {
          contextStr += `- ${loc}: ${count} calls\n`;
        });
      }

      // Recent incidents
      contextStr += '\nRecent Incidents (last 10):\n';
      context.policeLogs.slice(0, 10).forEach((log: any) => {
        const date = new Date(log.log_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        contextStr += `- ${date} ${log.time_24h}: ${log.call_reason} at ${log.location_street || 'Unknown'}\n`;
      });
    }

    if (context.weatherData) {
      contextStr += '\n\n🌤️ **WEATHER DATA**:\n';
      contextStr += `Temperature: ${context.weatherData.temperature}°F\n`;
      contextStr += `Condition: ${context.weatherData.condition}\n`;
      contextStr += `Feels like: ${context.weatherData.feelsLike}°F\n`;
      contextStr += `Humidity: ${context.weatherData.humidity}%\n`;
    }

    if (context.mbtaData) {
      contextStr += '\n\n🚇 **MBTA DATA**:\n';
      contextStr += `Blue Line Status: ${context.mbtaData.serviceStatus}\n`;
      if (context.mbtaData.predictions.length > 0) {
        contextStr += 'Next trains:\n';
        context.mbtaData.predictions.slice(0, 3).forEach((pred: any) => {
          contextStr += `- ${pred.stop}: ${pred.arrivalTime} (${pred.direction})\n`;
        });
      }
    }

    if (context.censusData) {
      contextStr += '\n\n📊 **CENSUS DATA**:\n';
      contextStr += `Population: ${context.censusData.population.toLocaleString()}\n`;
      contextStr += `Median Income: $${context.censusData.medianIncome.toLocaleString()}\n`;
      contextStr += `Median Age: ${context.censusData.medianAge}\n`;
    }

    if (context.municipalData) {
      contextStr += '\n\n🏛️ **MUNICIPAL DATA**:\n';
      contextStr += `City Hall: ${context.municipalData.cityHall.status}\n`;
      contextStr += `Phone: ${context.municipalData.cityHall.phone}\n`;
    }

    if (context.insights && context.insights.length > 0) {
      contextStr += '\n\n💡 **CITY INSIGHTS**:\n';
      context.insights.slice(0, 10).forEach((insight: any) => {
        contextStr += `- ${insight.category}: ${insight.title}\n`;
        if (insight.summary) contextStr += `  ${insight.summary}\n`;
      });
    }

    if (context.mbtaAlerts && context.mbtaAlerts.length > 0) {
      contextStr += '\n\n🚨 **MBTA SERVICE ALERTS**:\n';
      context.mbtaAlerts.slice(0, 5).forEach((alert: any) => {
        contextStr += `- ${alert.alert_type}: ${alert.header}\n`;
        if (alert.description) contextStr += `  ${alert.description}\n`;
      });
    }

    if (context.mbtaTravelTimes && context.mbtaTravelTimes.length > 0) {
      contextStr += '\n\n🚇 **MBTA TRAVEL TIMES** (Recent):\n';
      const avgTimes: any = {};
      context.mbtaTravelTimes.forEach((time: any) => {
        const key = `${time.from_stop} to ${time.to_stop}`;
        if (!avgTimes[key]) avgTimes[key] = [];
        avgTimes[key].push(time.travel_time_sec);
      });
      Object.entries(avgTimes).slice(0, 5).forEach(([route, times]: any) => {
        const avg = (times.reduce((a: number, b: number) => a + b, 0) / times.length / 60).toFixed(1);
        contextStr += `- ${route}: ${avg} min avg\n`;
      });
    }

    if (context.weatherHistory && context.weatherHistory.length > 0) {
      contextStr += '\n\n🌡️ **WEATHER HISTORY** (Last 7 days):\n';
      context.weatherHistory.slice(0, 7).forEach((weather: any) => {
        const date = new Date(weather.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        contextStr += `- ${date}: ${weather.temperature}°F, ${weather.conditions}\n`;
      });
    }

    if (context.budgetSummaries && context.budgetSummaries.length > 0) {
      contextStr += '\n\n💰 **BUDGET SUMMARIES**:\n';
      context.budgetSummaries.slice(0, 5).forEach((budget: any) => {
        contextStr += `- ${budget.fiscal_year}: ${budget.department}\n`;
        if (budget.total_amount) contextStr += `  Total: $${(budget.total_amount / 1000000).toFixed(1)}M\n`;
      });
    }

    if (context.budgetChunks && context.budgetChunks.length > 0) {
      contextStr += '\n\n💰 **BUDGET DOCUMENT (FY2025) - Vector Search Results**:\n';
      contextStr += `Found ${context.budgetChunks.length} relevant sections:\n\n`;
      context.budgetChunks.forEach((chunk: any, idx: number) => {
        contextStr += `[${idx + 1}] Relevance: ${(chunk.similarity * 100).toFixed(1)}%\n`;
        contextStr += `${chunk.content}\n\n`;
        if (idx < context.budgetChunks.length - 1) {
          contextStr += '---\n\n';
        }
      });
    }

    return contextStr;
  }

  /**
   * Initialize conversation chain with prompt template
   */
  private async initializeChain(context: ChatContext) {
    const contextString = this.buildContextString(context);

    const promptTemplate = new PromptTemplate({
      template: `You are an AI assistant for the City of Revere, Massachusetts. You provide accurate, helpful information about the city using comprehensive real-time data from all city systems.

**Your complete capabilities:**
- 🚔 Police activity, incidents, crime statistics and trends
- 🚇 MBTA Blue Line alerts, travel times, and real-time transit data
- 🌤️ Current weather conditions and historical weather patterns
- 💰 City budget information and financial summaries
- 📊 Demographics, population, and census data
- 💡 City insights across all departments
- 🏛️ Municipal services and emergency response information
- 📈 Analytics and trends across all city data

**Available Data Sources:**
{context}

**Guidelines:**
- Be conversational and friendly
- **CRITICAL: When budget/financial questions are asked, you MUST use the "BUDGET DOCUMENT (FY2025) - Vector Search Results" section in the context above. This contains the actual budget document content.**
- Use the comprehensive data context above to give accurate, detailed answers
- Cross-reference different data sources when relevant (e.g., compare police activity with weather patterns)
- If budget data is provided in the context, cite specific numbers and details from it
- If you don't have specific data, say so clearly but offer related information
- Focus on being helpful and insightful
- Keep responses concise but complete
- Use emojis sparingly for visual organization
- Remember our entire conversation history and refer back when relevant
- Provide comparative insights (e.g., "compared to yesterday", "vs last week")

**Chat History:**
{chat_history}

**Human:** {input}

**AI:`,
      inputVariables: ['context', 'chat_history', 'input'],
    });

    this.chain = new ConversationChain({
      llm: this.model,
      memory: this.memory,
      prompt: promptTemplate,
    });

    return contextString;
  }

  /**
   * Generate AI response with LangChain
   */
  async generateResponse(userMessage: string): Promise<{ content: string; metadata: any }> {
    const startTime = Date.now();

    try {
      // Fetch relevant context
      const context = await this.fetchContext(userMessage);

      // Initialize chain with context
      const contextString = await this.initializeChain(context);

      // Generate response using conversation chain
      const result = await this.chain!.call({
        input: userMessage,
        context: contextString,
      });

      const processingTime = Date.now() - startTime;

      // Build detailed source citations - only include sources relevant to the user's query
      const sources = [];
      const lowerMessage = userMessage.toLowerCase();

      // Only show police logs if the question is about police/crime/safety/incidents
      if (context.policeLogs && context.policeLogs.length > 0 &&
          (lowerMessage.includes('police') || lowerMessage.includes('crime') ||
           lowerMessage.includes('incident') || lowerMessage.includes('safety') ||
           lowerMessage.includes('call') || lowerMessage.includes('activity') ||
           lowerMessage.includes('happening') || lowerMessage.includes('event'))) {
        // Get date range for citation
        const dates = context.policeLogs.map((l: any) => l.log_date).sort();
        const startDate = new Date(dates[0] + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const endDate = new Date(dates[dates.length - 1] + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        sources.push({
          name: 'Revere Police Daily Logs',
          type: 'reverepolice.org/news',
          description: `${context.policeLogs.length} incidents (${startDate}–${endDate})`,
          icon: '🚔'
        });
      }

      // Only show budget if question is about budget/spending/fiscal
      if (context.budgetChunks && context.budgetChunks.length > 0) {
        // Extract section names from chunks (look for headings in content)
        const sections = context.budgetChunks
          .map((chunk: any) => {
            // Try to extract section from metadata or content
            const lines = chunk.content.split('\n');
            const heading = lines.find((line: string) =>
              line.startsWith('#') || line.match(/^[A-Z\s&]{10,}$/));
            return heading ? heading.replace(/^#+\s*/, '').trim().substring(0, 40) : null;
          })
          .filter(Boolean)
          .slice(0, 2);  // Show top 2 sections

        const sectionStr = sections.length > 0 ? sections.join(', ') : 'Various sections';

        sources.push({
          name: 'FY2025 Budget (GFOA Award)',
          type: sectionStr,
          description: `${context.budgetChunks.length} relevant passages`,
          icon: '💰'
        });
      }

      // Only show weather if question is about weather/temperature
      if (context.weatherData) {
        const updateTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        sources.push({
          name: 'Visual Crossing Weather',
          type: 'api.visualcrossing.com',
          description: `Live data as of ${updateTime}`,
          icon: '🌤️'
        });
      }

      // Only show MBTA if question is about transit
      if (context.mbtaData) {
        const stations = ['Wonderland', 'Revere Beach', 'Beachmont', 'Suffolk Downs'];
        sources.push({
          name: 'MBTA Blue Line API',
          type: `api-v3.mbta.com (${stations.slice(0, 2).join(', ')})`,
          description: `Live predictions`,
          icon: '🚇'
        });
      }

      // Only show census if question is about demographics/population
      if (context.censusData) {
        sources.push({
          name: 'US Census Bureau',
          type: 'ACS 5-Year Estimates (2022)',
          description: 'Place: Revere city, MA',
          icon: '📊'
        });
      }

      // Only show municipal if question is about city services
      if (context.municipalData) {
        sources.push({
          name: 'Revere Municipal Services',
          type: '281 Broadway, Revere MA',
          description: 'City Hall operations data',
          icon: '🏛️'
        });
      }

      // Only show MBTA alerts if question is about transit and we have alerts
      if (context.mbtaAlerts && context.mbtaAlerts.length > 0) {
        sources.push({
          name: 'MBTA Service Alerts',
          type: 'Blue Line disruptions',
          description: `${context.mbtaAlerts.length} active notice(s)`,
          icon: '🚨'
        });
      }

      return {
        content: result.response,
        metadata: {
          dataSource: 'LangChain + Gemini 2.5 Flash + RAG',
          apiCalls: [
            context.policeLogs && context.policeLogs.length > 0 ? 'Police Logs DB' : null,
            context.weatherData ? 'Weather API' : null,
            context.mbtaData ? 'MBTA API' : null,
            context.censusData ? 'Census API' : null,
            context.municipalData ? 'Municipal API' : null
          ].filter(Boolean),
          sources,
          processingTime,
          contextSize: contextString.length,
          memorySize: (await this.memory.loadMemoryVariables({})).chat_history?.length || 0
        }
      };

    } catch (error) {
      console.error('LangChain Error:', error);

      return {
        content: `I apologize, but I'm experiencing technical difficulties. Please try again in a moment.`,
        metadata: {
          dataSource: 'Error',
          apiCalls: [],
          processingTime: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Clear conversation memory
   */
  async clearMemory() {
    await this.memory.clear();
  }

  /**
   * Get conversation history
   */
  async getHistory() {
    const history = await this.memory.loadMemoryVariables({});
    return history.chat_history || [];
  }
}

export const langchainService = new LangChainService();
