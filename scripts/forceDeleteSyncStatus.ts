import { supabase } from '../src/integrations/supabase/client';

async function forceDelete() {
  console.log('💣 Force deleting sync status records...\n');

  let attempts = 0;
  const maxAttempts = 50;

  while (attempts < maxAttempts) {
    const { data } = await supabase
      .from('police_logs_sync_status')
      .select('id')
      .limit(100);

    if (!data || data.length === 0) {
      console.log('✅ All records deleted!');
      break;
    }

    console.log(`Attempt ${attempts + 1}: Deleting ${data.length} records...`);

    for (const record of data) {
      const { error } = await supabase
        .from('police_logs_sync_status')
        .delete()
        .eq('id', record.id);

      if (error) {
        console.error('Delete error:', error);
      }
    }

    attempts++;
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  const { count: finalCount } = await supabase
    .from('police_logs_sync_status')
    .select('*', { count: 'exact', head: true });

  console.log(`\nFinal count: ${finalCount}`);

  if (finalCount === 0) {
    console.log('✅ SUCCESS! Table is empty. Now run sync!');
  } else {
    console.log(`⚠️  Still ${finalCount} records remaining. Manual action needed.`);
  }

  process.exit(0);
}

forceDelete();
