
// Supabase Edge Function to fetch weather data and store it in the database
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Handle CORS preflight requests
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    // Create a Supabase client with the Admin key
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // The Visual Crossing Weather API key
    const apiKey = Deno.env.get('WEATHER_API_KEY') || ''
    
    if (!apiKey) {
      console.error('Weather API key not found')
      return new Response(
        JSON.stringify({ error: 'Weather API key not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }
    
    console.log('Fetching weather data from Visual Crossing API')
    
    // Get the current date and time for the request with timezone
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const timestamp = now.toISOString()
    
    console.log(`Fetching weather data for ${today} at ${timestamp}`)
    
    // Fetch weather data for Revere, MA with full detailed data including hourly data
    // Using the full date + time parameter to ensure fresh data
    const apiUrl = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/revere/${today}?unitGroup=us&include=hours,current&key=${apiKey}&contentType=json`
    
    console.log(`Making API request to: ${apiUrl.replace(apiKey, 'API_KEY_REDACTED')}`)
    
    const response = await fetch(apiUrl, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
    
    if (!response.ok) {
      console.error('Failed to fetch weather data:', response.status, response.statusText)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch weather data from API' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }
    
    const weatherData = await response.json()
    
    console.log('Weather data fetched successfully, storing in database')
    
    // Process and store the weather data
    weatherData.isProcessed = true // Add a flag to indicate processing is complete
    weatherData.fetchTimestamp = timestamp // Add timestamp to track when the data was fetched
    
    // Delete any existing records for today before inserting new data (to prevent stale data accumulation)
    const { error: deleteError } = await supabase
      .from('weather_data')
      .delete()
      .eq('location', 'revere')
      .gte('fetched_at', `${today}T00:00:00Z`)
      .lte('fetched_at', `${today}T23:59:59Z`)
    
    if (deleteError) {
      console.warn('Error deleting old weather records:', deleteError)
      // Continue with insert even if delete fails
    } else {
      console.log('Successfully cleared old weather records for today')
    }
    
    // Store the complete current conditions data
    const { data, error } = await supabase
      .from('weather_data')
      .insert({
        location: 'revere',
        fetched_at: timestamp,
        data: weatherData,
        current_conditions: weatherData.currentConditions,
        temp: weatherData.currentConditions.temp,
        humidity: weatherData.currentConditions.humidity,
        conditions: weatherData.currentConditions.conditions,
        icon: weatherData.currentConditions.icon
      })
      .select()
    
    if (error) {
      console.error('Error storing weather data:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to store weather data' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }
    
    console.log('Weather data stored successfully')
    return new Response(
      JSON.stringify({ 
        message: 'Weather data updated successfully',
        timestamp,
        data: data[0]
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
