import { supabase } from '../src/integrations/supabase/client';
import PoliceLogsService from '../src/services/policeLogsService';

async function categorizeExistingLogs() {
  console.log('🔄 Categorizing existing police logs...\n');

  // Fetch all logs
  const { data: logs, error } = await supabase
    .from('police_logs')
    .select('*')
    .order('timestamp', { ascending: true });

  if (error) {
    console.error('Error fetching logs:', error);
    process.exit(1);
  }

  console.log(`Found ${logs.length} logs to categorize\n`);

  let updated = 0;
  let failed = 0;

  for (const log of logs) {
    try {
      // Categorize using the service logic
      const callTypeCategory = (PoliceLogsService as any).categorizeCallType(log.call_reason);
      const actionCategory = (PoliceLogsService as any).categorizeAction(log.action);
      const locationCode = (PoliceLogsService as any).extractLocationCode(log.location_address);
      const locationStreet = (PoliceLogsService as any).extractStreetName(log.location_address);

      // Update the record
      const { error: updateError } = await supabase
        .from('police_logs')
        .update({
          call_type_category: callTypeCategory,
          action_category: actionCategory,
          location_code: locationCode,
          location_street: locationStreet
        })
        .eq('id', log.id);

      if (updateError) {
        console.error(`Error updating ${log.call_number}:`, updateError);
        failed++;
      } else {
        updated++;
        if (updated % 100 === 0) {
          console.log(`✅ Updated ${updated}/${logs.length}...`);
        }
      }
    } catch (err) {
      console.error(`Error processing ${log.call_number}:`, err);
      failed++;
    }
  }

  console.log(`\n✅ Categorization complete!`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Failed: ${failed}`);

  // Show sample record
  const { data: sample } = await supabase.from('police_logs').select('*').limit(1);
  if (sample && sample.length > 0) {
    console.log('\n📊 Sample record:');
    console.log('  call_type_category:', sample[0].call_type_category);
    console.log('  action_category:', sample[0].action_category);
    console.log('  location_street:', sample[0].location_street);
  }

  process.exit(0);
}

categorizeExistingLogs();
