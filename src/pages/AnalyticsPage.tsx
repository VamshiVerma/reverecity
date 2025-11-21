
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getVisitorStats, getRecentVisitors, getPageViewCounts } from '@/services/visitorTrackingService';
import LineChart from '@/components/charts/LineChart';
import { PieChart, Users, Clock, MousePointerClick, ArrowUpRight, Globe, Smartphone, Monitor } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from 'date-fns';
import { Skeleton } from "@/components/ui/skeleton";

// Define types for our data
interface VisitorStat {
  visit_date: string;
  visitor_count: number;
}

interface PageView {
  page_path: string;
  count: number;
}

interface VisitorInfo {
  id: string;
  visit_timestamp: string;
  page_path: string;
  device_type: string;
  browser: string;
  referrer: string | null;
  [key: string]: any; // For other properties
}

const AnalyticsPage = () => {
  const [visitorStats, setVisitorStats] = useState<VisitorStat[]>([]);
  const [recentVisitors, setRecentVisitors] = useState<VisitorInfo[]>([]);
  const [pageViews, setPageViews] = useState<PageView[]>([]);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [loading, setLoading] = useState({
    stats: true,
    visitors: true,
    pages: true
  });
  
  useEffect(() => {
    const loadData = async () => {
      // Fetch visitor stats for the past 30 days
      const stats = await getVisitorStats(30);
      setVisitorStats(stats as VisitorStat[]);
      setLoading(prev => ({ ...prev, stats: false }));
      
      // Fetch recent visitors
      const visitors = await getRecentVisitors(100);
      setRecentVisitors(visitors as VisitorInfo[]);
      setLoading(prev => ({ ...prev, visitors: false }));
      
      // Fetch page view counts
      const pages = await getPageViewCounts();
      setPageViews(pages as PageView[]);
      setLoading(prev => ({ ...prev, pages: false }));
    };
    
    loadData();
  }, []);
  
  // Prepare chart data
  const chartData = visitorStats.map(day => ({
    name: format(new Date(day.visit_date), 'MMM d'),
    value: day.visitor_count
  })).reverse();
  
  // Calculate total visitors, pageviews, etc.
  const totalVisitors = visitorStats.reduce((sum, day) => sum + Number(day.visitor_count), 0);
  const totalPageViews = recentVisitors.length;
  const uniquePages = new Set(recentVisitors.map(v => v.page_path)).size;
  
  // Calculate device distribution
  const deviceCounts = recentVisitors.reduce((acc: Record<string, number>, visitor) => {
    const deviceType = visitor.device_type || 'unknown';
    acc[deviceType] = (acc[deviceType] || 0) + 1;
    return acc;
  }, {});
  
  // Get browser distribution
  const browserCounts = recentVisitors.reduce((acc: Record<string, number>, visitor) => {
    const browserName = (visitor.browser || 'unknown').split(' ')[0];
    acc[browserName] = (acc[browserName] || 0) + 1;
    return acc;
  }, {});

  return (
    <DashboardLayout pageTitle="Visitor Analytics">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Total Visitors</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {loading.stats ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{totalVisitors.toLocaleString()}</div>
            )}
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Page Views</CardTitle>
              <MousePointerClick className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {loading.visitors ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{totalPageViews.toLocaleString()}</div>
            )}
            <p className="text-xs text-muted-foreground">Total recorded</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Unique Pages</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {loading.pages ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{uniquePages}</div>
            )}
            <p className="text-xs text-muted-foreground">Different pages visited</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Mobile Users</CardTitle>
              <Smartphone className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {loading.visitors ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">
                {deviceCounts.mobile && totalPageViews > 0 ? 
                  `${Math.round((deviceCounts.mobile / totalPageViews) * 100)}%` : '0%'}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Of total visits</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="visitors">Visitor Log</TabsTrigger>
          <TabsTrigger value="pages">Pages</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Visitor Trends</CardTitle>
              <CardDescription>Daily visitor count over the past 30 days</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {loading.stats ? (
                <div className="w-full h-full flex items-center justify-center">
                  <Skeleton className="h-64 w-full" />
                </div>
              ) : (
                <LineChart 
                  data={chartData}
                  height={300}
                />
              )}
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Pages</CardTitle>
                <CardDescription>Most frequently visited pages</CardDescription>
              </CardHeader>
              <CardContent>
                {loading.pages ? (
                  <div className="space-y-2">
                    {Array.from({length: 5}).map((_, i) => (
                      <Skeleton key={i} className="h-6 w-full" />
                    ))}
                  </div>
                ) : (
                  <ScrollArea className="h-72">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Page</TableHead>
                          <TableHead className="text-right">Views</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pageViews.slice(0, 10).map((page, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium truncate" style={{maxWidth: "200px"}}>
                              {page.page_path || '/'}
                            </TableCell>
                            <TableCell className="text-right">{page.count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Device & Browser Data</CardTitle>
                <CardDescription>How visitors are accessing the site</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {loading.visitors ? (
                  <div className="space-y-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                ) : (
                  <>
                    <div>
                      <h4 className="text-sm font-medium mb-2">Device Types</h4>
                      <div className="space-y-2">
                        {Object.entries(deviceCounts).map(([device, count]) => (
                          <div key={device} className="flex items-center justify-between">
                            <div className="flex items-center">
                              {device === 'mobile' ? (
                                <Smartphone className="h-4 w-4 mr-2 text-primary" />
                              ) : device === 'tablet' ? (
                                <PieChart className="h-4 w-4 mr-2 text-amber-500" />
                              ) : (
                                <Monitor className="h-4 w-4 mr-2 text-emerald-500" />
                              )}
                              <span className="text-sm capitalize">{device}</span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {count} ({totalPageViews > 0 ? Math.round((Number(count) / totalPageViews) * 100) : 0}%)
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-2">Top Browsers</h4>
                      <div className="space-y-2">
                        {Object.entries(browserCounts)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 5)
                          .map(([browser, count]) => (
                            <div key={browser} className="flex items-center justify-between">
                              <span className="text-sm">{browser}</span>
                              <div className="text-sm text-muted-foreground">
                                {count} ({totalPageViews > 0 ? Math.round((Number(count) / totalPageViews) * 100) : 0}%)
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="visitors">
          <Card>
            <CardHeader>
              <CardTitle>Recent Visitor Log</CardTitle>
              <CardDescription>List of recent site visitors</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Page</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>Browser</TableHead>
                      <TableHead>Referrer</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading.visitors ? (
                      Array.from({length: 10}).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                        </TableRow>
                      ))
                    ) : (
                      recentVisitors.map((visitor, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            {format(new Date(visitor.visit_timestamp), 'MMM d, h:mm a')}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {visitor.page_path}
                          </TableCell>
                          <TableCell>
                            <span className="capitalize">{visitor.device_type || 'Unknown'}</span>
                          </TableCell>
                          <TableCell>
                            {(visitor.browser || '').split(' ')[0]}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {visitor.referrer || '-'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="pages">
          <Card>
            <CardHeader>
              <CardTitle>Page Analytics</CardTitle>
              <CardDescription>Detailed views for each page</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Page Path</TableHead>
                      <TableHead className="text-right">Views</TableHead>
                      <TableHead className="text-right">% of Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading.pages ? (
                      Array.from({length: 10}).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-60" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        </TableRow>
                      ))
                    ) : (
                      pageViews.map((page, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">
                            {page.page_path}
                          </TableCell>
                          <TableCell className="text-right">
                            {page.count}
                          </TableCell>
                          <TableCell className="text-right">
                            {totalPageViews > 0 ? `${Math.round((Number(page.count) / totalPageViews) * 100)}%` : '0%'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default AnalyticsPage;
