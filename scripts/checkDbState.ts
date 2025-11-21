import { supabase } from '../src/integrations/supabase/client';

async function checkState() {
  const { count: logsCount } = await supabase.from('police_logs').select('*', { count: 'exact', head: true });
  const { count: statusCount } = await supabase.from('police_logs_sync_status').select('*', { count: 'exact', head: true });

  console.log('Police logs count:', logsCount);
  console.log('Sync status count:', statusCount);

  if (logsCount && logsCount > 0) {
    const { data: sample } = await supabase.from('police_logs').select('*').limit(1);
    if (sample && sample.length > 0) {
      console.log('\nSample record:');
      console.log('  call_type_category:', sample[0].call_type_category);
      console.log('  action_category:', sample[0].action_category);
      console.log('  location_address:', sample[0].location_address);
      console.log('  location_street:', sample[0].location_street);
    }
  }

  process.exit(0);
}

checkState();
