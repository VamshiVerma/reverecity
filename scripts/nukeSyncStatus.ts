import { supabase } from '../src/integrations/supabase/client';

async function nukeSyncStatus() {
  console.log('💣 Nuking sync status table via SQL...\n');

  // Use raw SQL to delete everything
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: 'TRUNCATE TABLE police_logs_sync_status;'
  });

  if (error) {
    console.error('Error:', error);
    console.log('\n⚠️  Manual step required:');
    console.log('   Go to Supabase Dashboard → SQL Editor');
    console.log('   Run: TRUNCATE TABLE police_logs_sync_status;');
    process.exit(1);
  }

  console.log('✅ Sync status table cleared!');

  // Verify
  const { count } = await supabase
    .from('police_logs_sync_status')
    .select('*', { count: 'exact', head: true });

  console.log('   Remaining records:', count);

  process.exit(0);
}

nukeSyncStatus();
