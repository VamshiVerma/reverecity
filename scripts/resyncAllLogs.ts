import { PoliceLogsAutoSync } from '../src/services/policeLogsAutoSync';

async function resyncAllLogs() {
  console.log('🔄 Force re-syncing ALL logs with categorization...\n');
  console.log('ℹ️  NOTE: Sync status will be managed by the service\n');

  // Use local sync service (has full categorization logic)
  const result = await PoliceLogsAutoSync.syncFromDiscoveredLogs();

  console.log('\n📊 Final Results:');
  console.log(JSON.stringify(result, null, 2));

  process.exit(0);
}

resyncAllLogs();
