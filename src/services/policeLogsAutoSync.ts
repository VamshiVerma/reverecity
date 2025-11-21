// Auto-sync service for police logs - runs daily to fetch new logs
import PoliceLogsService from './policeLogsService';

export class PoliceLogsAutoSync {
  private static syncInterval: NodeJS.Timeout | null = null;
  private static isSyncing = false;

  /**
   * Start auto-sync - runs every day at 8 AM
   */
  static startAutoSync() {
    console.log('🚀 Starting Police Logs Auto-Sync Service');

    // Run initial sync on startup (if needed)
    this.checkAndSyncToday();

    // Schedule daily sync at 8 AM
    this.scheduleDailySync();

    // Also check every hour in case we missed it
    this.syncInterval = setInterval(() => {
      this.checkAndSyncToday();
    }, 60 * 60 * 1000); // Every hour
  }

  /**
   * Stop auto-sync
   */
  static stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('🛑 Stopped Police Logs Auto-Sync Service');
    }
  }

  /**
   * Schedule sync to run at 8 AM daily
   */
  private static scheduleDailySync() {
    const now = new Date();
    const nextSync = new Date();

    // Set to 8 AM today
    nextSync.setHours(8, 0, 0, 0);

    // If it's already past 8 AM, schedule for tomorrow
    if (now > nextSync) {
      nextSync.setDate(nextSync.getDate() + 1);
    }

    const msUntilSync = nextSync.getTime() - now.getTime();

    console.log(`⏰ Next police log sync scheduled for: ${nextSync.toLocaleString()}`);

    setTimeout(() => {
      this.syncYesterday();
      // Reschedule for next day
      this.scheduleDailySync();
    }, msUntilSync);
  }

  /**
   * Check if today's log has been synced, if not sync it
   */
  static async checkAndSyncToday() {
    if (this.isSyncing) {
      console.log('⏳ Sync already in progress, skipping...');
      return;
    }

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Logs are published the next day, so sync yesterday's log
    await this.syncDate(yesterday);
  }

  /**
   * Sync yesterday's log (most recent available)
   */
  static async syncYesterday() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await this.syncDate(yesterday);
  }

  /**
   * Sync logs for a specific date
   */
  static async syncDate(date: Date) {
    if (this.isSyncing) {
      console.log('⏳ Sync already in progress, skipping...');
      return;
    }

    this.isSyncing = true;

    try {
      console.log(`📅 Syncing police logs for ${date.toLocaleDateString()}...`);

      const result = await PoliceLogsService.syncDate(date);

      if (result.success) {
        console.log(`✅ Successfully synced ${result.recordsAdded} records for ${date.toLocaleDateString()}`);
      } else {
        console.error(`❌ Failed to sync ${date.toLocaleDateString()}: ${result.error}`);
      }

      return result;
    } catch (error) {
      console.error(`❌ Error during sync:`, error);
      return { success: false, recordsAdded: 0, error: error instanceof Error ? error.message : 'Unknown error' };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Backfill logs for a date range
   * Useful for initial setup or catching up on missed days
   * Skips dates that are already successfully synced
   */
  static async backfillRange(startDate: Date, endDate: Date) {
    console.log(`📦 Backfilling police logs from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);

    const { supabase } = await import('@/integrations/supabase/client');

    // Get already synced dates
    const { data: syncedDates } = await supabase
      .from('police_logs_sync_status')
      .select('sync_date, status, records_added')
      .eq('status', 'success')
      .gte('sync_date', startDate.toISOString().split('T')[0])
      .lte('sync_date', endDate.toISOString().split('T')[0]);

    const syncedDateSet = new Set(syncedDates?.map(d => d.sync_date) || []);

    const results = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];

      // Skip if already synced
      if (syncedDateSet.has(dateStr)) {
        const existing = syncedDates?.find(d => d.sync_date === dateStr);
        console.log(`⏭️  Skipping ${currentDate.toLocaleDateString()} - already synced (${existing?.records_added || 0} records)`);
        results.push({
          date: new Date(currentDate),
          success: true,
          recordsAdded: existing?.records_added || 0,
          skipped: true
        });
      } else {
        const result = await this.syncDate(new Date(currentDate));
        results.push({ date: new Date(currentDate), ...result, skipped: false });

        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const successCount = results.filter(r => r.success).length;
    const skippedCount = results.filter(r => r.skipped).length;
    const totalRecords = results.reduce((sum, r) => sum + r.recordsAdded, 0);

    console.log(`📊 Backfill complete: ${successCount}/${results.length} days synced (${skippedCount} skipped), ${totalRecords} total records`);

    return results;
  }

  /**
   * Get sync status for recent days
   */
  static async getSyncStatus(days: number = 7) {
    const { supabase } = await import('@/integrations/supabase/client');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('police_logs_sync_status')
      .select('*')
      .gte('sync_date', startDate.toISOString().split('T')[0])
      .order('sync_date', { ascending: false });

    if (error) {
      console.error('Error fetching sync status:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Manual sync trigger (for UI button)
   */
  static async manualSync() {
    console.log('🔄 Manual sync triggered');
    await this.syncYesterday();
  }

  /**
   * Sync all unsynced logs by discovering available PDFs from the news page
   * This is more reliable than guessing date ranges since the schedule is irregular
   */
  static async syncFromDiscoveredLogs() {
    if (this.isSyncing) {
      console.log('⏳ Sync already in progress, skipping...');
      return { success: false, error: 'Sync already in progress' };
    }

    this.isSyncing = true;

    try {
      console.log('🔍 Starting sync from discovered logs...');

      // Import scraper and service
      const { PoliceLogsScraper } = await import('./policeLogsScraper');
      const PoliceLogsService = (await import('./policeLogsService')).default;

      // Discover unsynced logs
      const unsyncedLogs = await PoliceLogsScraper.findUnsyncedLogs();

      if (unsyncedLogs.length === 0) {
        console.log('✅ All logs are already synced!');
        return { success: true, totalRecords: 0, logsSynced: 0 };
      }

      console.log(`📦 Found ${unsyncedLogs.length} unsynced logs. Starting sync...`);

      let totalRecords = 0;
      let successCount = 0;
      let failCount = 0;

      for (const log of unsyncedLogs) {
        console.log(`\n📄 Syncing: ${log.dateRangeStr}`);

        const result = await PoliceLogsService.syncDiscoveredLog(log);

        if (result.success) {
          totalRecords += result.recordsAdded;
          successCount++;
        } else {
          failCount++;
        }

        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      console.log(`\n✅ Sync complete!`);
      console.log(`   Success: ${successCount}/${unsyncedLogs.length}`);
      console.log(`   Failed: ${failCount}`);
      console.log(`   Total records: ${totalRecords}`);

      return {
        success: true,
        logsSynced: successCount,
        logsFailed: failCount,
        totalRecords
      };

    } catch (error) {
      console.error('❌ Error syncing from discovered logs:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      this.isSyncing = false;
    }
  }
}

export default PoliceLogsAutoSync;
