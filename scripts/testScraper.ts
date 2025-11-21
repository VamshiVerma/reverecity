import { PoliceLogsScraper } from '../src/services/policeLogsScraper';
import { PoliceLogsAutoSync } from '../src/services/policeLogsAutoSync';

async function testScraper() {
  console.log('🧪 Testing Police Logs Scraper\n');

  // Step 1: Discover all logs
  console.log('📋 Step 1: Discovering all available logs...');
  const allLogs = await PoliceLogsScraper.discoverAvailableLogs();

  if (allLogs.length === 0) {
    console.log('❌ No logs found!');
    return;
  }

  console.log(`\n✅ Found ${allLogs.length} total logs\n`);
  console.log('Most recent 10 logs:');
  allLogs.slice(0, 10).forEach((log, i) => {
    console.log(`  ${i + 1}. ${log.dateRangeStr}`);
    console.log(`     PDF: ${log.pdfUrl}`);
  });

  // Step 2: Find unsynced logs
  console.log('\n📋 Step 2: Finding unsynced logs...');
  const unsyncedLogs = await PoliceLogsScraper.findUnsyncedLogs();

  if (unsyncedLogs.length === 0) {
    console.log('✅ All logs are already synced!');
    return;
  }

  console.log(`\n📦 Found ${unsyncedLogs.length} unsynced logs:\n`);
  unsyncedLogs.forEach((log, i) => {
    console.log(`  ${i + 1}. ${log.dateRangeStr}`);
  });

  // Step 3: Sync the unsynced logs
  console.log('\n📋 Step 3: Ready to sync unsynced logs');
  console.log('Run: PoliceLogsAutoSync.syncFromDiscoveredLogs()');
  console.log('\nWould you like to proceed? (This script will exit without syncing)');
}

testScraper().catch(console.error);
