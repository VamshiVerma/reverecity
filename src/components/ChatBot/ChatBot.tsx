import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Mic, MicOff, Send, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  type?: 'text' | 'voice';
}

interface ChatBotProps {
  className?: string;
}

const CITY_CONTEXT = {
  name: "Revere, Massachusetts",
  population: "54,755",
  mayor: "Patrick M. Keefe Jr.",
  departments: ["Budget", "Housing", "Transportation", "Public Health", "Education", "Public Safety"],
  services: ["Weather monitoring", "Revenue tracking", "Demographics analysis", "Economic insights"]
};

const ChatBot: React.FC<ChatBotProps> = ({ className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: `Hello! I'm your AI assistant for the City of Revere dashboard. I can help you with:

• City data insights and analytics
• Budget and revenue information
• Housing and transportation updates
• Weather and public health data
• Educational statistics
• Crime and safety information

How can I assist you today?`,
      role: 'assistant',
      timestamp: new Date(),
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

  const generateAIResponse = async (userMessage: string): Promise<string> => {
    // Simulate AI processing with contextual responses
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    const lowerMessage = userMessage.toLowerCase();

    // City-specific responses
    if (lowerMessage.includes('budget') || lowerMessage.includes('money') || lowerMessage.includes('revenue')) {
      return `Based on the latest budget data for ${CITY_CONTEXT.name}, I can provide insights into municipal finances, revenue streams, and expenditure analysis. The city's budget information shows various funding sources and allocations across departments. Would you like me to focus on a specific budget category or time period?`;
    }

    if (lowerMessage.includes('housing') || lowerMessage.includes('homes') || lowerMessage.includes('property')) {
      return `Revere's housing market shows interesting trends. The city has been working on affordable housing initiatives and tracking property values. Current data indicates active development in several neighborhoods. I can provide specific housing statistics, permit data, or affordability metrics. What aspect of housing would you like to explore?`;
    }

    if (lowerMessage.includes('crime') || lowerMessage.includes('safety') || lowerMessage.includes('police')) {
      return `Public safety is a priority for Revere. Recent crime statistics show trends across different categories and neighborhoods. The police department maintains detailed records of incidents, response times, and community safety initiatives. Would you like to see specific crime data or safety program information?`;
    }

    if (lowerMessage.includes('weather') || lowerMessage.includes('climate') || lowerMessage.includes('temperature')) {
      return `Revere's weather monitoring system tracks temperature, precipitation, air quality, and severe weather alerts. The coastal location influences weather patterns significantly. I can provide current conditions, historical data, or climate trends. What weather information would you like to see?`;
    }

    if (lowerMessage.includes('education') || lowerMessage.includes('school') || lowerMessage.includes('students')) {
      return `Revere Public Schools serve over 8,000 students across multiple schools. The district focuses on academic achievement, special programs, and student support services. Recent data shows graduation rates, test scores, and enrollment trends. Would you like specific educational metrics or program information?`;
    }

    if (lowerMessage.includes('transportation') || lowerMessage.includes('mbta') || lowerMessage.includes('traffic')) {
      return `Transportation in Revere includes MBTA Blue Line service, bus routes, and major roadways. The city tracks traffic patterns, public transit usage, and infrastructure improvements. Current data shows commuting trends and transportation accessibility. What transportation information interests you?`;
    }

    if (lowerMessage.includes('demographics') || lowerMessage.includes('population') || lowerMessage.includes('residents')) {
      return `Revere has a diverse population of approximately ${CITY_CONTEXT.population} residents. The city tracks demographic trends including age distribution, ethnicity, income levels, and household composition. Recent census data shows population growth and changing demographics. Would you like specific demographic breakdowns?`;
    }

    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('help')) {
      return `Hello! I'm here to help you navigate Revere's city data and insights. You can ask me about any aspect of city operations, from budget and housing to education and public safety. I have access to real-time data and can provide detailed analysis. What would you like to know about ${CITY_CONTEXT.name}?`;
    }

    // Default intelligent response
    return `I understand you're asking about "${userMessage}". As Revere's AI assistant, I can help you explore various city data points and analytics. Our dashboard contains comprehensive information about budget, housing, crime, education, transportation, weather, and demographics. Could you be more specific about what aspect of city data you'd like to explore? I'm here to provide insights and help you understand Revere's municipal information.`;
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: currentMessage,
      role: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsProcessing(true);
    setIsTyping(true);

    try {
      const response = await generateAIResponse(currentMessage);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response,
        role: 'assistant',
        timestamp: new Date(),
        type: 'text'
      };

      setMessages(prev => [...prev, assistantMessage]);
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

  const toggleVoice = () => {
    if ('webkitSpeechRecognition' in window) {
      setIsListening(!isListening);
      if (!isListening) {
        toast({
          title: "Voice Recognition",
          description: "Voice input started. Speak now...",
        });
      } else {
        toast({
          title: "Voice Recognition",
          description: "Voice input stopped.",
        });
      }
    } else {
      toast({
        title: "Not Supported",
        description: "Voice recognition is not supported in your browser.",
        variant: "destructive"
      });
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) {
    return (
      <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="rounded-full h-14 w-14 shadow-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
        <Badge className="absolute -top-2 -left-2 bg-green-500 text-white">
          AI
        </Badge>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 w-96 h-[500px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-blue-600 text-white rounded-t-lg">
          <div className="flex items-center space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-blue-500">
                <Bot className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-sm">Revere AI Assistant</h3>
              <p className="text-xs opacity-90">City Data & Insights</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="text-white hover:bg-blue-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start space-x-2 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <Avatar className="h-6 w-6 flex-shrink-0">
                    <AvatarFallback className={message.role === 'user' ? 'bg-blue-100' : 'bg-green-100'}>
                      {message.role === 'user' ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={`p-3 rounded-lg text-sm ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p className={`text-xs mt-1 opacity-70`}>
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="flex items-center space-x-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="bg-green-100">
                      <Bot className="h-3 w-3" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div ref={messagesEndRef} />
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about city data, budget, housing..."
                disabled={isProcessing}
                className="pr-10"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleVoice}
                className={`absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 ${isListening ? 'text-red-500' : 'text-gray-500'}`}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!currentMessage.trim() || isProcessing}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
            AI-powered insights for Revere city data
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatBot;