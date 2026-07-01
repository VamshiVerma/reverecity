// Supabase Edge Function - Daily Police Logs Sync
// This runs automatically every day via cron to sync new police logs

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Scraper to discover available PDFs
async function discoverAvailableLogs() {
  console.log('[SYNC] Discovering available police logs from news page...');

  const jinaUrl = 'https://r.jina.ai/https://reverepolice.org/news/';
  const response = await fetch(jinaUrl, {
    headers: { 'Accept': 'text/markdown' }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch news page: ${response.status}`);
  }

  const markdown = await response.text();

  // The Revere PD site now publishes daily "media logs" as PDFs on their CDN,
  // e.g. https://files.aptuitivcdn.com/.../media-log/media-log-040224_redacted.pdf
  // where 040224 = MM DD YY (April 2, 2024).
  const linkRegex = /https:\/\/[^\s"'()]*media-log-(\d{6})_redacted\.pdf/gi;
  const matches = [...markdown.matchAll(linkRegex)];

  const logs = [];
  const seenUrls = new Set();

  for (const match of matches) {
    const pdfUrl = match[0];
    const digits = match[1]; // MMDDYY

    const month = parseInt(digits.slice(0, 2), 10);
    const day = parseInt(digits.slice(2, 4), 10);
    const year = parseInt(digits.slice(4, 6), 10) + 2000;
    if (!month || !day) continue;

    const startDate = new Date(year, month - 1, day);
    // Each PDF covers a single day; endDate is the next day so the
    // sync-status day-marking loop records exactly this date.
    const endDate = new Date(year, month - 1, day + 1);

    if (seenUrls.has(pdfUrl)) continue;
    seenUrls.add(pdfUrl);

    const dateRangeStr = startDate.toISOString().split('T')[0];
    logs.push({ startDate, endDate, pdfUrl, dateRangeStr });
  }

  console.log(`[SYNC] Discovered ${logs.length} police logs`);
  return logs;
}

function parseLogDate(dateStr: string): Date | null {
  try {
    const cleanStr = dateStr.replace(/-7am$/, '');
    const parts = cleanStr.split('-');
    if (parts.length !== 3) return null;

    const month = parseInt(parts[0], 10);
    const day = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10) + 2000;

    return new Date(year, month - 1, day);
  } catch {
    return null;
  }
}

// Find unsynced logs
async function findUnsyncedLogs(supabase: any, allLogs: any[]) {
  const { data: syncedLogs } = await supabase
    .from('police_logs_sync_status')
    .select('sync_date, status')
    .eq('status', 'success');

  const syncedDates = new Set(syncedLogs?.map((s: any) => s.sync_date) || []);

  const unsynced = allLogs.filter((log: any) => {
    const dateStr = log.startDate.toISOString().split('T')[0];
    return !syncedDates.has(dateStr);
  });

  console.log(`[SYNC] Total: ${allLogs.length}, Already synced: ${allLogs.length - unsynced.length}, Unsynced: ${unsynced.length}`);
  return unsynced;
}

// Derive a normalized call-type category from the entry text
function categorizeCallType(text: string): string {
  const reason = (text || '').toUpperCase();
  if (reason.includes('TRAFFIC') || reason.includes('MOTOR VEHICLE') || reason.includes('PARKING')) return 'TRAFFIC';
  if (reason.includes('MEDICAL') || reason.includes('AMBULANCE') || reason.includes('OVERDOSE')) return 'MEDICAL';
  if (reason.includes('FIRE') || reason.includes('SMOKE') || reason.includes('ALARM')) return 'FIRE_SAFETY';
  if (reason.includes('DISTURBANCE') || reason.includes('NOISE') || reason.includes('FIGHT')) return 'DISTURBANCE';
  if (reason.includes('DOMESTIC')) return 'DOMESTIC';
  if (reason.includes('LARCENY') || reason.includes('THEFT') || reason.includes('ROBBERY') ||
      reason.includes('BURGLARY') || reason.includes('BREAKING')) return 'THEFT_PROPERTY';
  if (reason.includes('ASSIST') || reason.includes('WELL BEING') || reason.includes('CHECK')) return 'ASSIST_SERVICE';
  if (reason.includes('SUSPICIOUS')) return 'SUSPICIOUS';
  if (reason.includes('911')) return 'EMERGENCY_CALL';
  if (reason.includes('MISSING')) return 'MISSING_PERSON';
  return 'OTHER';
}

function categorizeAction(action: string): string {
  const act = (action || '').toUpperCase();
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

function extractLocationCode(location: string | null): string | null {
  if (!location) return null;
  const match = location.match(/\[(REV\s*\d*)\]/);
  return match ? match[1].trim() : null;
}

function extractStreetName(location: string | null): string | null {
  if (!location) return null;
  const street = location.replace(/\[REV\s*\d*\]\s*/, '').replace(/\s*\+\s*/g, ' + ').trim();
  return street || null;
}

// Parse markdown log entries
function parseLogEntries(markdown: string, logDate: Date, sourceUrl: string) {
  const entries = [];
  const lines = markdown.split('\n');
  let currentEntry: any = null;
  let currentDate = new Date(logDate); // Default to provided date

  for (const line of lines) {
    const trimmed = line.trim();

    // Check for ANY date header (flexible matching)
    // Matches lines with dates like: "# For Date: 09/19/2025" or "## Log Entries for 09/19/2025" etc
    if (trimmed.startsWith('#') || trimmed.toLowerCase().includes('date')) {
      const dateMatch = trimmed.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (dateMatch) {
        const month = parseInt(dateMatch[1], 10);
        const day = parseInt(dateMatch[2], 10);
        const year = parseInt(dateMatch[3], 10);
        currentDate = new Date(year, month - 1, day);
        console.log(`[DATE] Found date header: ${currentDate.toISOString().split('T')[0]} from line: ${trimmed.substring(0, 50)}`);
        continue;
      }
    }

    // Match entry line: 25-55315 0733 FIRE, ALARMS SOUNDING OTHER
    const entryMatch = trimmed.match(/^(\d{2}-\d{5})\s+(\d{4})\s+(.+?)\s+([A-Z][A-Z\s/,]+)$/);

    if (entryMatch) {
      if (currentEntry) {
        entries.push(currentEntry);
      }

      const [, callNumber, time24h, callReason, action] = entryMatch;
      const combined = `${callReason} ${action}`;

      currentEntry = {
        call_number: callNumber,
        log_date: currentDate.toISOString().split('T')[0],
        time_24h: time24h,
        timestamp: buildTimestamp(currentDate, time24h).toISOString(),
        call_reason: callReason.trim(),
        call_type_category: categorizeCallType(combined),
        action: action.trim(),
        action_category: categorizeAction(action),
        location_code: null,
        location_address: null,
        location_street: null,
        raw_entry: trimmed,
        source_url: sourceUrl
      };
    } else if (currentEntry) {
      // Location can appear as "Location/Address:", "Location:", or "Vicinity of:"
      const locationMatch = trimmed.match(/^(?:Location\/Address|Location|Vicinity of):\s*(.+)/i);
      if (locationMatch) {
        const loc = locationMatch[1].trim();
        currentEntry.location_address = loc;
        currentEntry.location_code = extractLocationCode(loc);
        currentEntry.location_street = extractStreetName(loc);
      }
    }
  }

  if (currentEntry) {
    entries.push(currentEntry);
  }

  console.log(`[PARSE] Parsed ${entries.length} entries from ${markdown.split('\n').length} lines`);
  return entries;
}

function buildTimestamp(date: Date, time24h: string): Date {
  const hours = parseInt(time24h.substring(0, 2));
  const minutes = parseInt(time24h.substring(2, 4));
  const timestamp = new Date(date);
  timestamp.setHours(hours, minutes, 0, 0);
  return timestamp;
}

// Sync a discovered log
async function syncDiscoveredLog(supabase: any, log: any) {
  console.log(`[SYNC] Syncing: ${log.dateRangeStr}`);

  try {
    const jinaUrl = `https://r.jina.ai/${log.pdfUrl}`;
    const response = await fetch(jinaUrl, {
      headers: { 'Accept': 'text/markdown' }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const markdown = await response.text();
    const entries = parseLogEntries(markdown, log.startDate, log.pdfUrl);

    if (entries.length === 0) {
      console.log(`[WARN] No entries parsed from ${log.dateRangeStr}`);
      return { success: true, recordsAdded: 0 };
    }

    // Save entries
    const { error: insertError } = await supabase
      .from('police_logs')
      .upsert(entries, { onConflict: 'call_number' });

    if (insertError) {
      throw insertError;
    }

    // Mark dates as synced
    const datesCovered = [];
    const current = new Date(log.startDate);
    while (current < log.endDate) {
      datesCovered.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    for (const date of datesCovered) {
      const dateStr = date.toISOString().split('T')[0];
      await supabase
        .from('police_logs_sync_status')
        .upsert({
          sync_date: dateStr,
          status: 'success',
          records_added: entries.length,
          source_url: log.pdfUrl,
          synced_at: new Date().toISOString()
        }, { onConflict: 'sync_date' });
    }

    console.log(`[SUCCESS] Synced ${entries.length} records from ${log.dateRangeStr}`);
    return { success: true, recordsAdded: entries.length };

  } catch (error) {
    console.error(`[ERROR] Failed to sync ${log.dateRangeStr}:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, recordsAdded: 0, error: errorMessage };
  }
}

Deno.serve(async (req) => {
  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[SYNC] Starting daily police logs sync...');

    // Discover available logs
    const allLogs = await discoverAvailableLogs();

    if (allLogs.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No logs found' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Find unsynced logs
    const unsyncedLogs = await findUnsyncedLogs(supabase, allLogs);

    if (unsyncedLogs.length === 0) {
      console.log('[SUCCESS] All logs are already synced!');
      return new Response(JSON.stringify({ success: true, message: 'All logs already synced' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`[SYNC] Syncing ${unsyncedLogs.length} unsynced logs...`);

    let totalRecords = 0;
    let successCount = 0;
    let failCount = 0;

    for (const log of unsyncedLogs) {
      const result = await syncDiscoveredLog(supabase, log);
      if (result.success) {
        totalRecords += result.recordsAdded;
        successCount++;
      } else {
        failCount++;
      }

      // Small delay
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`[SUCCESS] Sync complete! Success: ${successCount}, Failed: ${failCount}, Total records: ${totalRecords}`);

    return new Response(JSON.stringify({
      success: true,
      logsSynced: successCount,
      logsFailed: failCount,
      totalRecords
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[ERROR] Main error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      stack: errorStack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
