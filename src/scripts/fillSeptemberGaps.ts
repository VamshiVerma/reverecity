/**
 * Fill missing September 1-18 dates
 */

import {PoliceLogsService} from '../services/policeLogsService';

async function fillGaps() {
  console.log('🔧 Filling September 1-18 gaps...\n');

  let total = 0;
  const successes = [];
  const failures = [];

  for (let day = 1; day <= 18; day++) {
    const date = new Date(2025, 8, day); // Month is 0-indexed
    const dayName = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][date.getDay()];

    console.log(`📅 Sept ${day} (${dayName})`);

    const r = await PoliceLogsService.syncDate(date);

    if (r.success && r.recordsAdded > 0) {
      console.log(`✅ Loaded ${r.recordsAdded} records\n`);
      total += r.recordsAdded;
      successes.push({ day, records: r.recordsAdded });
    } else if (r.success) {
      console.log(`⏭️  Skipped (${r.recordsAdded} records)\n`);
    } else {
      console.log(`❌ Failed: ${r.error}\n`);
      failures.push({ day, error: r.error });
    }

    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 FILL COMPLETE!');
  console.log('='.repeat(60));
  console.log(`✅ Successful loads: ${successes.length}`);
  console.log(`❌ Failures: ${failures.length}`);
  console.log(`📝 Total new records: ${total}`);
  console.log('='.repeat(60));
}

fillGaps()
  .then(() => {
    console.log('\n✅ Script completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
