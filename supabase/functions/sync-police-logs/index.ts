// Supabase Edge Function - Daily Police Logs Sync
// This runs automatically every day via cron to sync new police logs

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
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

  // Extract all log links
  const linkRegex = /https:\/\/reverepolice\.org\/(\d{4})\/(\d{2})\/public-log-redacted-([\d\-am]+)-to-([\d\-am]+)\//g;
  const matches = [...markdown.matchAll(linkRegex)];

  const logs = [];
  const seenUrls = new Set();

  for (const match of matches) {
    const [, year, month, startStr, endStr] = match;

    const startDate = parseLogDate(startStr);
    const endDate = parseLogDate(endStr);

    if (!startDate || !endDate) continue;

    const dateRangeStr = `${startStr}-to-${endStr}`;
    const pdfUrl = `https://reverepolice.org/wp-content/uploads/${year}/${month}/Public-Log-Redacted-${dateRangeStr}.pdf`;

    if (seenUrls.has(pdfUrl)) continue;
    seenUrls.add(pdfUrl);

    logs.push({
      startDate,
      endDate,
      pdfUrl,
      dateRangeStr: `${startStr} to ${endStr}`
    });
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

      currentEntry = {
        call_number: callNumber,
        log_date: currentDate.toISOString().split('T')[0],
        time_24h: time24h,
        timestamp: buildTimestamp(currentDate, time24h).toISOString(),
        call_reason: callReason.trim(),
        action: action.trim(),
        location_address: null,
        raw_entry: trimmed,
        source_url: sourceUrl
      };
    } else if (trimmed.match(/^Location\/Address:/i) && currentEntry) {
      const locationMatch = trimmed.match(/^Location\/Address:\s*(.+)/i);
      if (locationMatch) {
        currentEntry.location_address = locationMatch[1].trim();
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

serve(async (req) => {
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
