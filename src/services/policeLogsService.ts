// Police Logs Service - Fetches and parses Revere Police Department daily logs
import { supabase } from '@/integrations/supabase/client';

export interface PoliceLogEntry {
  callNumber: string;
  logDate: Date;
  time24h: string;
  timestamp: Date;
  callReason: string;
  callTypeCategory: string;
  action: string;
  actionCategory: string;
  locationCode: string | null;
  locationAddress: string | null;
  locationStreet: string | null;
  rawEntry: string;
  sourceUrl: string;
}

export interface DailyStats {
  logDate: string;
  totalCalls: number;
  uniqueCallTypes: number;
  uniqueLocations: number;
  reportsFiled: number;
  servicesRendered: number;
  noActionRequired: number;
}

export interface CallTypeBreakdown {
  callTypeCategory: string;
  count: number;
  percentage: number;
}

export class PoliceLogsService {
  /**
   * Build PDF URL based on date (handles weekday vs weekend logic)
   * Friday logs often cover Fri-Sun, Monday logs cover Mon only
   */
  static buildPDFUrl(date: Date): string | null {
    // Create a clean date object to avoid timezone issues
    const cleanDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const year = cleanDate.getFullYear();
    const dayOfWeek = cleanDate.getDay(); // 0=Sunday, 5=Friday, 6=Saturday

    // Saturday and Sunday don't have their own files - they're covered by Friday's file
    // Return null to indicate no file exists for this date
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return null;
    }

    // Determine the date range for the log file
    // Log for Sept 29 = file "09-29-7am-to-09-30-7am.pdf"
    let startDate = new Date(cleanDate);
    let endDate = new Date(cleanDate);
    endDate.setDate(endDate.getDate() + 1);

    // Special handling for Friday
    // Friday logs cover Fri-Mon (3 days)
    if (dayOfWeek === 5) {
      endDate.setDate(endDate.getDate() + 2); // Fri to Mon
    }

    const formatDate = (d: Date) => {
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const y = String(d.getFullYear()).slice(-2);
      return `${m}-${day}-${y}`;
    };

    const startStr = formatDate(startDate);
    const endStr = formatDate(endDate);

    // Determine which month folder to use (based on start date)
    const folderMonth = String(startDate.getMonth() + 1).padStart(2, '0');

    const filename = `Public-Log-Redacted-${startStr}-7am-to-${endStr}-7am.pdf`;
    const baseUrl = `https://reverepolice.org/wp-content/uploads/${year}/${folderMonth}`;

    return `${baseUrl}/${filename}`;
  }

  /**
   * Fetch police log PDF via r.jina.ai and return markdown
   */
  static async fetchLogMarkdown(date: Date): Promise<string> {
    const pdfUrl = this.buildPDFUrl(date);
    const jinaUrl = `https://r.jina.ai/${pdfUrl}`;

    console.log(`📄 Fetching police log: ${pdfUrl}`);

    try {
      const response = await fetch(jinaUrl, {
        headers: {
          'Accept': 'text/markdown'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
      }

      const markdown = await response.text();
      return markdown;
    } catch (error) {
      console.error(`❌ Error fetching police log for ${date.toISOString()}:`, error);
      throw error;
    }
  }

  /**
   * Parse markdown log data into structured entries
   * Format: Multi-line entries like:
   *   25-55315 0733 FIRE, ALARMS SOUNDING OTHER
   *   Location/Address: [REV 13750] PROCTOR AVE
   */
  static parseLogEntries(markdown: string, date: Date, sourceUrl: string): PoliceLogEntry[] {
    const entries: PoliceLogEntry[] = [];
    const lines = markdown.split('\n');

    let currentEntry: any = null;
    let currentDate = new Date(date); // Default to provided date

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Check for ANY date header (flexible matching)
      if (line.startsWith('#') || line.toLowerCase().includes('date')) {
        const dateMatch = line.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (dateMatch) {
          const month = parseInt(dateMatch[1], 10);
          const day = parseInt(dateMatch[2], 10);
          const year = parseInt(dateMatch[3], 10);
          currentDate = new Date(year, month - 1, day);
          console.log(`[DATE] Found date header: ${currentDate.toISOString().split('T')[0]}`);
          continue;
        }
      }

      // Match main entry line: Call# Time Reason Action
      // Pattern: 25-55315 0733 FIRE, ALARMS SOUNDING OTHER
      const entryMatch = line.match(/^(\d{2}-\d{5})\s+(\d{4})\s+(.+?)\s+([A-Z][A-Z\s/,]+)$/);

      if (entryMatch) {
        // Save previous entry
        if (currentEntry) {
          entries.push(this.finalizeEntry(currentEntry, currentEntry.logDate, sourceUrl));
        }

        // Start new entry
        const [, callNumber, time24h, callReason, action] = entryMatch;

        currentEntry = {
          callNumber,
          time24h,
          callReason: callReason.trim(),
          action: action.trim(),
          location: null,
          rawLines: [line],
          logDate: new Date(currentDate) // Store the date for this entry
        };
      }
      // Match location line: Location/Address: [REV 24865] REVERE BEACH PKWY
      else if (line.match(/^Location\/Address:/i)) {
        if (currentEntry) {
          const locationMatch = line.match(/^Location\/Address:\s*(.+)/i);
          if (locationMatch) {
            currentEntry.location = locationMatch[1].trim();
            currentEntry.rawLines.push(line);
          }
        }
      }
      // Match additional metadata (Refer To Incident, etc.)
      else if (currentEntry && line.match(/^Refer To/i)) {
        currentEntry.rawLines.push(line);
      }
    }

    // Don't forget last entry
    if (currentEntry) {
      entries.push(this.finalizeEntry(currentEntry, currentEntry.logDate, sourceUrl));
    }

    console.log(`✅ Parsed ${entries.length} log entries`);
    return entries;
  }

  /**
   * Finalize and categorize a log entry
   */
  private static finalizeEntry(entry: any, logDate: Date, sourceUrl: string): PoliceLogEntry {
    const timestamp = this.buildTimestamp(logDate, entry.time24h);

    return {
      callNumber: entry.callNumber,
      logDate,
      time24h: entry.time24h,
      timestamp,
      callReason: entry.callReason,
      callTypeCategory: this.categorizeCallType(entry.callReason),
      action: entry.action,
      actionCategory: this.categorizeAction(entry.action),
      locationCode: this.extractLocationCode(entry.location),
      locationAddress: entry.location,
      locationStreet: this.extractStreetName(entry.location),
      rawEntry: entry.rawLines.join('\n'),
      sourceUrl
    };
  }

  /**
   * Build full timestamp from date and 24h time
   */
  private static buildTimestamp(date: Date, time24h: string): Date {
    const hours = parseInt(time24h.substring(0, 2));
    const minutes = parseInt(time24h.substring(2, 4));

    const timestamp = new Date(date);
    timestamp.setHours(hours, minutes, 0, 0);

    return timestamp;
  }

  /**
   * Extract location code from location string
   * Example: "[REV 24865] REVERE BEACH PKWY" -> "REV 24865"
   */
  private static extractLocationCode(location: string | null): string | null {
    if (!location) return null;
    const match = location.match(/\[(REV\s*\d*)\]/);
    return match ? match[1].trim() : null;
  }

  /**
   * Extract street name from location
   * Example: "[REV 24865] REVERE BEACH PKWY" -> "REVERE BEACH PKWY"
   */
  private static extractStreetName(location: string | null): string | null {
    if (!location) return null;

    // Remove location code
    let street = location.replace(/\[REV\s*\d*\]\s*/, '').trim();

    // Remove intersection markers
    street = street.replace(/\s*\+\s*/g, ' + ');

    return street || null;
  }

  /**
   * Categorize call type into broader categories
   */
  private static categorizeCallType(callReason: string): string {
    const reason = callReason.toUpperCase();

    // Traffic-related
    if (reason.includes('TRAFFIC') || reason.includes('MOTOR VEHICLE') || reason.includes('PARKING')) {
      return 'TRAFFIC';
    }

    // Emergency/Medical
    if (reason.includes('MEDICAL') || reason.includes('AMBULANCE') || reason.includes('OVERDOSE')) {
      return 'MEDICAL';
    }

    // Fire/Safety
    if (reason.includes('FIRE') || reason.includes('SMOKE') || reason.includes('ALARM')) {
      return 'FIRE_SAFETY';
    }

    // Disturbances
    if (reason.includes('DISTURBANCE') || reason.includes('NOISE') || reason.includes('FIGHT')) {
      return 'DISTURBANCE';
    }

    // Domestic
    if (reason.includes('DOMESTIC')) {
      return 'DOMESTIC';
    }

    // Theft/Property
    if (reason.includes('LARCENY') || reason.includes('THEFT') || reason.includes('ROBBERY') ||
        reason.includes('BURGLARY') || reason.includes('BREAKING')) {
      return 'THEFT_PROPERTY';
    }

    // Assist/Service
    if (reason.includes('ASSIST') || reason.includes('WELL BEING') || reason.includes('CHECK')) {
      return 'ASSIST_SERVICE';
    }

    // Suspicious Activity
    if (reason.includes('SUSPICIOUS')) {
      return 'SUSPICIOUS';
    }

    // 911/Emergency
    if (reason.includes('911')) {
      return 'EMERGENCY_CALL';
    }

    // Investigation
    if (reason.includes('INVESTIGATION') || reason.includes('FOLLOW UP')) {
      return 'INVESTIGATION';
    }

    // Threats/Violence
    if (reason.includes('THREAT') || reason.includes('ASSAULT') || reason.includes('WEAPON')) {
      return 'THREATS_VIOLENCE';
    }

    // Missing persons
    if (reason.includes('MISSING')) {
      return 'MISSING_PERSON';
    }

    return 'OTHER';
  }

  /**
   * Categorize action into broader categories
   */
  private static categorizeAction(action: string): string {
    const act = action.toUpperCase();

    if (act.includes('NO ACTION')) return 'NO_ACTION';
    if (act.includes('SERVICES RENDERED')) return 'SERVICES_RENDERED';
    if (act.includes('REPORT')) return 'REPORT';
    if (act.includes('WARNING')) return 'WARNING';
    if (act.includes('ARREST')) return 'ARREST';
    if (act.includes('SUMMONS')) return 'SUMMONS';
    if (act.includes('REFERRED') || act.includes('TRANSFER')) return 'REFERRED';
    if (act.includes('GONE ON ARRIVAL')) return 'GONE_ON_ARRIVAL';
    if (act.includes('UNABLE TO LOCATE')) return 'UNABLE_TO_LOCATE';
    if (act.includes('PROTECTIVE CUSTODY')) return 'PROTECTIVE_CUSTODY';
    if (act.includes('UNFOUNDED')) return 'UNFOUNDED';
    if (act.includes('INVESTIGATED')) return 'INVESTIGATED';

    return 'OTHER';
  }

  /**
   * Save entries to Supabase
   */
  static async saveEntries(entries: PoliceLogEntry[]): Promise<number> {
    if (entries.length === 0) return 0;

    try {
      const { data, error } = await supabase
        .from('police_logs')
        .upsert(
          entries.map(entry => ({
            call_number: entry.callNumber,
            log_date: entry.logDate.toISOString().split('T')[0],
            time_24h: entry.time24h,
            timestamp: entry.timestamp.toISOString(),
            call_reason: entry.callReason,
            call_type_category: entry.callTypeCategory,
            action: entry.action,
            action_category: entry.actionCategory,
            location_code: entry.locationCode,
            location_address: entry.locationAddress,
            location_street: entry.locationStreet,
            raw_entry: entry.rawEntry,
            source_url: entry.sourceUrl
          })),
          { onConflict: 'call_number' }
        );

      if (error) {
        console.error('❌ Error saving to Supabase:', error);
        throw error;
      }

      console.log(`✅ Saved ${entries.length} entries to database`);
      return entries.length;
    } catch (error) {
      console.error('❌ Failed to save entries:', error);
      throw error;
    }
  }

  /**
   * Fetch and sync logs for a specific date
   */
  static async syncDate(date: Date): Promise<{ success: boolean; recordsAdded: number; error?: string }> {
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();

    // Skip Saturday and Sunday - no files exist for these days
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      console.log(`⏭️  Skipping ${date.toLocaleDateString()} (${dayOfWeek === 0 ? 'Sunday' : 'Saturday'}) - covered by Friday's file`);

      await supabase
        .from('police_logs_sync_status')
        .upsert({
          sync_date: dateStr,
          status: 'success',
          records_added: 0,
          source_url: null,
          error_message: 'Weekend - covered by Friday file',
          synced_at: new Date().toISOString()
        }, { onConflict: 'sync_date' });

      return { success: true, recordsAdded: 0 };
    }

    const pdfUrl = this.buildPDFUrl(date);
    if (!pdfUrl) {
      return { success: false, recordsAdded: 0, error: 'No PDF URL available' };
    }

    try {
      // Mark sync as pending
      await supabase
        .from('police_logs_sync_status')
        .upsert({
          sync_date: dateStr,
          status: 'pending',
          source_url: pdfUrl
        }, { onConflict: 'sync_date' });

      // Fetch and parse
      const markdown = await this.fetchLogMarkdown(date);
      const entries = this.parseLogEntries(markdown, date, pdfUrl);
      const recordsAdded = await this.saveEntries(entries);

      // Mark sync as success
      await supabase
        .from('police_logs_sync_status')
        .update({
          status: 'success',
          records_added: recordsAdded,
          synced_at: new Date().toISOString()
        })
        .eq('sync_date', dateStr);

      return { success: true, recordsAdded };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Mark sync as failed
      await supabase
        .from('police_logs_sync_status')
        .update({
          status: 'failed',
          error_message: errorMessage,
          synced_at: new Date().toISOString()
        })
        .eq('sync_date', dateStr);

      return { success: false, recordsAdded: 0, error: errorMessage };
    }
  }

  /**
   * Sync a discovered log from the scraper
   * This fetches a specific PDF URL and parses all entries, marking multiple dates as synced
   */
  static async syncDiscoveredLog(log: { pdfUrl: string; startDate: Date; endDate: Date; dateRangeStr: string }): Promise<{ success: boolean; recordsAdded: number; error?: string }> {
    console.log(`📄 Syncing discovered log: ${log.dateRangeStr}`);

    try {
      // Fetch the PDF via jina
      const jinaUrl = `https://r.jina.ai/${log.pdfUrl}`;
      console.log(`📥 Fetching: ${log.pdfUrl}`);

      const response = await fetch(jinaUrl, {
        headers: { 'Accept': 'text/markdown' }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
      }

      const markdown = await response.text();

      // Parse entries - use start date as the log date
      const entries = this.parseLogEntries(markdown, log.startDate, log.pdfUrl);
      const recordsAdded = await this.saveEntries(entries);

      // Mark ALL dates in the range as synced
      const datesCovered: Date[] = [];
      const current = new Date(log.startDate);
      while (current < log.endDate) {
        datesCovered.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }

      // Update sync status for all covered dates
      for (const date of datesCovered) {
        const dateStr = date.toISOString().split('T')[0];
        await supabase
          .from('police_logs_sync_status')
          .upsert({
            sync_date: dateStr,
            status: 'success',
            records_added: recordsAdded,
            source_url: log.pdfUrl,
            synced_at: new Date().toISOString()
          }, { onConflict: 'sync_date' });
      }

      console.log(`✅ Synced ${recordsAdded} records from ${log.dateRangeStr}`);
      return { success: true, recordsAdded };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to sync ${log.dateRangeStr}:`, errorMessage);

      // Mark start date as failed
      const dateStr = log.startDate.toISOString().split('T')[0];
      await supabase
        .from('police_logs_sync_status')
        .upsert({
          sync_date: dateStr,
          status: 'failed',
          error_message: errorMessage,
          source_url: log.pdfUrl,
          synced_at: new Date().toISOString()
        }, { onConflict: 'sync_date' });

      return { success: false, recordsAdded: 0, error: errorMessage };
    }
  }

  /**
   * Get daily statistics
   */
  static async getDailyStats(startDate: Date, endDate: Date): Promise<DailyStats[]> {
    const { data, error } = await supabase
      .from('police_logs_daily_stats')
      .select('*')
      .gte('log_date', startDate.toISOString().split('T')[0])
      .lte('log_date', endDate.toISOString().split('T')[0])
      .order('log_date', { ascending: false });

    if (error) {
      console.error('Error fetching daily stats:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get call type breakdown
   */
  static async getCallTypeBreakdown(startDate?: Date, endDate?: Date): Promise<CallTypeBreakdown[]> {
    // First get total count to know how many batches we need
    let countQuery = supabase
      .from('police_logs')
      .select('*', { count: 'exact', head: true });

    if (startDate) {
      countQuery = countQuery.gte('log_date', startDate.toISOString().split('T')[0]);
    }
    if (endDate) {
      countQuery = countQuery.lte('log_date', endDate.toISOString().split('T')[0]);
    }

    const { count } = await countQuery;

    // Fetch data in batches
    const batchSize = 1000;
    const allData: any[] = [];

    for (let offset = 0; offset < (count || 0); offset += batchSize) {
      let query = supabase
        .from('police_logs')
        .select('call_type_category')
        .range(offset, offset + batchSize - 1);

      if (startDate) {
        query = query.gte('log_date', startDate.toISOString().split('T')[0]);
      }
      if (endDate) {
        query = query.lte('log_date', endDate.toISOString().split('T')[0]);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching call type batch:', error);
        break;
      }

      if (data) allData.push(...data);
    }

    if (allData.length === 0) {
      return [];
    }

    // Count and calculate percentages
    const counts: { [key: string]: number } = {};
    allData.forEach(row => {
      const category = row.call_type_category || 'OTHER';
      counts[category] = (counts[category] || 0) + 1;
    });

    const total = allData.length;
    return Object.entries(counts)
      .map(([category, count]) => ({
        callTypeCategory: category,
        count,
        percentage: (count / total) * 100
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Search logs by query
   */
  static async searchLogs(query: string, limit: number = 50) {
    const { data, error } = await supabase
      .from('police_logs')
      .select('*')
      .or(`call_reason.ilike.%${query}%,location_address.ilike.%${query}%,action.ilike.%${query}%`)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error searching logs:', error);
      return [];
    }

    return data || [];
  }
}

export default PoliceLogsService;
