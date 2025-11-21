import { PoliceLogsAutoSync } from '../src/services/policeLogsAutoSync';

async function syncAll() {
  console.log('🚀 Starting sync from discovered logs...\n');

  const result = await PoliceLogsAutoSync.syncFromDiscoveredLogs();

  console.log('\n📊 Final Results:');
  console.log(JSON.stringify(result, null, 2));
}

syncAll().catch(console.error);
