import { PoliceLogsAutoSync } from '../src/services/policeLogsAutoSync';

async function syncOctober() {
  console.log('🔄 Syncing October 5-6, 2025...\n');

  const dates = [
    new Date('2025-10-05'),
    new Date('2025-10-06'),
  ];

  for (const date of dates) {
    console.log(`📅 Syncing ${date.toLocaleDateString()}...`);
    await PoliceLogsAutoSync.syncDate(date);
  }

  console.log('\n✅ October sync complete!');
}

syncOctober().catch(console.error);
