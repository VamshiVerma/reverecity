import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Shield,
  Search,
  RefreshCw,
  Calendar,
  TrendingUp,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import PoliceLogsService, { CallTypeBreakdown, DailyStats } from '@/services/policeLogsService';
import PoliceLogsAutoSync from '@/services/policeLogsAutoSync';
import PoliceLogsAnalyticsService, { AnalyticsData } from '@/services/policeLogsAnalytics';
import PoliceLogsAnalytics from '@/components/PoliceLogsAnalytics';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1', '#14b8a6', '#f97316'];

const PoliceLogsPage = () => {
  const { toast } = useToast();

  // State
  const [logs, setLogs] = useState<any[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCallType, setSelectedCallType] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(100);

  // Stats
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [callTypeBreakdown, setCallTypeBreakdown] = useState<CallTypeBreakdown[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadData();
    loadStats();
    loadAnalytics();

    // Start auto-sync
    PoliceLogsAutoSync.startAutoSync();

    return () => {
      PoliceLogsAutoSync.stopAutoSync();
    };
  }, []);

  // Filter logs when filters change
  useEffect(() => {
    filterLogs();
    setCurrentPage(1); // Reset to first page when filters change
  }, [logs, searchQuery, selectedCallType, selectedAction, selectedDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Get total count first
      const { count } = await supabase
        .from('police_logs')
        .select('*', { count: 'exact', head: true });

      console.log('📊 Total records in DB:', count);

      // Fetch data in batches to bypass 1000 row limit
      const batchSize = 1000;
      const allData: any[] = [];

      for (let offset = 0; offset < (count || 0); offset += batchSize) {
        const { data, error } = await supabase
          .from('police_logs')
          .select('*')
          .order('timestamp', { ascending: false })
          .range(offset, offset + batchSize - 1);

        if (error) {
          console.error('Error fetching batch:', error);
          throw error;
        }

        if (data) {
          allData.push(...data);
          console.log(`📦 Fetched batch ${Math.floor(offset / batchSize) + 1}: ${data.length} records`);
        }
      }

      console.log('📊 Loaded logs:', allData.length);
      console.log('📅 Latest log date:', allData[0]?.log_date);
      console.log('🕐 Latest timestamp:', allData[0]?.timestamp);

      setLogs(allData);
      setTotalLogs(allData.length);
    } catch (error) {
      console.error('Error loading logs:', error);
      toast({
        title: 'Error loading logs',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Get date range from actual data
      const { data: dateRange } = await supabase
        .from('police_logs')
        .select('log_date')
        .order('log_date', { ascending: true })
        .limit(1);

      const startDate = dateRange?.[0]?.log_date ? new Date(dateRange[0].log_date) : new Date('2025-09-01');
      const endDate = new Date();

      const [stats, breakdown] = await Promise.all([
        PoliceLogsService.getDailyStats(startDate, endDate),
        PoliceLogsService.getCallTypeBreakdown(startDate, endDate)
      ]);

      setDailyStats(stats);
      setCallTypeBreakdown(breakdown);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const data = await PoliceLogsAnalyticsService.getComprehensiveAnalytics();
      setAnalyticsData(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: 'Error loading analytics',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const filterLogs = () => {
    let filtered = [...logs];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(log =>
        log.call_reason?.toLowerCase().includes(query) ||
        log.location_address?.toLowerCase().includes(query) ||
        log.action?.toLowerCase().includes(query) ||
        log.call_number?.toLowerCase().includes(query)
      );
    }

    // Call type filter
    if (selectedCallType && selectedCallType !== 'all') {
      filtered = filtered.filter(log => log.call_type_category === selectedCallType);
    }

    // Action filter
    if (selectedAction && selectedAction !== 'all') {
      filtered = filtered.filter(log => log.action_category === selectedAction);
    }

    // Date filter
    if (selectedDate) {
      filtered = filtered.filter(log => log.log_date === selectedDate);
    }

    console.log('🔍 Filtered logs:', filtered.length);
    console.log('🔝 Top 3 dates:', filtered.slice(0, 3).map(l => ({ date: l.log_date, time: l.time_24h, call: l.call_number })));

    setFilteredLogs(filtered);
  };

  const handleManualSync = async () => {
    setSyncing(true);
    toast({
      title: '🔄 Syncing police logs...',
      description: 'Fetching latest data from Revere PD'
    });

    try {
      await PoliceLogsAutoSync.manualSync();
      await loadData();
      await loadStats();
      await loadAnalytics();

      toast({
        title: '✅ Sync complete!',
        description: 'Police logs have been updated'
      });
    } catch (error) {
      toast({
        title: '❌ Sync failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setSyncing(false);
    }
  };

  const getUniqueCallTypes = () => {
    const types = new Set(logs.map(log => log.call_type_category).filter(Boolean));
    return Array.from(types).sort();
  };

  const getUniqueActions = () => {
    const actions = new Set(logs.map(log => log.action_category).filter(Boolean));
    return Array.from(actions).sort();
  };

  const getUniqueDates = () => {
    const dates = new Set(logs.map(log => log.log_date).filter(Boolean));
    return Array.from(dates).sort().reverse();
  };

  const formatCallType = (type: string) => {
    return type.replace(/_/g, ' ').toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'ARREST': return 'destructive';
      case 'REPORT': return 'default';
      case 'SERVICES_RENDERED': return 'secondary';
      case 'NO_ACTION': return 'outline';
      case 'WARNING': return 'default';
      default: return 'secondary';
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredLogs.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  return (
    <DashboardLayout pageTitle="Police Logs">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-light-text flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              Active Police Logs
            </h1>
            <p className="text-muted-foreground mt-1">
              Real-time police activity logs from Revere Police Department
            </p>
          </div>
          <Button onClick={handleManualSync} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Logs (All Time)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalLogs.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Unique Call Types
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getUniqueCallTypes().length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Reports Filed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {logs.filter(l => l.action_category === 'REPORT').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Services Rendered
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {logs.filter(l => l.action_category === 'SERVICES_RENDERED').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Overview Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Call Type Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Call Type Distribution</CardTitle>
              <CardDescription>Top categories from current data</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={callTypeBreakdown.slice(0, 8)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ callTypeCategory, percentage }) =>
                      `${formatCallType(callTypeCategory)} (${percentage.toFixed(1)}%)`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {callTypeBreakdown.slice(0, 8).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Daily Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Activity Trend</CardTitle>
              <CardDescription>Calls per day (last 30 days)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyStats.slice(0, 30).reverse()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="log_date"
                    tickFormatter={(date) => new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(date) => new Date(date + 'T12:00:00').toLocaleDateString()}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="total_calls"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Total Calls"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Advanced Analytics Dashboard */}
        {loadingAnalytics ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Loading advanced analytics...</span>
          </div>
        ) : analyticsData ? (
          <PoliceLogsAnalytics data={analyticsData} />
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No analytics data available. Click "Sync Now" to load data.
            </CardContent>
          </Card>
        )}

        {/* Filters and Search */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Filter Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={selectedCallType} onValueChange={setSelectedCallType}>
                <SelectTrigger>
                  <SelectValue placeholder="All Call Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Call Types</SelectItem>
                  {getUniqueCallTypes().map(type => (
                    <SelectItem key={type} value={type}>
                      {formatCallType(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedAction} onValueChange={setSelectedAction}>
                <SelectTrigger>
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {getUniqueActions().map(action => (
                    <SelectItem key={action} value={action}>
                      {formatCallType(action)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedDate || 'all'} onValueChange={(val) => setSelectedDate(val === 'all' ? '' : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Dates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  {getUniqueDates().map(date => (
                    <SelectItem key={date} value={date}>
                      {new Date(date + 'T12:00:00').toLocaleDateString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(searchQuery || selectedCallType !== 'all' || selectedAction !== 'all' || selectedDate) && (
              <div className="mt-4 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Showing {filteredLogs.length} of {logs.length} logs
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCallType('all');
                    setSelectedAction('all');
                    setSelectedDate('');
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Logs Table - Always Visible Below Analytics */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              {filteredLogs.length} log entries
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Call #</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                        Loading logs...
                      </TableCell>
                    </TableRow>
                  ) : filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No logs found matching your filters
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-sm">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {log.time_24h}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {log.log_date ? new Date(log.log_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{log.call_number}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {formatCallType(log.call_type_category || 'OTHER')}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-sm">
                          {log.call_reason}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-sm">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <span>{log.location_address || 'N/A'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getActionBadgeColor(log.action_category)} className="text-xs">
                            {formatCallType(log.action_category || 'OTHER')}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls */}
            {filteredLogs.length > pageSize && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredLogs.length)} of {filteredLogs.length} records
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    First
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    Last
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default PoliceLogsPage;
