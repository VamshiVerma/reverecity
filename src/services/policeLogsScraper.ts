// Police Logs Scraper - Discovers available PDFs from the news page
// This is more reliable than guessing date ranges since the schedule is irregular

export interface DiscoveredLog {
  startDate: Date;
  endDate: Date;
  pdfUrl: string;
  pageUrl: string;
  dateRangeStr: string; // e.g., "10-02-25 to 10-06-25"
}

export class PoliceLogsScraper {
  private static NEWS_PAGE = 'https://reverepolice.org/news/';

  /**
   * Scrape the news page to discover all available police log PDFs
   */
  static async discoverAvailableLogs(): Promise<DiscoveredLog[]> {
    console.log('🔍 Discovering available police logs from news page...');

    try {
      // Fetch the news page via jina to get clean markdown with links
      const jinaUrl = `https://r.jina.ai/${this.NEWS_PAGE}`;
      const response = await fetch(jinaUrl, {
        headers: { 'Accept': 'text/markdown' }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch news page: ${response.status}`);
      }

      const markdown = await response.text();

      // Extract all log links - pattern: https://reverepolice.org/YYYY/MM/public-log-redacted-...
      const linkRegex = /https:\/\/reverepolice\.org\/(\d{4})\/(\d{2})\/public-log-redacted-([\d\-am]+)-to-([\d\-am]+)\//g;
      const matches = [...markdown.matchAll(linkRegex)];

      const logs: DiscoveredLog[] = [];
      const seenUrls = new Set<string>(); // De-duplicate by PDF URL

      for (const match of matches) {
        const [fullUrl, year, month, startStr, endStr] = match;

        // Parse dates from the URL
        // Format: "10-02-25-7am" -> Date(2025, 10, 2)
        const startDate = this.parseLogDate(startStr);
        const endDate = this.parseLogDate(endStr);

        if (!startDate || !endDate) {
          console.warn(`⚠️  Could not parse dates: ${startStr} to ${endStr}`);
          continue;
        }

        // Build PDF URL
        const dateRangeStr = `${startStr}-to-${endStr}`;
        const pdfUrl = `https://reverepolice.org/wp-content/uploads/${year}/${month}/Public-Log-Redacted-${dateRangeStr}.pdf`;

        // Skip duplicates
        if (seenUrls.has(pdfUrl)) {
          continue;
        }
        seenUrls.add(pdfUrl);

        logs.push({
          startDate,
          endDate,
          pdfUrl,
          pageUrl: fullUrl,
          dateRangeStr: `${startStr} to ${endStr}`
        });
      }

      console.log(`✓ Discovered ${logs.length} police logs`);

      // Log the most recent ones
      if (logs.length > 0) {
        const recent = logs.slice(0, 3);
        console.log('📅 Most recent logs:');
        recent.forEach(log => {
          console.log(`   ${log.dateRangeStr} (${this.getDateRangeDays(log)} days)`);
        });
      }

      return logs;

    } catch (error) {
      console.error('❌ Error discovering logs:', error);
      return [];
    }
  }

  /**
   * Parse a date string from the log URL
   * Format: "10-02-25-7am" -> Date(2025, 10, 2)
   */
  private static parseLogDate(dateStr: string): Date | null {
    try {
      // Remove the "-7am" suffix if present
      const cleanStr = dateStr.replace(/-7am$/, '');

      // Split into parts: "10-02-25" -> ["10", "02", "25"]
      const parts = cleanStr.split('-');

      if (parts.length !== 3) return null;

      const month = parseInt(parts[0], 10);
      const day = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10) + 2000; // 25 -> 2025

      return new Date(year, month - 1, day); // month is 0-indexed in JS
    } catch (error) {
      return null;
    }
  }

  /**
   * Get the number of days covered by a log
   */
  private static getDateRangeDays(log: DiscoveredLog): number {
    const diffMs = log.endDate.getTime() - log.startDate.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Find the most recent log that hasn't been synced yet
   */
  static async findUnsyncedLogs(): Promise<DiscoveredLog[]> {
    const allLogs = await this.discoverAvailableLogs();

    if (allLogs.length === 0) return [];

    // Import supabase here to avoid circular dependency
    const { supabase } = await import('@/integrations/supabase/client');

    // Get all synced date ranges
    const { data: syncedLogs } = await supabase
      .from('police_logs_sync_status')
      .select('sync_date, status')
      .eq('status', 'success');

    const syncedDates = new Set(syncedLogs?.map(s => s.sync_date) || []);

    // Filter to logs that cover dates we haven't synced
    const unsynced = allLogs.filter(log => {
      const dateStr = log.startDate.toISOString().split('T')[0];
      return !syncedDates.has(dateStr);
    });

    console.log(`📊 Total: ${allLogs.length}, Already synced: ${allLogs.length - unsynced.length}, Unsynced: ${unsynced.length}`);

    return unsynced;
  }

  /**
   * Get the date range covered by a discovered log
   * Returns an array of all dates covered (useful for marking multiple days as synced)
   */
  static getDatesCovered(log: DiscoveredLog): Date[] {
    const dates: Date[] = [];
    const current = new Date(log.startDate);

    while (current < log.endDate) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }
}

export default PoliceLogsScraper;
