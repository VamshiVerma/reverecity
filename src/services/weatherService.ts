
import { supabase } from "@/integrations/supabase/client";

export interface WeatherData {
  queryCost: number;
  latitude: number;
  longitude: number;
  resolvedAddress: string;
  address: string;
  timezone: string;
  tzoffset: number;
  days: Array<{
    datetime: string;
    datetimeEpoch: number;
    tempmax: number;
    tempmin: number;
    temp: number;
    feelslikemax: number;
    feelslikemin: number;
    feelslike: number;
    dew: number;
    humidity: number;
    precip: number;
    precipprob: number;
    precipcover: number;
    preciptype: string[] | null;
    snow: number;
    snowdepth: number;
    windgust: number;
    windspeed: number;
    winddir: number;
    pressure: number;
    cloudcover: number;
    visibility: number;
    solarradiation: number;
    solarenergy: number;
    uvindex: number;
    severerisk: number;
    sunrise: string;
    sunriseEpoch: number;
    sunset: string;
    sunsetEpoch: number;
    moonphase: number;
    conditions: string;
    description: string;
    icon: string;
    stations: string[] | null;
    source: string;
    hours: Array<{
      datetime: string;
      datetimeEpoch: number;
      temp: number;
      feelslike: number;
      humidity: number;
      dew: number;
      precip: number;
      precipprob: number;
      snow: number;
      snowdepth: number;
      preciptype: string[] | null;
      windgust: number;
      windspeed: number;
      winddir: number;
      pressure: number;
      visibility: number;
      cloudcover: number;
      solarradiation: number;
      solarenergy: number;
      uvindex: number;
      severerisk: number;
      conditions: string;
      icon: string;
      stations: string[] | null;
      source: string;
      datetimeInstance?: string;
    }>;
    precipsum: number;
    precipsumnormal: number;
    snowsum: number;
    datetimeInstance?: string;
  }>;
  stations: Record<string, {
    distance: number;
    latitude: number;
    longitude: number;
    useCount: number;
    id: string;
    name: string;
    quality: number;
    contribution: number;
  }>;
  currentConditions: {
    datetime: string;
    datetimeEpoch: number;
    temp: number;
    feelslike: number;
    humidity: number;
    dew: number;
    precip: number;
    precipprob: number;
    snow: number;
    snowdepth: number;
    preciptype: string[] | null;
    windgust: number;
    windspeed: number;
    winddir: number;
    pressure: number;
    visibility: number;
    cloudcover: number;
    solarradiation: number;
    solarenergy: number;
    uvindex: number;
    conditions: string;
    icon: string;
    stations: string[] | null;
    source: string;
    sunrise: string;
    sunriseEpoch: number;
    sunset: string;
    sunsetEpoch: number;
    moonphase: number;
  };
  isProcessed?: boolean;
  fetchTimestamp?: string;
}

export interface WeatherDataResponse {
  id: string;
  location: string;
  fetched_at: string;
  data: WeatherData;
  current_conditions: {
    datetime: string;
    datetimeEpoch: number;
    temp: number;
    feelslike: number;
    humidity: number;
    dew: number;
    precip: number;
    precipprob: number;
    snow: number;
    snowdepth: number;
    preciptype: string[] | null;
    windgust: number;
    windspeed: number;
    winddir: number;
    pressure: number;
    visibility: number;
    cloudcover: number;
    solarradiation: number;
    solarenergy: number;
    uvindex: number;
    conditions: string;
    icon: string;
    stations: string[] | null;
    source: string;
    sunrise: string;
    sunriseEpoch: number;
    sunset: string;
    sunsetEpoch: number;
    moonphase: number;
  };
}

// Helper function to check if data is fresh (less than 30 minutes old)
const isFreshData = (data: WeatherDataResponse): boolean => {
  if (!data.fetched_at) return false;
  
  const fetchedTime = new Date(data.fetched_at).getTime();
  const currentTime = new Date().getTime();
  const thirtyMinutesInMs = 30 * 60 * 1000; // Reduced from 60 to 30 minutes
  
  const timeDiff = currentTime - fetchedTime;
  const isFresh = timeDiff < thirtyMinutesInMs;
  
  console.log(`Weather data freshness check: ${isFresh ? 'FRESH' : 'STALE'}`);
  console.log(`- Fetched at: ${new Date(fetchedTime).toLocaleTimeString()}`);
  console.log(`- Current time: ${new Date(currentTime).toLocaleTimeString()}`);
  console.log(`- Time difference: ${Math.round(timeDiff / (60 * 1000))} minutes`);
  
  return isFresh;
};

export const getLatestWeatherData = async (forceRefresh = false): Promise<WeatherData | null> => {
  try {
    console.log(`Getting weather data${forceRefresh ? ' (force refresh)' : ''}`);
    
    // Make sure we cast the response to handle the weather_data table
    const { data, error } = await supabase
      .from('weather_data')
      .select('*')
      .eq('location', 'revere')
      .order('fetched_at', { ascending: false })
      .limit(1) as { data: WeatherDataResponse[] | null, error: any };

    if (error) {
      console.error("Error fetching weather data from database:", error);
      return null;
    }

    // Check if we have fresh data in the database
    if (!forceRefresh && data && data.length > 0 && isFreshData(data[0])) {
      console.log("Found fresh weather data in the database:", data[0].fetched_at);
      return data[0].data as WeatherData;
    }
    
    // If data exists but is stale, or doesn't exist, or force refresh is true,
    // invoke the edge function
    console.log("Weather data is stale or not found, invoking edge function");
    const { data: invocationData, error: invocationError } = await supabase.functions.invoke('fetch-weather');
    
    if (invocationError) {
      console.error("Error invoking fetch-weather function:", invocationError);
      
      // If we have stale data, return it as fallback
      if (data && data.length > 0) {
        console.log("Returning stale data as fallback");
        return data[0].data as WeatherData;
      }
      return null;
    }
    
    if (invocationData) {
      console.log("Successfully received fresh data from edge function:", invocationData.timestamp);
      
      // Try to fetch the data again after invoking the function
      console.log("Edge function invoked, fetching fresh data");
      const { data: freshData, error: freshError } = await supabase
        .from('weather_data')
        .select('*')
        .eq('location', 'revere')
        .order('fetched_at', { ascending: false })
        .limit(1) as { data: WeatherDataResponse[] | null, error: any };
      
      if (freshError || !freshData || freshData.length === 0) {
        console.error("Still couldn't get weather data after invoking function:", freshError);
        return null;
      }
      
      console.log("Successfully fetched fresh weather data:", freshData[0].fetched_at);
      return freshData[0].data as WeatherData;
    }
    
    // If we get here, something went wrong, try to return whatever data we have
    if (data && data.length > 0) {
      console.log("Returning existing data as fallback");
      return data[0].data as WeatherData;
    }
    
    return null;
  } catch (err) {
    console.error("Unexpected error in weather service:", err);
    return null;
  }
};

// Function to force refresh the weather data
export const refreshWeatherData = async (): Promise<WeatherData | null> => {
  return getLatestWeatherData(true);
};
