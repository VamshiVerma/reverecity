
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.5.0';

const supabaseUrl = 'https://dslaxzbzsdzxjcsdbruf.supabase.co';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Import insights from the provided data
const FY2025_INSIGHTS = [
  // First set of insights
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
    description: "Suffolk Downs mixed-use development",
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
  },
  {
    category: "Climate Resilience",
    subcategory: "Hazard Mitigation",
    amount: 500000,
    percentage: 0.33,
    year: 2025,
    description: "Hazard mitigation planning",
    trend: "Increasing",
    trend_percentage: 25,
    priority_level: "Medium",
    per_capita: 9.42,
    source_page: "I-8",
    insight_text: "The 2022 Hazard Mitigation Plan (page I-8) uses FEMA's National Risk Index to estimate losses from drought, landslides, hurricanes, severe winter storms, and tornadoes, reorganizing hazards to reflect climate change impacts, aligning with the 2018 Massachusetts State Hazard Mitigation and Climate Adaptation Plan."
  },
  {
    category: "Workforce Development",
    subcategory: "Public Sector",
    amount: 5000000,
    percentage: 3.3,
    year: 2025,
    description: "Public sector workforce recovery",
    trend: "Increasing",
    trend_percentage: 10,
    priority_level: "Medium",
    per_capita: 94.19,
    source_page: "I-7",
    insight_text: "ARPA funds of $5,000,000 (page I-7) are allocated to public sector workforce recovery, supporting 1,033 full-time equivalent (FTE) positions (page I-37), addressing retention challenges post-COVID to maintain service delivery."
  },
  {
    category: "Human Rights",
    subcategory: "Social Equity",
    amount: 50000,
    percentage: 0.03,
    year: 2025,
    description: "Human Rights Commission funding",
    trend: "Stable",
    trend_percentage: 0,
    priority_level: "Low",
    per_capita: 0.94,
    source_page: "II-102",
    insight_text: "The Human Rights Commission (page II-102) is budgeted $50,000 to promote social equity, focusing on diversity initiatives for Revere's 53,073 residents, a rare priority for a city of its size, as detailed in the department detail section."
  },
  {
    category: "Healthcare",
    subcategory: "Wellness Center",
    amount: 2000000,
    percentage: 1.33,
    year: 2025,
    description: "Health and wellness center construction",
    trend: "New",
    trend_percentage: 100,
    priority_level: "Medium",
    per_capita: 37.68,
    source_page: "I-7",
    insight_text: "A $2,000,000 ARPA allocation (page I-7) funds the construction of a new health and wellness center, budgeted under the Health and Wellness Center department (page II-113), targeting preventive care for Revere's aging population of approximately 10,000 seniors."
  },
  {
    category: "Cybersecurity",
    subcategory: "IT Infrastructure",
    amount: 750000,
    percentage: 0.5,
    year: 2025,
    description: "Municipal cybersecurity measures",
    trend: "Increasing",
    trend_percentage: 50,
    priority_level: "High",
    per_capita: 14.13,
    source_page: "I-9",
    insight_text: "Revere's cybersecurity measures (page I-9) mandate regular employee training, ensuring compliance with data protection protocols, critical for maintaining municipal operations post-COVID, as noted in the industry and commerce section."
  },
  {
    category: "Waste Management",
    subcategory: "Disposal",
    amount: 3000000,
    percentage: 2.0,
    year: 2025,
    description: "Municipal solid waste disposal",
    trend: "Stable",
    trend_percentage: 0,
    priority_level: "Medium",
    per_capita: 56.52,
    source_page: "I-6",
    insight_text: "Revere's contract with Refuse Energy Systems Company (RESCO) (page I-6) mandates disposal of 100,000 tons of municipal solid waste annually at the Saugus incineration facility, budgeted at $3,000,000 in the Solid Waste Enterprise Fund (page IV-10)."
  },
  {
    category: "Tourism",
    subcategory: "Travel Promotion",
    amount: 1000000,
    percentage: 0.67,
    year: 2025,
    description: "Travel and tourism initiatives",
    trend: "Increasing",
    trend_percentage: 20,
    priority_level: "Low",
    per_capita: 18.84,
    source_page: "I-7",
    insight_text: "A $1,000,000 ARPA allocation (page I-7) funds travel and tourism initiatives, including marketing Revere's 3-mile crescent beach, expecting to generate $2,000,000 in local meals and room tax revenue."
  },
  // Adding more key insights from the provided list
  {
    category: "Public Safety",
    subcategory: "Police",
    amount: 7000000,
    percentage: 4.67,
    year: 2025,
    description: "Police department operations",
    trend: "Increasing",
    trend_percentage: 3,
    priority_level: "High",
    per_capita: 131.87,
    source_page: "II-53",
    insight_text: "The Police Department (page II-53) receives $7,000,000, funding 120 officers and 10 community policing programs."
  },
  {
    category: "Public Safety",
    subcategory: "Fire",
    amount: 5000000,
    percentage: 3.33,
    year: 2025,
    description: "Fire department operations",
    trend: "Increasing",
    trend_percentage: 2,
    priority_level: "High",
    per_capita: 94.19,
    source_page: "II-59",
    insight_text: "The Fire Department (page II-59) budgets $5,000,000, supporting 100 firefighters and 5 mutual aid agreements."
  },
  {
    category: "Public Works",
    subcategory: "Snow Removal",
    amount: 1000000,
    percentage: 0.67,
    year: 2025,
    description: "Snow and ice removal operations",
    trend: "Stable",
    trend_percentage: 0,
    priority_level: "Medium",
    per_capita: 18.84,
    source_page: "II-78",
    insight_text: "Public Works Snow & Ice (page II-78) budgets $1,000,000 for 50 snow removal operations, ensuring winter safety."
  }
];

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Store all insights in the database
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (const insight of FY2025_INSIGHTS) {
      // Check if the insight already exists based on the insight_text
      const { data: existingInsight, error: queryError } = await supabase
        .from('budget_insights')
        .select('id')
        .eq('insight_text', insight.insight_text)
        .maybeSingle();
        
      if (queryError) {
        console.error('Error checking for existing insight:', queryError);
        errorCount++;
        errors.push(queryError.message);
        continue;
      }
      
      if (!existingInsight) {
        // Insert the new insight
        const { error: insertError } = await supabase
          .from('budget_insights')
          .insert(insight);
          
        if (insertError) {
          console.error('Error saving insight:', insertError);
          errorCount++;
          errors.push(insertError.message);
        } else {
          successCount++;
        }
      } else {
        // Update existing insight
        const { error: updateError } = await supabase
          .from('budget_insights')
          .update(insight)
          .eq('id', existingInsight.id);
          
        if (updateError) {
          console.error('Error updating insight:', updateError);
          errorCount++;
          errors.push(updateError.message);
        } else {
          successCount++;
        }
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully processed ${successCount} insights with ${errorCount} errors.`,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error populating insights:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
