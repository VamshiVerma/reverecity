/**
 * Backfill Script - Load all 2025 Police Logs
 *
 * This script fetches and loads ALL police logs from January 1, 2025 to present
 * Run this once to populate the database with historical data
 */

import PoliceLogsAutoSync from '../services/policeLogsAutoSync';

async function backfillAll2025() {
  console.log('🚀 Starting 2025 Police Logs Backfill...\n');

  // Start from January 1, 2025
  const startDate = new Date('2025-01-01');

  // End at yesterday (today's log isn't published yet)
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 1);

  console.log(`📅 Date Range: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);

  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  console.log(`📊 Total Days to Process: ${totalDays}\n`);

  console.log('⏳ This will take approximately ' + Math.ceil(totalDays * 2 / 60) + ' minutes (2 seconds per day)\n');
  console.log('Starting backfill...\n');

  try {
    const results = await PoliceLogsAutoSync.backfillRange(startDate, endDate);

    // Summary
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    const totalRecords = results.reduce((sum, r) => sum + r.recordsAdded, 0);

    console.log('\n' + '='.repeat(60));
    console.log('📊 BACKFILL COMPLETE!');
    console.log('='.repeat(60));
    console.log(`✅ Successful Days: ${successCount}/${totalDays}`);
    console.log(`❌ Failed Days: ${failCount}/${totalDays}`);
    console.log(`📝 Total Records Added: ${totalRecords.toLocaleString()}`);
    console.log(`📈 Average Records/Day: ${Math.round(totalRecords / successCount)}`);
    console.log('='.repeat(60));

    // Show failed dates if any
    if (failCount > 0) {
      console.log('\n❌ Failed Dates:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`  - ${r.date.toLocaleDateString()}: ${r.error}`);
      });
    }

    // Monthly breakdown
    console.log('\n📅 Monthly Breakdown:');
    const monthlyStats: { [key: string]: { success: number; records: number } } = {};

    results.forEach(r => {
      const monthKey = r.date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = { success: 0, records: 0 };
      }
      if (r.success) {
        monthlyStats[monthKey].success++;
        monthlyStats[monthKey].records += r.recordsAdded;
      }
    });

    Object.entries(monthlyStats).forEach(([month, stats]) => {
      console.log(`  ${month}: ${stats.success} days, ${stats.records.toLocaleString()} records`);
    });

  } catch (error) {
    console.error('\n❌ BACKFILL FAILED:', error);
    throw error;
  }
}

// Run the backfill
backfillAll2025()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

export default backfillAll2025;
