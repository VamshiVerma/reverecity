import { supabase } from '../src/integrations/supabase/client';
import { PoliceLogsAutoSync } from '../src/services/policeLogsAutoSync';

async function forceResync() {
  console.log('🗑️  Clearing ALL police logs data...');

  // Delete all logs in batches
  let hasMore = true;
  let totalDeleted = 0;
  while (hasMore) {
    const { data: logs } = await supabase.from('police_logs').select('id').limit(1000);
    if (logs && logs.length > 0) {
      await supabase.from('police_logs').delete().in('id', logs.map(l => l.id));
      totalDeleted += logs.length;
    } else {
      hasMore = false;
    }
  }
  if (totalDeleted > 0) {
    console.log('✅ Deleted', totalDeleted, 'log records');
  }

  // Delete all sync status in batches
  hasMore = true;
  let totalStatusDeleted = 0;
  while (hasMore) {
    const { data: statuses } = await supabase.from('police_logs_sync_status').select('id').limit(1000);
    if (statuses && statuses.length > 0) {
      await supabase.from('police_logs_sync_status').delete().in('id', statuses.map(s => s.id));
      totalStatusDeleted += statuses.length;
    } else {
      hasMore = false;
    }
  }
  if (totalStatusDeleted > 0) {
    console.log('✅ Deleted', totalStatusDeleted, 'sync status records');
  }

  console.log('\n🔄 Starting fresh sync with full categorization...\n');

  // Use local sync service (has categorization logic)
  const result = await PoliceLogsAutoSync.syncFromDiscoveredLogs();

  console.log('\n📊 Final Results:');
  console.log(JSON.stringify(result, null, 2));

  // Verify categorization
  console.log('\n🔍 Verifying data quality...');
  const { data: sample } = await supabase.from('police_logs').select('*').limit(1);

  if (sample && sample.length > 0) {
    console.log('\n✅ Sample record:');
    console.log('  call_type_category:', sample[0].call_type_category);
    console.log('  action_category:', sample[0].action_category);
    console.log('  location_address:', sample[0].location_address);
    console.log('  location_street:', sample[0].location_street);
  }

  process.exit(0);
}

forceResync().catch(console.error);
