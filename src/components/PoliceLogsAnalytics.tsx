import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, Cell, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, Calendar, Clock, MapPin, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AnalyticsData {
  hourlyDistribution: { hour: string; count: number }[];
  weeklyTrends: { week: string; calls: number; reports: number; incidents: number }[];
  monthlyTrends: { month: string; calls: number; avgPerDay: number }[];
  topLocations: { location: string; count: number; types: string[] }[];
  callTypeEvolution: { date: string; [key: string]: any }[];
  comparisons: {
    thisWeek: number;
    lastWeek: number;
    thisMonth: number;
    lastMonth: number;
    changePercent: number;
  };
}

interface Props {
  data: AnalyticsData;
}

const PoliceLogsAnalytics = ({ data }: Props) => {
  const HOUR_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

  const formatPercent = (value: number) => {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Comparative Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              This Week vs Last Week
              {data.comparisons.changePercent > 0 ? (
                <TrendingUp className="h-4 w-4 text-red-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-green-500" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.comparisons.thisWeek}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={data.comparisons.changePercent > 0 ? 'destructive' : 'secondary'} className="text-xs">
                {formatPercent(data.comparisons.changePercent)}
              </Badge>
              <span className="text-xs text-muted-foreground">vs {data.comparisons.lastWeek} last week</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Month to Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.comparisons.thisMonth}</div>
            <div className="text-xs text-muted-foreground mt-1">
              vs {data.comparisons.lastMonth} last month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Peak Hour
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.hourlyDistribution.reduce((max, hour) => hour.count > max.count ? hour : max, data.hourlyDistribution[0])?.hour || 'N/A'}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Most active time of day
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Top Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold truncate">{data.topLocations[0]?.location || 'N/A'}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {data.topLocations[0]?.count || 0} incidents
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hourly Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            24-Hour Activity Heatmap
          </CardTitle>
          <CardDescription>Call distribution by hour of day</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.hourlyDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="hour"
                label={{ value: 'Hour of Day', position: 'insideBottom', offset: -5 }}
              />
              <YAxis label={{ value: 'Number of Calls', angle: -90, position: 'insideLeft' }} />
              <Tooltip
                formatter={(value: number) => [`${value} calls`, 'Count']}
                labelFormatter={(hour) => `${hour}:00`}
              />
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                {data.hourlyDistribution.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.count > 20 ? '#ef4444' :
                      entry.count > 15 ? '#f59e0b' :
                      entry.count > 10 ? '#10b981' :
                      '#3b82f6'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-4 mt-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-[#3b82f6] rounded"></div>
              <span>Low (≤10)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-[#10b981] rounded"></div>
              <span>Medium (11-15)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-[#f59e0b] rounded"></div>
              <span>High (16-20)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-[#ef4444] rounded"></div>
              <span>Very High (&gt;20)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly & Monthly Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Weekly Trends (Last 12 Weeks)
            </CardTitle>
            <CardDescription>Calls, reports, and incidents over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.weeklyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="calls"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Total Calls"
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="reports"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name="Reports Filed"
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="incidents"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  name="Major Incidents"
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Monthly Overview (2025)
            </CardTitle>
            <CardDescription>Monthly activity and daily averages</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="calls"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.3}
                  name="Total Calls"
                />
                <Area
                  type="monotone"
                  dataKey="avgPerDay"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.3}
                  name="Avg Per Day"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Location Hotspots */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location Hotspots (Top 15)
          </CardTitle>
          <CardDescription>Streets and areas with most police activity</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data.topLocations.slice(0, 15)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis
                type="category"
                dataKey="location"
                width={200}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload[0]) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-card border border-border p-3 rounded-lg shadow-lg">
                        <p className="font-semibold text-sm mb-1">{data.location}</p>
                        <p className="text-xs text-muted-foreground">
                          {data.count} incidents
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {data.types.slice(0, 3).map((type: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="count" fill="#ec4899" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Call Type Evolution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Call Type Evolution
          </CardTitle>
          <CardDescription>How different call types trend over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={data.callTypeEvolution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="TRAFFIC"
                stackId="1"
                stroke="#3b82f6"
                fill="#3b82f6"
                name="Traffic"
              />
              <Area
                type="monotone"
                dataKey="MEDICAL"
                stackId="1"
                stroke="#ef4444"
                fill="#ef4444"
                name="Medical"
              />
              <Area
                type="monotone"
                dataKey="DISTURBANCE"
                stackId="1"
                stroke="#f59e0b"
                fill="#f59e0b"
                name="Disturbance"
              />
              <Area
                type="monotone"
                dataKey="ASSIST_SERVICE"
                stackId="1"
                stroke="#10b981"
                fill="#10b981"
                name="Assist/Service"
              />
              <Area
                type="monotone"
                dataKey="OTHER"
                stackId="1"
                stroke="#6366f1"
                fill="#6366f1"
                name="Other"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default PoliceLogsAnalytics;
