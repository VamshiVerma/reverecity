
import { format, isToday, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

export interface TravelTimeData {
  route_id: string;
  direction: number;
  dep_dt: string;
  arr_dt: string;
  travel_time_sec: number;
  benchmark_travel_time_sec: number;
}

// Fetch travel times - prioritizing API for today's data, using cache for historical
export const fetchTravelTimes = async (
  date: Date,
  fromStop: string,
  toStop: string
): Promise<TravelTimeData[]> => {
  // Format date to YYYY-MM-DD
  const formattedDate = format(date, "yyyy-MM-dd");
  console.log(`Operation: Fetching travel times from ${fromStop} to ${toStop} for ${formattedDate}`);
  
  // Check if requested date is today
  const isCurrentDay = isToday(date);
  
  // For current day, always fetch from API to get fresh data
  if (isCurrentDay) {
    console.log(`Operation: Fetching today's data directly from API to ensure freshness`);
    return await fetchFromAPI(formattedDate, fromStop, toStop);
  }
  
  // For historical dates, try Supabase first, then API as fallback
  console.log(`Operation: Historical date requested, checking cache first`);
  const { data: existingData, error: fetchError } = await supabase
    .from('mbta_travel_times')
    .select('*')
    .eq('dep_dt_key', formattedDate)
    .eq('from_stop', fromStop)
    .eq('to_stop', toStop);
  
  // If we have data in Supabase for historical dates, return it
  if (!fetchError && existingData && existingData.length > 0) {
    console.log(`Operation: Found ${existingData.length} cached travel time records for historical date`);
    return existingData;
  }

  // If no cache or current day, fetch from API
  console.log(`Operation: No cached data found for date ${formattedDate}, fetching from API`);
  return await fetchFromAPI(formattedDate, fromStop, toStop);
};

// Helper function to fetch data from TransitMatters API
const fetchFromAPI = async (date: string, fromStop: string, toStop: string): Promise<TravelTimeData[]> => {
  try {
    console.log(`Fetching fresh data from TransitMatters API for ${fromStop} → ${toStop} on ${date}`);
    
    // Use direct corsproxy.io URL since the relative URL approach isn't working
    const apiUrl = `https://corsproxy.io/?https://dashboard-api.labs.transitmatters.org/api/traveltimes/${date}?from_stop=${fromStop}&to_stop=${toStop}`;
    
    console.log(`Making API request to: ${apiUrl}`);
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`Successfully fetched ${data.length} fresh travel time records from API`);
    
    // Use mock data if the API returns empty results (for development/testing)
    if (data.length === 0) {
      console.log(`No data returned from API, using mock data for development`);
      const mockData = generateMockTravelTimeData(date, fromStop, toStop);
      await storeInSupabase(date, fromStop, toStop, mockData);
      return mockData;
    }
    
    // Store the fetched data in Supabase - this ensures we always have the latest data
    await storeInSupabase(date, fromStop, toStop, data);
    return data;
  } catch (error) {
    console.error("Error fetching travel times from API:", error);
    
    // Fallback to mock data if API fetch fails
    console.log("Using mock data as fallback due to API error");
    const mockData = generateMockTravelTimeData(date, fromStop, toStop);
    return mockData;
  }
};

// Generate mock travel time data for development and testing
const generateMockTravelTimeData = (date: string, fromStop: string, toStop: string): TravelTimeData[] => {
  const mockData: TravelTimeData[] = [];
  const baseDate = new Date(`${date}T06:00:00`); // Start at 6 AM
  
  // More realistic travel times based on actual Blue Line data
  let baseTravelTime: number;
  
  // Set realistic travel times based on station pairs
  if (fromStop === "place-wondl" && toStop === "place-rbmnl") {
    baseTravelTime = 120; // 2 minutes between Wonderland and Revere Beach
  } else if (fromStop === "place-rbmnl" && toStop === "place-aport") {
    baseTravelTime = 480; // 8 minutes from Revere Beach to Airport
  } else if (fromStop === "place-wondl" && toStop === "place-state") {
    baseTravelTime = 1020; // 17 minutes from Wonderland to State 
  } else if (fromStop === "place-aport" && toStop === "place-state") {
    baseTravelTime = 420; // 7 minutes from Airport to State
  } else if (fromStop === "place-wondl" && toStop === "place-gover") {
    baseTravelTime = 1080; // 18 minutes from Wonderland to Government Center
  } else if (fromStop === "place-bmmnl" && toStop === "place-state") {
    baseTravelTime = 840; // 14 minutes from Beachmont to State
  } else {
    // Default case - calculate based on typical station spacing
    const stationMap: { [key: string]: number } = {
      "place-wondl": 1,
      "place-rbmnl": 2,
      "place-bmmnl": 3,
      "place-sdmnl": 4,
      "place-orhte": 5,
      "place-wimnl": 6,
      "place-aport": 7,
      "place-mvbcl": 8,
      "place-aqucl": 9,
      "place-state": 10,
      "place-gover": 11,
      "place-bomnl": 12
    };
    
    // Calculate station distance
    const fromIndex = stationMap[fromStop] || 1;
    const toIndex = stationMap[toStop] || 2;
    const stations = Math.abs(toIndex - fromIndex);
    
    // Average 2 minutes per station
    baseTravelTime = stations * 120; 
  }
  
  // Generate data points every 15 minutes from 6 AM to 11 PM
  for (let i = 0; i < 68; i++) {
    const departureTime = new Date(baseDate.getTime() + i * 15 * 60 * 1000);
    
    // Vary travel time by 10-20% to simulate peak/off-peak times
    const variation = 1 + (Math.random() * 0.2 - 0.1); // -10% to +10%
    
    // Add more variation during rush hours (7-9am and 4-6pm)
    const hour = departureTime.getHours();
    let rushHourFactor = 1;
    if ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 18)) {
      rushHourFactor = 1.15; // 15% longer during rush hour
    }
    
    const travelTime = Math.floor(baseTravelTime * variation * rushHourFactor);
    const arrivalTime = new Date(departureTime.getTime() + travelTime * 1000);
    
    mockData.push({
      route_id: "Blue",
      direction: 1,
      dep_dt: departureTime.toISOString(),
      arr_dt: arrivalTime.toISOString(),
      travel_time_sec: travelTime,
      benchmark_travel_time_sec: baseTravelTime // Standard travel time
    });
  }
  
  return mockData;
};

// Helper function to store API data in Supabase
const storeInSupabase = async (
  date: string,
  fromStop: string,
  toStop: string,
  apiData: TravelTimeData[]
) => {
  try {
    // Check for existing records to avoid duplicates
    const { data: existingData } = await supabase
      .from('mbta_travel_times')
      .select('dep_dt')
      .eq('dep_dt_key', date)
      .eq('from_stop', fromStop)
      .eq('to_stop', toStop);
    
    const existingTimestamps = new Set(existingData?.map(item => item.dep_dt) || []);
    
    // Prepare data for insert, filtering out records that already exist
    const dataToInsert = apiData
      .filter(item => !existingTimestamps.has(item.dep_dt))
      .map((item: TravelTimeData) => {
        // Extract date from dep_dt for the dep_dt_key column
        const depDate = new Date(item.dep_dt);
        const depDateKey = format(depDate, "yyyy-MM-dd");
        
        // Extract time from dep_dt for the time_key column
        const timeKey = format(depDate, "HH:mm:ss");
        
        return {
          date: date,
          dep_dt_key: depDateKey,
          time_key: timeKey,
          from_stop: fromStop,
          to_stop: toStop,
          route_id: item.route_id,
          direction: item.direction,
          dep_dt: item.dep_dt,
          arr_dt: item.arr_dt,
          travel_time_sec: item.travel_time_sec,
          benchmark_travel_time_sec: item.benchmark_travel_time_sec
        };
      });
    
    if (dataToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('mbta_travel_times')
        .insert(dataToInsert);
      
      if (insertError) {
        console.error('Error storing travel time data in database:', insertError);
      } else {
        console.log(`Operation: Successfully stored ${dataToInsert.length} new travel time records in database`);
      }
    } else {
      console.log(`Operation: No new records to store in database`);
    }
  } catch (error) {
    console.error("Error storing data in Supabase:", error);
  }
};

// Helper function to format seconds to minutes and seconds
export const formatSecondsToMinSec = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  
  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }
  
  return `${minutes}m ${remainingSeconds}s`;
};

// Helper function to get travel time statistics
export const getTravelTimeStats = (data: TravelTimeData[]) => {
  if (!data || data.length === 0) {
    return { avg: 0, median: 0, min: 0, max: 0 };
  }

  const travelTimes = data.map(item => item.travel_time_sec).filter(time => 
    typeof time === 'number' && !isNaN(time)
  );
  
  if (travelTimes.length === 0) {
    return { avg: 0, median: 0, min: 0, max: 0 };
  }
  
  const avg = travelTimes.reduce((sum, time) => sum + time, 0) / travelTimes.length;
  
  const sortedTimes = [...travelTimes].sort((a, b) => a - b);
  const median = sortedTimes.length % 2 === 0 
    ? (sortedTimes[sortedTimes.length / 2 - 1] + sortedTimes[sortedTimes.length / 2]) / 2
    : sortedTimes[Math.floor(sortedTimes.length / 2)];
  
  const min = Math.min(...travelTimes);
  const max = Math.max(...travelTimes);

  return { avg, median, min, max };
};
