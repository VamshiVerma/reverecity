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
  ThumbsDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  type?: 'text' | 'voice' | 'data-insight';
  metadata?: {
    category?: string;
    dataPoints?: { label: string; value: string | number }[];
    suggestions?: string[];
  };
}

interface EnhancedChatBotProps {
  className?: string;
  currentPage?: string;
}

const CITY_INSIGHTS = {
  budget: {
    icon: DollarSign,
    color: 'bg-green-500',
    data: { totalBudget: '$127.5M', revenue: '$95.2M', expenses: '$89.8M' }
  },
  housing: {
    icon: Home,
    color: 'bg-blue-500',
    data: { medianPrice: '$485,000', newPermits: '127', vacancy: '3.2%' }
  },
  crime: {
    icon: Shield,
    color: 'bg-red-500',
    data: { crimeRate: '-12%', responseTime: '4.2min', incidents: '2,847' }
  },
  education: {
    icon: GraduationCap,
    color: 'bg-purple-500',
    data: { enrollment: '8,234', graduation: '89.5%', teacherRatio: '14:1' }
  },
  weather: {
    icon: Cloud,
    color: 'bg-cyan-500',
    data: { temperature: '72°F', humidity: '68%', airQuality: 'Good' }
  },
  transportation: {
    icon: Bus,
    color: 'bg-orange-500',
    data: { blueLineRidership: '12,450', busRoutes: '8', avgCommute: '28min' }
  },
  demographics: {
    icon: Users,
    color: 'bg-indigo-500',
    data: { population: '54,755', medianAge: '41.2', diversity: '65%' }
  }
};

const QUICK_ACTIONS = [
  { label: 'Budget Overview', query: 'Show me the current budget overview for Revere', icon: DollarSign },
  { label: 'Housing Market', query: 'What are the latest housing market trends?', icon: Home },
  { label: 'Crime Statistics', query: 'Give me recent crime statistics', icon: Shield },
  { label: 'Weather Update', query: 'What\'s the current weather and air quality?', icon: Cloud },
];

const EnhancedChatBot: React.FC<EnhancedChatBotProps> = ({ className = "", currentPage = "dashboard" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: `Welcome to Revere's AI Assistant! I'm your intelligent guide to city data and insights.

🎯 I can help you with:
• Real-time data analysis and visualization
• Budget and financial insights
• Housing market trends and forecasts
• Crime statistics and public safety data
• Educational metrics and school performance
• Weather monitoring and environmental data
• Transportation and MBTA information
• Demographics and population analytics

💡 **Quick tip**: Try asking "Show me budget insights" or click the quick action buttons below!

How can I assist you today?`,
      role: 'assistant',
      timestamp: new Date(),
      metadata: {
        category: 'welcome',
        suggestions: [
          'Show me budget insights',
          'What are the housing trends?',
          'Recent crime statistics',
          'Weather and air quality'
        ]
      }
    }
  ]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateEnhancedResponse = async (userMessage: string, pageContext?: string): Promise<Message> => {
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2000));

    const lowerMessage = userMessage.toLowerCase();
    const timestamp = new Date();

    // Context-aware responses based on current page
    let contextInfo = "";
    if (pageContext && pageContext !== "dashboard") {
      contextInfo = ` Since you're currently viewing the ${pageContext} page, I'll focus on relevant insights.`;
    }

    // Enhanced AI responses with structured data
    if (lowerMessage.includes('budget') || lowerMessage.includes('financial') || lowerMessage.includes('revenue') || lowerMessage.includes('expenses')) {
      const budgetData = CITY_INSIGHTS.budget.data;
      return {
        id: Date.now().toString(),
        content: `📊 **Revere Budget Analysis**${contextInfo}

Here's the current financial overview:
• **Total Budget**: ${budgetData.totalBudget} (FY2025)
• **Revenue Generated**: ${budgetData.revenue}
• **Current Expenses**: ${budgetData.expenses}
• **Budget Utilization**: 70.4% (on track)

**Key Insights:**
✅ Revenue is 7.5% above projections
📈 Education and Infrastructure are top spending categories
💡 Opportunity to optimize utility costs (potential 3% savings)

The city maintains a healthy financial position with strong revenue streams from property taxes, state aid, and local receipts.`,
        role: 'assistant',
        timestamp,
        type: 'data-insight',
        metadata: {
          category: 'budget',
          dataPoints: [
            { label: 'Total Budget', value: budgetData.totalBudget },
            { label: 'Revenue', value: budgetData.revenue },
            { label: 'Expenses', value: budgetData.expenses },
            { label: 'Budget Health', value: 'Strong' }
          ],
          suggestions: [
            'Show department budget breakdown',
            'Compare to previous year',
            'Revenue forecasting trends'
          ]
        }
      };
    }

    if (lowerMessage.includes('housing') || lowerMessage.includes('real estate') || lowerMessage.includes('property') || lowerMessage.includes('homes')) {
      const housingData = CITY_INSIGHTS.housing.data;
      return {
        id: Date.now().toString(),
        content: `🏠 **Revere Housing Market Report**${contextInfo}

Current market conditions:
• **Median Home Price**: ${housingData.medianPrice} (↑8.2% YoY)
• **New Building Permits**: ${housingData.newPermits} this quarter
• **Vacancy Rate**: ${housingData.vacancy} (historically low)
• **Days on Market**: Average 23 days

**Market Trends:**
📈 Strong seller's market with high demand
🏗️ Active development in Beachmont and Point of Pines
💰 Affordability initiatives: 15% of new units designated affordable
🌊 Waterfront properties seeing premium demand (+15%)

The housing market remains robust with continued investment in both residential and mixed-use developments.`,
        role: 'assistant',
        timestamp,
        type: 'data-insight',
        metadata: {
          category: 'housing',
          dataPoints: [
            { label: 'Median Price', value: housingData.medianPrice },
            { label: 'New Permits', value: housingData.newPermits },
            { label: 'Vacancy Rate', value: housingData.vacancy },
            { label: 'Market Trend', value: 'Rising' }
          ],
          suggestions: [
            'Affordable housing programs',
            'Neighborhood comparisons',
            'Future development plans'
          ]
        }
      };
    }

    if (lowerMessage.includes('crime') || lowerMessage.includes('safety') || lowerMessage.includes('police') || lowerMessage.includes('security')) {
      const crimeData = CITY_INSIGHTS.crime.data;
      return {
        id: Date.now().toString(),
        content: `🛡️ **Public Safety Overview**${contextInfo}

Safety metrics and trends:
• **Crime Rate Change**: ${crimeData.crimeRate} compared to last year
• **Police Response Time**: ${crimeData.responseTime} average
• **Total Incidents**: ${crimeData.incidents} (Jan-Dec 2024)
• **Clearance Rate**: 73% of cases resolved

**Safety Highlights:**
✅ Violent crime down 18% year-over-year
🚨 Enhanced community policing in high-traffic areas
📱 New emergency alert system reaching 89% of residents
🤝 Strong police-community partnership programs

Recent initiatives include increased patrols during evening hours and expanded neighborhood watch programs.`,
        role: 'assistant',
        timestamp,
        type: 'data-insight',
        metadata: {
          category: 'crime',
          dataPoints: [
            { label: 'Crime Rate Change', value: crimeData.crimeRate },
            { label: 'Response Time', value: crimeData.responseTime },
            { label: 'Total Incidents', value: crimeData.incidents },
            { label: 'Safety Rating', value: 'Good' }
          ],
          suggestions: [
            'Neighborhood safety comparison',
            'Crime prevention programs',
            'Emergency preparedness info'
          ]
        }
      };
    }

    if (lowerMessage.includes('weather') || lowerMessage.includes('climate') || lowerMessage.includes('air quality') || lowerMessage.includes('temperature')) {
      const weatherData = CITY_INSIGHTS.weather.data;
      return {
        id: Date.now().toString(),
        content: `🌤️ **Weather & Environmental Conditions**${contextInfo}

Current conditions:
• **Temperature**: ${weatherData.temperature} (feels like 75°F)
• **Humidity**: ${weatherData.humidity}
• **Air Quality**: ${weatherData.airQuality} (AQI: 42)
• **Wind**: 8 mph from NE

**7-Day Forecast:**
☀️ Mostly sunny with temperatures 68-76°F
🌊 Coastal breeze keeping humidity comfortable
⚠️ No severe weather alerts in effect

**Environmental Monitoring:**
📊 Air quality consistently rated "Good" to "Moderate"
🌡️ Climate data shows warming trend (+1.2°F over 10 years)
💨 Wind patterns favorable for air circulation`,
        role: 'assistant',
        timestamp,
        type: 'data-insight',
        metadata: {
          category: 'weather',
          dataPoints: [
            { label: 'Temperature', value: weatherData.temperature },
            { label: 'Humidity', value: weatherData.humidity },
            { label: 'Air Quality', value: weatherData.airQuality },
            { label: 'Conditions', value: 'Favorable' }
          ],
          suggestions: [
            'Weekly weather forecast',
            'Air quality trends',
            'Climate change impact'
          ]
        }
      };
    }

    if (lowerMessage.includes('education') || lowerMessage.includes('school') || lowerMessage.includes('students') || lowerMessage.includes('graduation')) {
      const eduData = CITY_INSIGHTS.education.data;
      return {
        id: Date.now().toString(),
        content: `🎓 **Education System Overview**${contextInfo}

Revere Public Schools performance:
• **Total Enrollment**: ${eduData.enrollment} students
• **Graduation Rate**: ${eduData.graduation} (above state average)
• **Student-Teacher Ratio**: ${eduData.teacherRatio}
• **Schools**: 10 elementary, 2 middle, 1 high school

**Academic Achievements:**
📈 Math scores improved 12% over 3 years
📚 92% of teachers hold advanced degrees
🏆 Multiple schools recognized for excellence
💻 1:1 device ratio for all students

**Special Programs:**
🌍 Dual language immersion (Spanish/English)
🔬 STEM focus with new science labs
🎨 Expanded arts and music programs`,
        role: 'assistant',
        timestamp,
        type: 'data-insight',
        metadata: {
          category: 'education',
          dataPoints: [
            { label: 'Enrollment', value: eduData.enrollment },
            { label: 'Graduation Rate', value: eduData.graduation },
            { label: 'Teacher Ratio', value: eduData.teacherRatio },
            { label: 'Performance', value: 'Above Average' }
          ],
          suggestions: [
            'Individual school performance',
            'Special education services',
            'College readiness metrics'
          ]
        }
      };
    }

    if (lowerMessage.includes('transportation') || lowerMessage.includes('mbta') || lowerMessage.includes('traffic') || lowerMessage.includes('commute')) {
      const transportData = CITY_INSIGHTS.transportation.data;
      return {
        id: Date.now().toString(),
        content: `🚇 **Transportation & Mobility**${contextInfo}

Transit system performance:
• **Blue Line Daily Ridership**: ${transportData.blueLineRidership} passengers
• **Bus Routes**: ${transportData.busRoutes} serving the city
• **Average Commute**: ${transportData.avgCommute} to downtown Boston
• **Service Reliability**: 94% on-time performance

**Transportation Updates:**
🚊 Blue Line improvements ongoing (accessibility upgrades)
🚌 New Route 424 express service to Logan Airport
🚗 Smart traffic signals reducing congestion by 15%
🚴 Bike share program expanding to 12 stations

**Mobility Options:**
✈️ Direct airport connection via Blue Line
🅿️ 2,100 public parking spaces downtown
🚲 8 miles of dedicated bike lanes`,
        role: 'assistant',
        timestamp,
        type: 'data-insight',
        metadata: {
          category: 'transportation',
          dataPoints: [
            { label: 'Blue Line Ridership', value: transportData.blueLineRidership },
            { label: 'Bus Routes', value: transportData.busRoutes },
            { label: 'Avg Commute', value: transportData.avgCommute },
            { label: 'Reliability', value: '94%' }
          ],
          suggestions: [
            'Real-time transit updates',
            'Parking availability',
            'Future transportation projects'
          ]
        }
      };
    }

    if (lowerMessage.includes('demographics') || lowerMessage.includes('population') || lowerMessage.includes('residents') || lowerMessage.includes('diversity')) {
      const demoData = CITY_INSIGHTS.demographics.data;
      return {
        id: Date.now().toString(),
        content: `👥 **Demographics & Population**${contextInfo}

Community overview:
• **Total Population**: ${demoData.population} residents (2024 estimate)
• **Median Age**: ${demoData.medianAge} years
• **Cultural Diversity**: ${demoData.diversity} of residents are minorities
• **Households**: 20,500 total households

**Population Characteristics:**
🌍 Languages spoken: English (72%), Spanish (18%), Others (10%)
👨‍👩‍👧‍👦 Average household size: 2.7 people
🏠 Homeownership rate: 58%
📈 Population growth: +2.1% over past 5 years

**Age Distribution:**
• Under 18: 22%
• 18-64: 62%
• 65+: 16%

The city continues to attract young professionals and families while maintaining strong community roots.`,
        role: 'assistant',
        timestamp,
        type: 'data-insight',
        metadata: {
          category: 'demographics',
          dataPoints: [
            { label: 'Population', value: demoData.population },
            { label: 'Median Age', value: demoData.medianAge },
            { label: 'Diversity Index', value: demoData.diversity },
            { label: 'Growth Rate', value: '+2.1%' }
          ],
          suggestions: [
            'Age group breakdown',
            'Income demographics',
            'Population projections'
          ]
        }
      };
    }

    // Default intelligent response
    return {
      id: Date.now().toString(),
      content: `I understand you're asking about "${userMessage}".${contextInfo}

🤖 **AI Analysis**: I can provide detailed insights on any aspect of Revere's municipal data. Our system tracks real-time information across:

• **Financial**: Budget, revenue, expenses, and fiscal health
• **Housing**: Market trends, permits, pricing, and development
• **Safety**: Crime statistics, response times, and community programs
• **Education**: School performance, enrollment, and academic outcomes
• **Environment**: Weather, air quality, and climate monitoring
• **Transportation**: MBTA service, traffic patterns, and mobility options
• **Community**: Demographics, population trends, and social indicators

💡 **Suggestion**: Try asking something like "Show me the latest budget data" or "What are current housing trends?" for more specific insights.

What specific area would you like to explore?`,
      role: 'assistant',
      timestamp,
      metadata: {
        category: 'general',
        suggestions: [
          'Budget overview',
          'Housing market update',
          'Safety statistics',
          'Weather conditions'
        ]
      }
    };
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

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsProcessing(true);
    setIsTyping(true);

    try {
      const response = await generateEnhancedResponse(textToSend, currentPage);
      setMessages(prev => [...prev, response]);
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
          className="rounded-full h-16 w-16 shadow-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-300 animate-pulse"
        >
          <MessageCircle className="h-7 w-7" />
        </Button>
        <Badge className="absolute -top-2 -left-2 bg-green-500 text-white animate-bounce">
          AI
        </Badge>
      </div>
    );
  }

  return (
    <div className={`fixed ${isMinimized ? 'bottom-6 right-6' : 'bottom-6 right-6'} z-50 ${className}`}>
      <Card className={`shadow-2xl border-2 ${isMinimized ? 'w-80 h-16' : 'w-[420px] h-[600px]'} transition-all duration-300 bg-white dark:bg-gray-900`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
          <div className="flex items-center space-x-3">
            <Avatar className="h-8 w-8 border-2 border-white">
              <AvatarFallback className="bg-blue-500 text-white">
                <Bot className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-bold text-sm">Revere AI Assistant</h3>
              {!isMinimized && <p className="text-xs opacity-90">Smart City Analytics • Real-time Insights</p>}
            </div>
          </div>
          <div className="flex items-center space-x-2">
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
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <div className="flex flex-wrap gap-2">
                {QUICK_ACTIONS.map((action, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAction(action.query)}
                    className="h-8 text-xs px-3 hover:bg-blue-50 dark:hover:bg-blue-900"
                    disabled={isProcessing}
                  >
                    <action.icon className="h-3 w-3 mr-1" />
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="h-[380px] p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} group`}
                  >
                    <div className={`flex items-start space-x-3 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      <Avatar className="h-7 w-7 flex-shrink-0">
                        <AvatarFallback className={message.role === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}>
                          {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col space-y-2">
                        <div
                          className={`p-3 rounded-2xl text-sm leading-relaxed ${
                            message.role === 'user'
                              ? 'bg-blue-600 text-white rounded-br-sm'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm'
                          }`}
                        >
                          <div className="whitespace-pre-wrap">{message.content}</div>

                          {/* Data Insights Card */}
                          {message.metadata?.dataPoints && (
                            <DataInsightCard dataPoints={message.metadata.dataPoints} />
                          )}

                          {/* Suggestions */}
                          {message.metadata?.suggestions && message.role === 'assistant' && (
                            <div className="mt-3 space-y-1">
                              <p className="text-xs font-medium opacity-70">Suggested follow-ups:</p>
                              <div className="flex flex-wrap gap-1">
                                {message.metadata.suggestions.map((suggestion, idx) => (
                                  <Button
                                    key={idx}
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleQuickAction(suggestion)}
                                    className="h-6 text-xs px-2 bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
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
                      </div>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="bg-green-100 text-green-600">
                          <Bot className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-2xl rounded-bl-sm">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div ref={messagesEndRef} />
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center space-x-2">
                <div className="flex-1 relative">
                  <Input
                    ref={inputRef}
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask about city data, trends, insights..."
                    disabled={isProcessing}
                    className="pr-10 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
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
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 h-10 px-4"
                >
                  {isProcessing ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  🤖 AI-powered • Real-time city insights
                </p>
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                  {currentPage ? `Viewing: ${currentPage}` : 'Dashboard'}
                </Badge>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default EnhancedChatBot;