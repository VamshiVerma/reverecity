/**
 * Backfill Script - Load September 2025 Police Logs
 * Skips dates that are already synced
 */

import {PoliceLogsAutoSync} from '../services/policeLogsAutoSync';

async function backfillSeptember() {
  console.log('🚀 Starting September 2025 Backfill...\n');

  const start = new Date(2025, 8, 1);  // Sept 1, 2025
  const end = new Date(2025, 8, 30);   // Sept 30, 2025

  console.log(`📅 Date Range: ${start.toLocaleDateString()} to ${end.toLocaleDateString()}\n`);

  try {
    const results = await PoliceLogsAutoSync.backfillRange(start, end);

    // Summary
    const successCount = results.filter(r => r.success).length;
    const skippedCount = results.filter(r => r.skipped).length;
    const newSyncs = results.filter(r => !r.skipped).length;
    const failCount = results.filter(r => !r.success).length;
    const totalRecords = results.reduce((sum, r) => sum + r.recordsAdded, 0);

    console.log('\n' + '='.repeat(60));
    console.log('📊 SEPTEMBER BACKFILL COMPLETE!');
    console.log('='.repeat(60));
    console.log(`✅ Successful Days: ${successCount}/30`);
    console.log(`⏭️  Skipped (already synced): ${skippedCount}`);
    console.log(`🆕 New Syncs: ${newSyncs}`);
    console.log(`❌ Failed Days: ${failCount}`);
    console.log(`📝 Total Records: ${totalRecords.toLocaleString()}`);
    console.log('='.repeat(60));

    // Show failed dates if any
    if (failCount > 0) {
      console.log('\n❌ Failed Dates:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`  - ${r.date.toLocaleDateString()}: ${r.error}`);
      });
    }

  } catch (error) {
    console.error('\n❌ BACKFILL FAILED:', error);
    throw error;
  }
}

// Run the backfill
backfillSeptember()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

export default backfillSeptember;
