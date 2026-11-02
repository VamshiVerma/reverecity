/**
 * Police Logs Analytics Service
 * Calculates comprehensive insights from police log data
 */

import { supabase } from '@/integrations/supabase/client';

export interface AnalyticsData {
  hourlyDistribution: { hour: string; count: number }[];
  weeklyTrends: { week: string; calls: number; reports: number; incidents: number }[];
  monthlyTrends: { month: string; calls: number; avgPerDay: number }[];
  topLocations: { location: string; count: number; types: string[] }[];
  callTypeEvolution: { date: string; [key: string]: number }[];
  comparisons: {
    thisWeek: number;
    lastWeek: number;
    thisMonth: number;
    lastMonth: number;
    changePercent: number;
  };
}

export class PoliceLogsAnalyticsService {
  /**
   * Get comprehensive analytics for the dashboard
   */
  static async getComprehensiveAnalytics(): Promise<AnalyticsData> {
    const [
      hourly,
      weekly,
      monthly,
      locations,
      evolution,
      comparisons
    ] = await Promise.all([
      this.getHourlyDistribution(),
      this.getWeeklyTrends(),
      this.getMonthlyTrends(),
      this.getTopLocations(),
      this.getCallTypeEvolution(),
      this.getComparisons()
    ]);

    return {
      hourlyDistribution: hourly,
      weeklyTrends: weekly,
      monthlyTrends: monthly,
      topLocations: locations,
      callTypeEvolution: evolution,
      comparisons
    };
  }

  /**
   * Get 24-hour distribution - which hours are busiest
   */
  static async getHourlyDistribution() {
    // Get total count first
    const { count } = await supabase
      .from('police_logs')
      .select('*', { count: 'exact', head: true });

    // Fetch data in batches
    const batchSize = 1000;
    const allData: any[] = [];

    for (let offset = 0; offset < (count || 0); offset += batchSize) {
      const { data, error } = await supabase
        .from('police_logs')
        .select('time_24h')
        .range(offset, offset + batchSize - 1);

      if (error) {
        console.error('Error fetching batch:', error);
        break;
      }

      if (data) allData.push(...data);
    }

    const data = allData;

    if (!data || data.length === 0) {
      console.error('Error fetching hourly data: No data');
      return Array.from({ length: 24 }, (_, i) => ({
        hour: i.toString().padStart(2, '0'),
        count: 0
      }));
    }

    // Initialize 24 hours
    const hourCounts: { [key: string]: number } = {};
    for (let i = 0; i < 24; i++) {
      hourCounts[i.toString().padStart(2, '0')] = 0;
    }

    // Count calls per hour
    data.forEach(log => {
      if (log.time_24h) {
        const hour = log.time_24h.substring(0, 2);
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }
    });

    return Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));
  }

  /**
   * Get weekly trends for last 12 weeks
   */
  /**
   * Daily rollup computed in Postgres (the REST API caps row reads at 1000).
   */
  private static async daily(): Promise<{ log_date: string; calls: number; reports: number; incidents: number }[]> {
    const { data, error } = await supabase.rpc('police_daily' as any);
    if (error || !data) {
      console.error('Error fetching daily police rollup:', error);
      return [];
    }
    return data as any;
  }

  /**
   * Weekly trends: the 12 most recent weeks that have data.
   */
  static async getWeeklyTrends() {
    const days = await this.daily();
    const weekly: Record<string, { displayWeek: string; calls: number; reports: number; incidents: number }> = {};
    for (const d of days) {
      const date = new Date(d.log_date + 'T12:00:00');
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const key = weekStart.toISOString().split('T')[0];
      const w = (weekly[key] ||= {
        displayWeek: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        calls: 0, reports: 0, incidents: 0,
      });
      w.calls += Number(d.calls); w.reports += Number(d.reports); w.incidents += Number(d.incidents);
    }
    return Object.entries(weekly)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, w]) => ({ week: w.displayWeek, calls: w.calls, reports: w.reports, incidents: w.incidents }))
      .slice(-12);
  }

  /**
   * Monthly trends for the most recent year that has data.
   */
  static async getMonthlyTrends() {
    const days = await this.daily();
    if (!days.length) return [];
    const latestYear = Math.max(...days.map((d) => new Date(d.log_date + 'T12:00:00').getFullYear()));
    const monthly: Record<string, { displayMonth: string; days: number; calls: number }> = {};
    for (const d of days) {
      const date = new Date(d.log_date + 'T12:00:00');
      if (date.getFullYear() !== latestYear) continue;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const m = (monthly[key] ||= { displayMonth: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), days: 0, calls: 0 });
      m.calls += Number(d.calls); m.days += 1;
    }
    return Object.entries(monthly)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, m]) => ({ month: m.displayMonth, calls: m.calls, avgPerDay: Math.round(m.calls / m.days) }));
  }

  /**
   * Get top location hotspots
   */
  static async getTopLocations() {
    // Get total count first
    const { count } = await supabase
      .from('police_logs')
      .select('*', { count: 'exact', head: true });

    // Fetch data in batches
    const batchSize = 1000;
    const allData: any[] = [];

    for (let offset = 0; offset < (count || 0); offset += batchSize) {
      const { data, error } = await supabase
        .from('police_logs')
        .select('location_street, call_type_category')
        .not('location_street', 'is', null)
        .range(offset, offset + batchSize - 1);

      if (error) {
        console.error('Error fetching batch:', error);
        break;
      }

      if (data) allData.push(...data);
    }

    const data = allData;

    if (!data || data.length === 0) {
      console.error('Error fetching locations: No data');
      return [];
    }

    // Count by location
    const locationCounts: {
      [key: string]: { count: number; types: Set<string> }
    } = {};

    data.forEach(log => {
      const loc = log.location_street;
      if (!loc) return;

      if (!locationCounts[loc]) {
        locationCounts[loc] = { count: 0, types: new Set() };
      }

      locationCounts[loc].count++;
      if (log.call_type_category) {
        locationCounts[loc].types.add(log.call_type_category);
      }
    });

    return Object.entries(locationCounts)
      .map(([location, stats]) => ({
        location,
        count: stats.count,
        types: Array.from(stats.types)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20); // Top 20
  }

  /**
   * Get call type evolution over time (stacked area chart data)
   */
  static async getCallTypeEvolution() {
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
        .select('log_date, call_type_category')
        .order('log_date', { ascending: true })
        .range(offset, offset + batchSize - 1);

      if (error) {
        console.error('Error fetching batch:', error);
        break;
      }

      if (data) {
        allData.push(...data);
        console.log(`📦 Fetched batch ${Math.floor(offset / batchSize) + 1}: ${data.length} records`);
      }
    }

    console.log('📊 Call Type Evolution: Loaded', allData.length, 'records total');
    console.log('📅 Date range:', allData[0]?.log_date, 'to', allData[allData.length - 1]?.log_date);

    const data = allData;

    // Group by date and call type - keep original date for sorting
    const evolutionData: {
      [isoDate: string]: { displayDate: string; [type: string]: number }
    } = {};

    data.forEach(log => {
      const isoDate = log.log_date; // Keep ISO format for sorting
      const displayDate = new Date(log.log_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const type = log.call_type_category || 'OTHER';

      if (!evolutionData[isoDate]) {
        evolutionData[isoDate] = { displayDate };
      }

      evolutionData[isoDate][type] = (evolutionData[isoDate][type] || 0) + 1;
    });

    // Sort by ISO date, then convert to display format - show ALL data
    const chartData = Object.entries(evolutionData)
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB)) // Sort chronologically
      .map(([_, types]) => ({
        date: types.displayDate,
        TRAFFIC: types.TRAFFIC || 0,
        MEDICAL: types.MEDICAL || 0,
        DISTURBANCE: types.DISTURBANCE || 0,
        ASSIST_SERVICE: types.ASSIST_SERVICE || 0,
        DOMESTIC: types.DOMESTIC || 0,
        INVESTIGATION: types.INVESTIGATION || 0,
        OTHER: types.OTHER || 0
      }));

    console.log('📈 Evolution data points:', chartData.length);

    // Return all data (no slicing)
    return chartData;
  }

  /**
   * Get comparative stats (this week vs last week, etc.)
   */
  static async getComparisons() {
    // Anchor to the latest posted log, not today's date: RPD publishes logs in batches.
    const { data: latest } = await supabase.from('police_logs').select('log_date').order('log_date', { ascending: false }).limit(1);
    const now = latest?.[0]?.log_date ? new Date(latest[0].log_date + 'T23:59:59') : new Date();

    // This week (Sunday to today)
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - now.getDay());
    thisWeekStart.setHours(0, 0, 0, 0);

    // Last week
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(thisWeekStart);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);

    // This month
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Last month
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [thisWeekData, lastWeekData, thisMonthData, lastMonthData] = await Promise.all([
      this.getCountForRange(thisWeekStart, now),
      this.getCountForRange(lastWeekStart, lastWeekEnd),
      this.getCountForRange(thisMonthStart, now),
      this.getCountForRange(lastMonthStart, lastMonthEnd)
    ]);

    const changePercent = lastWeekData > 0
      ? ((thisWeekData - lastWeekData) / lastWeekData) * 100
      : 0;

    return {
      thisWeek: thisWeekData,
      lastWeek: lastWeekData,
      thisMonth: thisMonthData,
      lastMonth: lastMonthData,
      changePercent
    };
  }

  /**
   * Helper: Get count of logs for a date range
   */
  private static async getCountForRange(startDate: Date, endDate: Date): Promise<number> {
    const { count, error } = await supabase
      .from('police_logs')
      .select('*', { count: 'exact', head: true })
      .gte('log_date', startDate.toISOString().split('T')[0])
      .lte('log_date', endDate.toISOString().split('T')[0]);

    if (error) {
      console.error('Error getting count:', error);
      return 0;
    }

    return count || 0;
  }
}

export default PoliceLogsAnalyticsService;
