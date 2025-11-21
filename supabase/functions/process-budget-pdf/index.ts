
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.5.0';

const supabaseUrl = 'https://dslaxzbzsdzxjcsdbruf.supabase.co';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Example insights from the provided data
const FY2025_INSIGHTS = [
  {
    category: "Water & Sewer",
    subcategory: "Infrastructure",
    amount: 9000000,
    percentage: 6.0,
    year: 2025,
    description: "ARPA allocation for water and sewer infrastructure improvements",
    trend: "Increasing",
    trend_percentage: 15,
    priority_level: "High",
    per_capita: 169.58,
    source_page: "I-7",
    insight_text: "The FY2025 budget allocates exactly $9,000,000 from the American Rescue Plan Act (ARPA) to water and sewer infrastructure improvements, as detailed on page I-7, targeting upgrades to aging systems to prevent sanitary sewer overflows, which are explicitly noted as illegal under the Clean Water Act in the glossary (page X-286)."
  },
  {
    category: "Economic Development",
    subcategory: "Suffolk Downs",
    amount: 5800000,
    percentage: 3.9,
    year: 2025,
    description: "Suffolk Downs commercial development",
    trend: "Stable",
    trend_percentage: 0,
    priority_level: "Medium",
    per_capita: 109.28,
    source_page: "I-10",
    insight_text: "The Suffolk Downs mixed-use development, approved by the Revere City Council in 2018 (page I-10), covers 160 acres with 52 acres in Revere, projecting 5,800,000 gross square feet of commercial, residential, and civic/recreational space, including a new biotech manufacturing facility in phase 1, exceeding the initial 50% commercial target set for the 15-20 year project."
  },
  {
    category: "Education",
    subcategory: "School Construction",
    amount: 50000000,
    percentage: 33.3,
    year: 2025,
    description: "Wonderland high school construction",
    trend: "Increasing",
    trend_percentage: 200,
    priority_level: "High",
    per_capita: 941.92,
    source_page: "I-11",
    insight_text: "Revere acquired the 34-acre Wonderland Greyhound Racetrack by eminent domain (page I-11) to construct a high school for 2,450 students, with CBW Lending, LLC filing a lawsuit over the $X fair market value, though the city asserts confidence in its valuation, as noted in the economic development section."
  }
];

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { filePath, question } = await req.json();

    if (!filePath) {
      return new Response(
        JSON.stringify({ error: 'File path is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the file from storage
    const { data: fileData, error: fileError } = await supabase
      .storage
      .from('budget-docs')
      .download(filePath);

    if (fileError) {
      console.error('Error downloading file:', fileError);
      return new Response(
        JSON.stringify({ error: `Failed to download file: ${fileError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // This is where we would process the PDF in a real implementation
    // For this demo, we'll use our pre-defined insights

    // First, store the insights in the database if they don't exist already
    for (const insight of FY2025_INSIGHTS) {
      // Check if the insight already exists based on the insight_text
      const { data: existingInsight, error: queryError } = await supabase
        .from('budget_insights')
        .select('id')
        .eq('insight_text', insight.insight_text)
        .maybeSingle();
        
      if (queryError) {
        console.error('Error checking for existing insight:', queryError);
        continue;
      }
      
      if (!existingInsight) {
        // Insert the new insight
        const { error: insertError } = await supabase
          .from('budget_insights')
          .insert(insight);
          
        if (insertError) {
          console.error('Error saving insight:', insertError);
        }
      }
    }
    
    // Get all insights from the database
    const { data: allInsights, error: insightsError } = await supabase
      .from('budget_insights')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (insightsError) {
      console.error('Error fetching insights:', insightsError);
      return new Response(
        JSON.stringify({ error: `Failed to fetch insights: ${insightsError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Generate response based on question or return insights
    if (question) {
      let answer = "I don't have enough information to answer that question.";
      
      // Simple keyword matching (in a real app, use NLP)
      const questionLower = question.toLowerCase();
      
      // Find insights that might relate to the question
      const relevantInsights = allInsights.filter(insight => {
        if (!insight.insight_text) return false;
        
        const insightText = insight.insight_text.toLowerCase();
        
        // Check if keywords from the question appear in the insight text
        const keywords = questionLower.split(' ')
          .filter(word => word.length > 3) // Only use meaningful words
          .map(word => word.replace(/[^\w]/g, '')); // Remove non-word characters
          
        return keywords.some(keyword => insightText.includes(keyword));
      });
      
      if (relevantInsights.length > 0) {
        // Use the most relevant insight as the answer
        answer = relevantInsights[0].insight_text || relevantInsights[0].description || 
          `The budget for ${relevantInsights[0].category} is $${(relevantInsights[0].amount/1000000).toFixed(1)}M, which is ${relevantInsights[0].percentage}% of the total budget.`;
      } else if (questionLower.includes('total budget')) {
        const totalBudget = allInsights.reduce((sum, insight) => sum + insight.amount, 0);
        answer = `The total budget for 2025 is $${(totalBudget/1000000).toFixed(1)}M.`;
      }
      
      // Save question and answer
      const { error: qaError } = await supabase
        .from('budget_qa')
        .insert({ question, answer });
        
      if (qaError) {
        console.error('Error saving Q&A:', qaError);
      }
      
      return new Response(
        JSON.stringify({ answer, insights: allInsights }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ insights: allInsights }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing budget PDF:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
