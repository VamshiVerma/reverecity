// Gemini AI Service with RAG for Revere City Insights
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/integrations/supabase/client';
import { realTimeDataService } from './realTimeDataService';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface ChatContext {
  policeLogs?: any[];
  weatherData?: any;
  mbtaData?: any;
  censusData?: any;
  municipalData?: any;
}

export class GeminiService {
  private model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  private chatHistory: ChatMessage[] = [];

  /**
   * Fetch relevant context based on user query
   */
  private async fetchContext(userMessage: string): Promise<ChatContext> {
    const lowerMessage = userMessage.toLowerCase();
    const context: ChatContext = {};

    try {
      // ALWAYS fetch police logs - let Gemini decide if it's relevant
      // This removes hardcoded keyword matching!
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data: policeLogs } = await supabase
        .from('police_logs')
        .select('*')
        .gte('log_date', weekAgo.toISOString().split('T')[0])
        .order('timestamp', { ascending: false })
        .limit(200);

      context.policeLogs = policeLogs || [];

      // Fetch weather data if needed
      if (lowerMessage.includes('weather') || lowerMessage.includes('temperature')) {
        try {
          context.weatherData = await realTimeDataService.fetchWeatherData();
        } catch (e) {
          console.log('Weather data unavailable');
        }
      }

      // Fetch MBTA data if needed
      if (lowerMessage.includes('mbta') || lowerMessage.includes('transit') || lowerMessage.includes('blue line')) {
        try {
          context.mbtaData = await realTimeDataService.fetchMBTAData();
        } catch (e) {
          console.log('MBTA data unavailable');
        }
      }

      // Fetch census data if needed
      if (lowerMessage.includes('population') || lowerMessage.includes('demographic')) {
        try {
          context.censusData = await realTimeDataService.fetchCensusData();
        } catch (e) {
          console.log('Census data unavailable');
        }
      }

      // Fetch municipal data if needed
      if (lowerMessage.includes('city hall') || lowerMessage.includes('emergency')) {
        try {
          context.municipalData = await realTimeDataService.fetchMunicipalData();
        } catch (e) {
          console.log('Municipal data unavailable');
        }
      }

    } catch (error) {
      console.error('Error fetching context:', error);
    }

    return context;
  }

  /**
   * Build context string for Gemini
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

    return contextStr;
  }

  /**
   * Generate AI response with RAG
   */
  async generateResponse(userMessage: string): Promise<{ content: string; metadata: any }> {
    const startTime = Date.now();

    try {
      // Fetch relevant context
      const context = await this.fetchContext(userMessage);
      const contextString = this.buildContextString(context);

      // Build system prompt
      const systemPrompt = `You are an AI assistant for the City of Revere, Massachusetts. You provide accurate, helpful information about the city using real-time data.

**Your capabilities:**
- Answer questions about recent police activity and incidents
- Provide weather updates
- Share MBTA transit information
- Discuss demographics and city statistics
- Help residents understand what's happening in their city

**Guidelines:**
- Be conversational and friendly
- Use the provided data context to give accurate answers
- If you don't have data for something, say so clearly
- Focus on being helpful and informative
- Keep responses concise but complete
- Use emojis sparingly for visual organization

${contextString}

Now answer the user's question based on the data above.`;

      // Create chat
      const chat = this.model.startChat({
        history: this.chatHistory,
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.7,
        },
      });

      // Send message with context
      const result = await chat.sendMessage(`${systemPrompt}\n\nUser: ${userMessage}`);
      const response = result.response;
      const text = response.text();

      // Update chat history
      this.chatHistory.push({ role: 'user', parts: [{ text: userMessage }] });
      this.chatHistory.push({ role: 'model', parts: [{ text: text }] });

      // Keep only last 10 messages
      if (this.chatHistory.length > 10) {
        this.chatHistory = this.chatHistory.slice(-10);
      }

      const processingTime = Date.now() - startTime;

      return {
        content: text,
        metadata: {
          dataSource: 'Gemini 2.0 Flash + RAG',
          apiCalls: [
            context.policeLogs ? 'Police Logs DB' : null,
            context.weatherData ? 'Weather API' : null,
            context.mbtaData ? 'MBTA API' : null,
            context.censusData ? 'Census API' : null,
            context.municipalData ? 'Municipal API' : null
          ].filter(Boolean),
          processingTime,
          contextSize: contextString.length
        }
      };

    } catch (error) {
      console.error('Gemini API Error:', error);

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
   * Clear chat history
   */
  clearHistory() {
    this.chatHistory = [];
  }
}

export const geminiService = new GeminiService();
