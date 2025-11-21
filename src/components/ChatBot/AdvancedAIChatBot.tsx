import React, { useState, useRef, useEffect } from 'react';
import {
  MessageCircle,
  X,
  Mic,
  MicOff,
  Send,
  Bot,
  User,
  TrendingUp,
  MapPin,
  DollarSign,
  Home,
  Shield,
  GraduationCap,
  Cloud,
  Bus,
  Users,
  Minimize2,
  Maximize2,
  Settings,
  RefreshCw,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Database,
  Sparkles,
  BarChart3,
  Download,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
// Removed useDashboardData import - AI now fetches real data directly
import { formatCurrency } from '@/lib/formatters';
import ChartVisualization, { ChartType } from './ChartVisualization';
import { generateAIResponse, generateFallbackResponse, isOpenAIConfigured, ChatContext } from '@/services/openaiService';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  type?: 'text' | 'voice' | 'data-insight' | 'chart';
  chartData?: {
    type: ChartType;
    data: Array<{ name: string; value: number; [key: string]: any }>;
    title: string;
    description?: string;
  };
  metadata?: {
    category?: string;
    dataPoints?: { label: string; value: string | number }[];
    suggestions?: string[];
    dataSource?: 'ai' | 'live' | 'fallback';
    processingTime?: number;
  };
}

interface AdvancedAIChatBotProps {
  className?: string;
  currentPage?: string;
}

const QUICK_ACTIONS = [
  {
    label: 'Budget Chart',
    query: 'Show me a chart of the budget breakdown by department',
    icon: DollarSign
  },
  {
    label: 'Housing Trends',
    query: 'Create a visualization of housing market trends',
    icon: Home
  },
  {
    label: 'Crime Analysis',
    query: 'Display crime statistics in a chart format',
    icon: Shield
  },
  {
    label: 'Weather Data',
    query: 'Visualize current weather and air quality data',
    icon: Cloud
  },
];

const CHART_SUGGESTIONS = [
  {
    label: 'Education Spending',
    query: 'Show education budget allocation over time',
    type: 'line' as ChartType
  },
  {
    label: 'Transportation Usage',
    query: 'Display MBTA Blue Line ridership data',
    type: 'area' as ChartType
  },
  {
    label: 'City Services',
    query: 'Compare city department budgets',
    type: 'bar' as ChartType
  },
  {
    label: 'Demographics',
    query: 'Show population demographics breakdown',
    type: 'pie' as ChartType
  },
];

const AdvancedAIChatBot: React.FC<AdvancedAIChatBotProps> = ({
  className = "",
  currentPage = "dashboard"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: `🚀 **Welcome to Revere's Advanced AI Assistant!**

I'm powered by ${isOpenAIConfigured() ? 'OpenAI GPT-4' : 'intelligent algorithms'} and can:

📊 **Create Interactive Charts & Visualizations**
• Generate bar charts, line graphs, pie charts, area charts, and radar charts
• Export charts as PNG or PDF files
• Visualize any city data on demand

🤖 **AI-Powered Insights**
${isOpenAIConfigured() ?
  '• Advanced natural language understanding with GPT-4\n• Context-aware responses based on your current page\n• Intelligent data analysis and predictions' :
  '• Smart pattern recognition in city data\n• Contextual responses to your questions\n• Intelligent suggestions for data exploration'
}

📈 **Live Data Integration**
• Real-time access to budget, housing, crime, education data
• Current weather and transportation information
• Connected to Supabase database for live updates

**Try asking:** "Show me a chart of budget spending" or "Create a visualization of crime trends"`,
      role: 'assistant',
      timestamp: new Date(),
      metadata: {
        category: 'welcome',
        dataSource: isOpenAIConfigured() ? 'ai' : 'fallback',
        suggestions: [
          'Show me a budget breakdown chart',
          'Create a crime trends visualization',
          'Display housing market data',
          'Weather and air quality graphs'
        ]
      }
    }
  ]);

  const [currentMessage, setCurrentMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // AI service now fetches real data directly - no hardcoded dashboard data

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateIntelligentResponse = async (userMessage: string): Promise<Message> => {
    const startTime = Date.now();
    const timestamp = new Date();

    try {
      // Prepare context for AI
      const context: ChatContext = {
        currentPage,
        previousMessages: conversationHistory
        // dashboardData removed - AI fetches real data directly
      };

      let aiResponse;

      if (isOpenAIConfigured()) {
        // Use OpenAI GPT-4 for advanced responses
        aiResponse = await generateAIResponse(userMessage, context);
      } else {
        // Use fallback intelligent responses - fetches real data directly
        aiResponse = await generateFallbackResponse(userMessage);
      }

      const processingTime = Date.now() - startTime;

      // Create message with chart if requested
      const message: Message = {
        id: Date.now().toString(),
        content: aiResponse.content,
        role: 'assistant',
        timestamp,
        type: aiResponse.requiresChart ? 'chart' : 'data-insight',
        chartData: aiResponse.chartData,
        metadata: {
          category: aiResponse.category,
          dataSource: isOpenAIConfigured() ? 'ai' : 'fallback',
          suggestions: aiResponse.suggestions,
          processingTime
        }
      };

      return message;

    } catch (error) {
      console.error('Error generating AI response:', error);

      return {
        id: Date.now().toString(),
        content: `I apologize for the technical difficulty with AI services. I'm designed to fetch real data from external APIs including US Census, Weather services, MBTA, and Massachusetts government databases. Let me try to fetch real data for your question: "${userMessage}"\n\nWhat specific information would you like to explore?`,
        role: 'assistant',
        timestamp,
        metadata: {
          category: 'error',
          dataSource: 'fallback',
          suggestions: ['Budget overview', 'Housing data', 'Weather info', 'Crime statistics']
        }
      };
    }
  };

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || currentMessage.trim();
    if (!textToSend || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: textToSend,
      role: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    // Add to messages and conversation history
    setMessages(prev => [...prev, userMessage]);
    setConversationHistory(prev => [...prev, { role: 'user', content: textToSend }]);
    setCurrentMessage('');
    setIsProcessing(true);
    setIsTyping(true);

    try {
      const response = await generateIntelligentResponse(textToSend);
      setMessages(prev => [...prev, response]);

      // Add AI response to conversation history
      setConversationHistory(prev => [...prev, { role: 'assistant', content: response.content }]);

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickAction = (query: string) => {
    handleSendMessage(query);
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied!",
      description: "Message copied to clipboard",
    });
  };

  const exportConversation = () => {
    const conversationText = messages.map(msg =>
      `[${msg.role.toUpperCase()}] ${msg.timestamp.toLocaleString()}\n${msg.content}\n`
    ).join('\n');

    const blob = new Blob([conversationText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revere_chat_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Exported!",
      description: "Conversation saved as text file",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const DataInsightCard = ({ dataPoints }: { dataPoints: { label: string; value: string | number }[] }) => (
    <div className="grid grid-cols-2 gap-2 mt-3">
      {dataPoints.map((point, index) => (
        <div key={index} className="bg-gray-50 dark:bg-gray-800 p-2 rounded text-xs">
          <div className="font-medium text-gray-600 dark:text-gray-400">{point.label}</div>
          <div className="font-bold text-gray-900 dark:text-gray-100">{point.value}</div>
        </div>
      ))}
    </div>
  );

  if (!isOpen) {
    return (
      <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="rounded-full h-16 w-16 shadow-2xl bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 hover:from-purple-700 hover:via-blue-700 hover:to-cyan-700 transition-all duration-300 animate-pulse"
        >
          <MessageCircle className="h-7 w-7" />
        </Button>
        <Badge className="absolute -top-2 -left-2 bg-gradient-to-r from-orange-500 to-red-500 text-white animate-bounce">
          <Sparkles className="h-3 w-3 mr-1" />
          AI+
        </Badge>
        <Badge className="absolute -bottom-2 -right-2 bg-green-500 text-white animate-pulse">
          <BarChart3 className="h-3 w-3 mr-1" />
          CHARTS
        </Badge>
      </div>
    );
  }

  return (
    <div className={`fixed ${isMinimized ? 'bottom-6 right-6' : 'bottom-6 right-6'} z-50 ${className}`}>
      <Card className={`shadow-2xl border-2 border-purple-200 dark:border-purple-800 ${isMinimized ? 'w-80 h-16' : 'w-[450px] h-[650px]'} transition-all duration-300 bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-blue-950`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white rounded-t-lg">
          <div className="flex items-center space-x-3">
            <Avatar className="h-8 w-8 border-2 border-white">
              <AvatarFallback className="bg-gradient-to-r from-purple-500 to-blue-500 text-white">
                <Sparkles className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-bold text-sm flex items-center gap-2">
                Revere AI Assistant
                <Badge variant="secondary" className="text-xs bg-orange-400 text-orange-900">
                  <Zap className="h-3 w-3 mr-1" />
                  {isOpenAIConfigured() ? 'GPT-4' : 'SMART'}
                </Badge>
                <Badge variant="secondary" className="text-xs bg-green-400 text-green-900">
                  <BarChart3 className="h-3 w-3 mr-1" />
                  CHARTS
                </Badge>
              </h3>
              {!isMinimized && <p className="text-xs opacity-90">AI-Powered • Chart Generation • Live Data</p>}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={exportConversation}
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
              title="Export conversation"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
            >
              {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Quick Actions */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950">
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="h-4 w-4 text-purple-600" />
                  <span className="text-xs font-medium text-purple-600">Quick Charts</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {QUICK_ACTIONS.map((action, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickAction(action.query)}
                      className="h-8 text-xs px-3 hover:bg-purple-50 dark:hover:bg-purple-900 border-purple-200 dark:border-purple-700"
                      disabled={isProcessing}
                    >
                      <action.icon className="h-3 w-3 mr-1" />
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="h-[420px] p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} group`}
                  >
                    <div className={`flex items-start space-x-3 max-w-[90%] ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      <Avatar className="h-7 w-7 flex-shrink-0">
                        <AvatarFallback className={message.role === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-gradient-to-r from-purple-100 to-blue-100 text-purple-600'}>
                          {message.role === 'user' ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col space-y-2">
                        <div
                          className={`p-3 rounded-2xl text-sm leading-relaxed ${
                            message.role === 'user'
                              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-br-sm'
                              : 'bg-gradient-to-r from-gray-100 to-blue-50 dark:from-gray-800 dark:to-blue-950 text-gray-900 dark:text-gray-100 rounded-bl-sm border-l-4 border-purple-400'
                          }`}
                        >
                          <div className="whitespace-pre-wrap">{message.content}</div>

                          {/* AI/Data Source Badge */}
                          {message.metadata?.dataSource && message.role === 'assistant' && (
                            <div className="flex gap-2 mt-2">
                              <Badge
                                variant="secondary"
                                className={`text-xs ${
                                  message.metadata.dataSource === 'ai'
                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                                    : message.metadata.dataSource === 'live'
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                    : 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
                                }`}
                              >
                                {message.metadata.dataSource === 'ai' ? '🤖 AI Generated' :
                                 message.metadata.dataSource === 'live' ? '📊 Live Data' : '⚡ Smart Response'}
                              </Badge>
                              {message.metadata.processingTime && (
                                <Badge variant="outline" className="text-xs">
                                  {message.metadata.processingTime}ms
                                </Badge>
                              )}
                            </div>
                          )}

                          {/* Data Insights Card */}
                          {message.metadata?.dataPoints && (
                            <DataInsightCard dataPoints={message.metadata.dataPoints} />
                          )}

                          {/* Suggestions */}
                          {message.metadata?.suggestions && message.role === 'assistant' && (
                            <div className="mt-3 space-y-1">
                              <p className="text-xs font-medium opacity-70">Try asking:</p>
                              <div className="flex flex-wrap gap-1">
                                {message.metadata.suggestions.map((suggestion, idx) => (
                                  <Button
                                    key={idx}
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleQuickAction(suggestion)}
                                    className="h-6 text-xs px-2 bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 border border-purple-200 dark:border-purple-700"
                                  >
                                    {suggestion}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-between mt-2">
                            <p className="text-xs opacity-60">
                              {formatTime(message.timestamp)}
                            </p>
                            {message.role === 'assistant' && (
                              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyMessage(message.content)}
                                  className="h-6 w-6 p-0 hover:bg-black/10"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 hover:bg-black/10"
                                >
                                  <ThumbsUp className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Chart Visualization */}
                        {message.chartData && (
                          <div className="mt-2">
                            <ChartVisualization
                              type={message.chartData.type}
                              data={message.chartData.data}
                              title={message.chartData.title}
                              description={message.chartData.description}
                              height={250}
                              onExport={() => toast({
                                title: "Chart Exported",
                                description: "Chart has been saved successfully"
                              })}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="bg-gradient-to-r from-purple-100 to-blue-100 text-purple-600">
                          <Sparkles className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="bg-gradient-to-r from-gray-100 to-blue-50 dark:from-gray-800 dark:to-blue-950 p-3 rounded-2xl rounded-bl-sm border-l-4 border-purple-400">
                        <div className="flex items-center space-x-2">
                          <Sparkles className="h-3 w-3 text-purple-500 animate-pulse" />
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                          </div>
                          <span className="text-xs text-gray-500">AI thinking...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div ref={messagesEndRef} />
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950">
              <div className="flex items-center space-x-2">
                <div className="flex-1 relative">
                  <Input
                    ref={inputRef}
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask for charts, insights, or city data..."
                    disabled={isProcessing}
                    className="pr-10 bg-white dark:bg-gray-900 border-purple-300 dark:border-purple-600 focus:border-purple-500 focus:ring-purple-500"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsListening(!isListening)}
                    className={`absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 ${isListening ? 'text-red-500' : 'text-gray-400'}`}
                  >
                    {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                </div>
                <Button
                  onClick={() => handleSendMessage()}
                  disabled={!currentMessage.trim() || isProcessing}
                  size="sm"
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 h-10 px-4"
                >
                  {isProcessing ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-purple-500" />
                  {isOpenAIConfigured() ? 'Powered by GPT-4 + Charts' : 'Smart AI + Chart Generation'}
                  <Separator orientation="vertical" className="h-3" />
                  <Database className="h-3 w-3 text-blue-500" />
                  Live Data
                </p>
                <Badge variant="secondary" className="text-xs bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 dark:from-purple-900 dark:to-blue-900 dark:text-purple-300">
                  {currentPage ? currentPage : 'dashboard'}
                </Badge>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default AdvancedAIChatBot;