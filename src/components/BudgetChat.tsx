
import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, File, PieChart, BookOpen, Lightbulb } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChatMessage {
  type: 'user' | 'system';
  content: string;
  timestamp: Date;
}

interface BudgetInsight {
  uuid: string;
  category: string;
  amount: number;
  percentage_of_budget: number;
  year: number;
  description?: string;
  subcategory?: string;
  trend?: string;
  trend_percentage?: string;
  priority_level?: string;
  per_capita?: number;
  insight_text: string;
  source_page?: string;
}

const BudgetChat: React.FC = () => {
  const [question, setQuestion] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isPdfUploaded, setIsPdfUploaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      type: 'system',
      content: 'Welcome to the Budget Insights Assistant! Upload a budget PDF or ask questions about the city budget.',
      timestamp: new Date()
    }
  ]);
  const [insights, setInsights] = useState<BudgetInsight[]>([]);
  const [pdfPath, setPdfPath] = useState<string | null>(null);
  const { toast } = useToast();
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `budget-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;
      
      // Upload file to Supabase storage
      const { error: uploadError } = await supabase
        .storage
        .from('budget-docs')
        .upload(filePath, file);
        
      if (uploadError) {
        throw uploadError;
      }
      
      setPdfPath(filePath);
      setIsPdfUploaded(true);
      
      // Add message
      setMessages(prev => [...prev, {
        type: 'system',
        content: `File "${file.name}" uploaded successfully. You can now ask questions about the budget.`,
        timestamp: new Date()
      }]);
      
      // Process the PDF
      await processPdf(filePath);
      
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Upload Failed',
        description: 'There was an error uploading your file.',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  const processPdf = async (filePath: string) => {
    setIsProcessing(true);
    
    try {
      const response = await supabase.functions.invoke('process-budget-pdf', {
        body: { filePath }
      });
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      if (response.data.insights) {
        setInsights(response.data.insights);
      }
      
      // Add success message
      setMessages(prev => [...prev, {
        type: 'system',
        content: 'Budget document processed successfully. I can now answer questions about it.',
        timestamp: new Date()
      }]);
      
    } catch (error) {
      console.error('Error processing PDF:', error);
      toast({
        title: 'Processing Failed',
        description: 'There was an error analyzing the budget document.',
        variant: 'destructive'
      });
      
      setMessages(prev => [...prev, {
        type: 'system',
        content: 'I had trouble analyzing that document. Please try uploading a clearer PDF.',
        timestamp: new Date()
      }]);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const getRandomInsight = () => {
    if (insights.length === 0) {
      toast({
        title: 'No Insights Available',
        description: 'Please upload a budget document first.',
        variant: 'default'
      });
      return;
    }
    
    const randomIndex = Math.floor(Math.random() * insights.length);
    const insight = insights[randomIndex];
    const amountMillions = insight.amount ? (insight.amount / 1000000).toFixed(1) : 'N/A';
    
    const insightMessage = `${insight.category} receives $${amountMillions}M which is ${insight.percentage_of_budget}% of the total budget.`;
    
    setMessages(prev => [...prev, {
      type: 'system',
      content: insightMessage,
      timestamp: new Date()
    }]);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!question.trim()) return;
    
    // Add user question to chat
    setMessages(prev => [...prev, {
      type: 'user',
      content: question,
      timestamp: new Date()
    }]);
    
    if (!pdfPath) {
      setMessages(prev => [...prev, {
        type: 'system',
        content: 'Please upload a budget document first so I can answer your questions.',
        timestamp: new Date()
      }]);
      
      setQuestion('');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const response = await supabase.functions.invoke('process-budget-pdf', {
        body: { filePath: pdfPath, question }
      });
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      // Add answer to chat
      setMessages(prev => [...prev, {
        type: 'system',
        content: response.data.answer || "I couldn't find an answer to that question in the budget document.",
        timestamp: new Date()
      }]);
      
      // Update insights if new ones are available
      if (response.data.insights) {
        setInsights(response.data.insights);
      }
      
    } catch (error) {
      console.error('Error processing question:', error);
      
      setMessages(prev => [...prev, {
        type: 'system',
        content: "I'm sorry, I encountered an error while processing your question. Please try again.",
        timestamp: new Date()
      }]);
      
      toast({
        title: 'Error',
        description: 'Failed to process your question.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
      setQuestion('');
    }
  };
  
  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      <Card className="flex-1 mb-4 overflow-hidden flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-xl">
            <MessageSquare className="w-5 h-5 mr-2" />
            Budget Insights Chat
          </CardTitle>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-y-auto pb-2">
          <div className="space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    msg.type === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p>{msg.content}</p>
                  <p className="text-xs opacity-50 mt-1">
                    {msg.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
        
        <CardFooter className="pt-0">
          <form onSubmit={handleSubmit} className="flex w-full gap-2">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question about the budget..."
              disabled={isProcessing || (!isPdfUploaded && !pdfPath)}
              className="flex-1"
            />
            <Button 
              type="submit" 
              disabled={isProcessing || (!isPdfUploaded && !pdfPath) || !question.trim()}
            >
              Send
            </Button>
          </form>
        </CardFooter>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-lg">
              <File className="w-4 h-4 mr-2" />
              Upload Budget Document
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Input 
                type="file" 
                accept=".pdf"
                onChange={handleFileUpload}
                disabled={isUploading || isProcessing}
                className="max-w-sm"
              />
              <div className="ml-2">
                {isPdfUploaded ? (
                  <div className="text-sm text-green-500 flex items-center">
                    <span className="bg-green-500 w-2 h-2 rounded-full mr-2"></span>
                    Uploaded
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No file</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-lg">
              <Lightbulb className="w-4 h-4 mr-2" />
              Random Insight
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={getRandomInsight}
              disabled={insights.length === 0 || isProcessing}
              variant="outline"
              className="w-full"
            >
              Get Random Budget Insight
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BudgetChat;
