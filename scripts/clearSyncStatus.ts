import { supabase } from '../src/integrations/supabase/client';

async function clearSyncStatus() {
  console.log('Clearing sync status...');

  const { data } = await supabase.from('police_logs_sync_status').select('id');

  console.log('Found', data?.length || 0, 'records');

  if (data && data.length > 0) {
    for (const record of data) {
      await supabase.from('police_logs_sync_status').delete().eq('id', record.id);
      console.log('Deleted', record.id);
    }
  }

  console.log('Done!');
  process.exit(0);
}

clearSyncStatus();
