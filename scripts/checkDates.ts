import { supabase } from '../src/integrations/supabase/client';

async function checkDates() {
  const { data } = await supabase
    .from('police_logs')
    .select('log_date')
    .order('log_date');

  if (!data) {
    console.log('No data found');
    process.exit(1);
  }

  const dates = [...new Set(data.map(d => d.log_date))].sort();

  console.log(`Total records: ${data.length}`);
  console.log(`Unique dates: ${dates.length}\n`);

  const counts: Record<string, number> = {};
  data.forEach(d => {
    counts[d.log_date] = (counts[d.log_date] || 0) + 1;
  });

  dates.forEach(date => {
    console.log(`  ${date}: ${counts[date]} records`);
  });

  // Check for categorization
  const { data: sample } = await supabase
    .from('police_logs')
    .select('call_type_category, action_category')
    .not('call_type_category', 'is', null)
    .limit(5);

  console.log(`\n✅ Sample categorized records: ${sample?.length || 0}`);

  process.exit(0);
}

checkDates();
