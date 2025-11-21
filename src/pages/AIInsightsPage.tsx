import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fetchInsights, Insight } from "@/services/insightsService";
import { ArrowUpRight, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const AIInsightsPage = () => {
  const [visibleCount, setVisibleCount] = useState(12);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null);
  const { data: insights, isLoading, error } = useQuery({
    queryKey: ["insights"],
    queryFn: fetchInsights
  });

  // Filter out electricity and environment categories
  const filteredCategories = insights 
    ? Array.from(new Set(insights
        .map(i => i.category)
        .filter(cat => cat && cat.toLowerCase() !== "electricity" && cat.toLowerCase() !== "environment") as string[]))
        .sort()
    : [];
  
  // Only show filtered insights based on activeFilter
  const filteredInsights = insights
    ? activeFilter 
      ? insights.filter(insight => 
          insight.category?.toLowerCase() === activeFilter.toLowerCase() &&
          insight.category?.toLowerCase() !== "electricity" && 
          insight.category?.toLowerCase() !== "environment")
      : insights.filter(insight => 
          insight.category?.toLowerCase() !== "electricity" && 
          insight.category?.toLowerCase() !== "environment")
    : [];

  const visibleInsights = filteredInsights.slice(0, visibleCount);

  // Enhanced badge color system with improved contrast for better visibility
  const getBadgeColor = (category: string | null, isActive: boolean = false) => {
    const categories: Record<string, string> = {
      'revenue': isActive 
        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' 
        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800/50',
      
      'expense': isActive 
        ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800' 
        : 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:hover:bg-rose-900/30 border-rose-200 dark:border-rose-800/50',
      
      'budget': isActive 
        ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800' 
        : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:hover:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800/50',
      
      'housing': isActive 
        ? 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400 border-violet-200 dark:border-violet-800' 
        : 'bg-violet-50 text-violet-700 hover:bg-violet-100 dark:bg-violet-900/20 dark:text-violet-400 dark:hover:bg-violet-900/30 border-violet-200 dark:border-violet-800/50',
      
      'health': isActive 
        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800' 
        : 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/30 border-amber-200 dark:border-amber-800/50',
      
      'education': isActive 
        ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400 border-sky-200 dark:border-sky-800' 
        : 'bg-sky-50 text-sky-700 hover:bg-sky-100 dark:bg-sky-900/20 dark:text-sky-400 dark:hover:bg-sky-900/30 border-sky-200 dark:border-sky-800/50',
      
      'transportation': isActive 
        ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400 border-teal-200 dark:border-teal-800' 
        : 'bg-teal-50 text-teal-700 hover:bg-teal-100 dark:bg-teal-900/20 dark:text-teal-400 dark:hover:bg-teal-900/30 border-teal-200 dark:border-teal-800/50',
      
      'public safety': isActive 
        ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800' 
        : 'bg-orange-50 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:hover:bg-orange-900/30 border-orange-200 dark:border-orange-800/50',
      
      'community': isActive 
        ? 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-400 border-fuchsia-200 dark:border-fuchsia-800' 
        : 'bg-fuchsia-50 text-fuchsia-700 hover:bg-fuchsia-100 dark:bg-fuchsia-900/20 dark:text-fuchsia-400 dark:hover:bg-fuchsia-900/30 border-fuchsia-200 dark:border-fuchsia-800/50',
    };

    return isActive 
      ? categories[category?.toLowerCase() || ''] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700' 
      : categories[category?.toLowerCase() || ''] || 'bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-gray-800/70 dark:text-gray-300 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700/50';
  };

  // Format large numbers for better readability
  const formatAmount = (amount: number | null) => {
    if (amount === null) return '-';
    
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount.toLocaleString()}`;
  };

  return (
    <DashboardLayout pageTitle="AI Insights">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gradient mb-2">AI Insights</h1>
        <p className="text-gray-400 mb-6">
          Advanced AI-driven insights and findings from the city's financial data and statistics
        </p>
        
        {/* Updated categories display - showing all categories in a more visible layout */}
        <div className="mb-6 border border-gray-200 dark:border-gray-800 rounded-lg p-3">
          <div className="flex flex-wrap gap-2">
            <Badge 
              onClick={() => setActiveFilter(null)}
              className={cn(
                "px-3 py-1.5 cursor-pointer transition-all hover:opacity-80 font-medium",
                !activeFilter 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              All
            </Badge>
            
            {filteredCategories.map(category => (
              <Badge
                key={category}
                onClick={() => setActiveFilter(category === activeFilter ? null : category)}
                className={cn(
                  "px-3 py-1.5 cursor-pointer transition-all hover:opacity-80 whitespace-nowrap font-medium",
                  activeFilter === category ? getBadgeColor(category, true) : getBadgeColor(category, false)
                )}
              >
                {category}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse border border-gray-200 dark:border-gray-800">
              <CardHeader className="pb-2">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="border-red-300 bg-red-50 dark:bg-red-900/10">
          <CardHeader>
            <CardTitle className="flex items-center text-red-700 dark:text-red-300">
              <FileText className="h-5 w-5 mr-2" />
              Error Loading Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>There was an error loading insights. Error details: {error instanceof Error ? error.message : 'Unknown error'}</p>
          </CardContent>
        </Card>
      ) : !insights || insights.length === 0 ? (
        <Card className="border-blue-300 bg-blue-50 dark:bg-blue-900/10">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-700 dark:text-blue-300">
              <FileText className="h-5 w-5 mr-2" />
              No Insights Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>No insights were found in the database. This could be because the table is empty or there's a connection issue.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleInsights.map((insight) => (
              <Card 
                key={insight.uuid}
                className="hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-200 dark:border-gray-800 hover:border-primary/30 dark:hover:border-primary/30 hover:translate-y-[-2px]"
              >
                <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50/80 to-white/80 dark:from-gray-900/80 dark:to-gray-850/80">
                  <div className="flex justify-between items-start">
                    <Badge className={cn("rounded-md font-medium border", getBadgeColor(insight.category, true))}>
                      {insight.category || 'Uncategorized'}
                    </Badge>
                    {insight.priority_level && (
                      <Badge variant="outline" className={cn(
                        "ml-2 rounded-md",
                        insight.priority_level === 'high' ? "text-red-500 border-red-200 dark:border-red-800" :
                        insight.priority_level === 'medium' ? "text-yellow-500 border-yellow-200 dark:border-yellow-800" :
                        "text-blue-500 border-blue-200 dark:border-blue-800"
                      )}>
                        {insight.priority_level}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg mt-2 line-clamp-2">
                    {insight.subcategory || insight.description || 'Insight'}
                  </CardTitle>
                  {insight.year && (
                    <CardDescription className="text-sm">
                      Fiscal Year {insight.year}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="pt-4">
                  <p className="text-gray-700 dark:text-gray-300 line-clamp-4 min-h-[4.5rem]">
                    {insight.insight_text}
                  </p>
                  
                  {(insight.amount !== null || insight.percentage_of_budget !== null || insight.per_capita !== null) && (
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      {insight.amount !== null && (
                        <div className="flex flex-col p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                          <span className="text-gray-500 dark:text-gray-400 text-xs">Amount</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatAmount(insight.amount)}</span>
                        </div>
                      )}
                      {insight.percentage_of_budget !== null && (
                        <div className="flex flex-col p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                          <span className="text-gray-500 dark:text-gray-400 text-xs">% of Budget</span>
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400">{insight.percentage_of_budget}%</span>
                        </div>
                      )}
                      {insight.per_capita !== null && (
                        <div className="flex flex-col p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                          <span className="text-gray-500 dark:text-gray-400 text-xs">Per Capita</span>
                          <span className="font-semibold text-blue-600 dark:text-blue-400">{formatAmount(insight.per_capita)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>

                <CardFooter className="pt-3 pb-3 flex justify-between items-center border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                  {insight.source_page && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Source: {insight.source_page}
                    </span>
                  )}
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-xs ml-auto hover:bg-gray-100 dark:hover:bg-gray-800 gap-1"
                    onClick={() => setSelectedInsight(insight)}
                  >
                    <ArrowUpRight className="h-3 w-3" />
                    Details
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
          
          {filteredInsights.length > visibleCount && (
            <div className="flex justify-center mt-8">
              <Button 
                onClick={() => setVisibleCount(prev => prev + 12)}
                variant="outline"
                className="border-dashed"
              >
                Load More Insights
              </Button>
            </div>
          )}
        </>
      )}

      {/* Details Dialog */}
      <Dialog open={!!selectedInsight} onOpenChange={(open) => !open && setSelectedInsight(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          {selectedInsight && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-2 mb-2">
                  <Badge className={cn("rounded-md font-medium border", getBadgeColor(selectedInsight.category, true))}>
                    {selectedInsight.category || 'Uncategorized'}
                  </Badge>
                  {selectedInsight.priority_level && (
                    <Badge variant="outline" className={cn(
                      "rounded-md",
                      selectedInsight.priority_level === 'high' ? "text-red-500 border-red-200 dark:border-red-800" :
                      selectedInsight.priority_level === 'medium' ? "text-yellow-500 border-yellow-200 dark:border-yellow-800" :
                      "text-blue-500 border-blue-200 dark:border-blue-800"
                    )}>
                      {selectedInsight.priority_level}
                    </Badge>
                  )}
                </div>
                <DialogTitle className="text-xl">
                  {selectedInsight.subcategory || selectedInsight.description || 'Budget Insight'}
                </DialogTitle>
                {selectedInsight.year && (
                  <DialogDescription>
                    Fiscal Year {selectedInsight.year}
                  </DialogDescription>
                )}
              </DialogHeader>
              
              <div className="space-y-4 mt-2">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Insight Details</h3>
                  <p className="text-sm">{selectedInsight.insight_text}</p>
                </div>
                
                {(selectedInsight.amount !== null || selectedInsight.percentage_of_budget !== null || selectedInsight.per_capita !== null) && (
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    {selectedInsight.amount !== null && (
                      <div className="flex flex-col p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                        <span className="text-gray-500 dark:text-gray-400 text-xs">Amount</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatAmount(selectedInsight.amount)}</span>
                      </div>
                    )}
                    {selectedInsight.percentage_of_budget !== null && (
                      <div className="flex flex-col p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                        <span className="text-gray-500 dark:text-gray-400 text-xs">% of Budget</span>
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">{selectedInsight.percentage_of_budget}%</span>
                      </div>
                    )}
                    {selectedInsight.per_capita !== null && (
                      <div className="flex flex-col p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                        <span className="text-gray-500 dark:text-gray-400 text-xs">Per Capita</span>
                        <span className="font-semibold text-blue-600 dark:text-blue-400">{formatAmount(selectedInsight.per_capita)}</span>
                      </div>
                    )}
                  </div>
                )}
                
                {selectedInsight.source_page && (
                  <div className="pt-2 mt-4 border-t border-gray-200 dark:border-gray-800">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Source: {selectedInsight.source_page}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AIInsightsPage;
