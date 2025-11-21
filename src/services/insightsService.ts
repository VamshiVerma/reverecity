
import { supabase } from "@/integrations/supabase/client";

export interface Insight {
  uuid: string;
  category: string | null;
  amount: number | null;
  percentage_of_budget: number | null;
  year: number | null;
  description: string | null;
  insight_text: string;
  source_page: string | null;
  subcategory: string | null;
  trend: string | null;
  trend_percentage: string | null;
  priority_level: string | null;
  per_capita: number | null;
}

export interface TableInfo {
  name: string;
  schema: string;
  rowCount?: number;
}

export async function fetchInsights(): Promise<Insight[]> {
  try {
    console.log("Fetching insights from Supabase...");
    const { data, error } = await supabase
      .from('insights')
      .select('*')
      .order('priority_level', { ascending: false })
      .limit(100);

    if (error) {
      console.error("Error fetching insights:", error);
      throw new Error(`Supabase error: ${error.message}`);
    }

    console.log(`Successfully fetched ${data?.length || 0} insights`);
    
    return data || [];
  } catch (err) {
    console.error("Exception in fetchInsights:", err);
    throw err;
  }
}

export async function fetchInsightsByCategory(category: string): Promise<Insight[]> {
  const { data, error } = await supabase
    .from('insights')
    .select('*')
    .eq('category', category)
    .order('priority_level', { ascending: false });

  if (error) {
    console.error(`Error fetching insights for category ${category}:`, error);
    throw new Error(error.message);
  }

  return data as Insight[];
}

export async function fetchOneInsight(): Promise<Insight | null> {
  try {
    console.log("Attempting to fetch a single insight for testing...");
    const { data, error } = await supabase
      .from('insights')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log("No rows found in insights table");
        return null;
      }
      console.error("Error fetching single insight:", error);
      throw new Error(error.message);
    }

    console.log("Found one insight:", data);
    return data as Insight;
  } catch (err) {
    console.error("Exception in fetchOneInsight:", err);
    return null;
  }
}

export async function fetchTables(): Promise<TableInfo[]> {
  try {
    console.log("Fetching tables from Supabase...");
    
    // Query to get tables info using the information_schema
    const { data, error } = await supabase
      .from('insights')
      .select('count(*)', { count: 'exact' });
      
    if (error) {
      console.error("Error fetching table info:", error);
      return [];
    }
    
    // Hardcoded list of tables as a fallback
    return [
      { name: 'insights', schema: 'public', rowCount: data?.length || 0 },
      { name: 'budget_insights', schema: 'public' },
      { name: 'weather_data', schema: 'public' },
      { name: 'visitor_analytics', schema: 'public' },
      { name: 'email_subscribers', schema: 'public' },
      { name: 'budget_qa', schema: 'public' },
      { name: 'foods', schema: 'public' },
      { name: 'meal_entries', schema: 'public' },
      { name: 'food_suggestions', schema: 'public' }
    ];
  } catch (err) {
    console.error("Exception fetching tables:", err);
    // Return hardcoded fallback list of tables from the database schema we know
    return [
      { name: 'insights', schema: 'public' },
      { name: 'budget_insights', schema: 'public' },
      { name: 'weather_data', schema: 'public' },
      { name: 'visitor_analytics', schema: 'public' },
      { name: 'email_subscribers', schema: 'public' },
      { name: 'budget_qa', schema: 'public' },
      { name: 'foods', schema: 'public' },
      { name: 'meal_entries', schema: 'public' },
      { name: 'food_suggestions', schema: 'public' }
    ];
  }
}
