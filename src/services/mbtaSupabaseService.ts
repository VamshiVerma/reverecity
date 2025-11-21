
import { supabase } from "@/integrations/supabase/client";
import { Station, LineDirection } from "@/data/mbtaData";

// Type definitions for data from Supabase
export interface MBTALine {
  id: number;
  line_id: string;
  type: string;
}

export interface MBTAStationStop {
  id: number;
  station_id: string;
  direction_id: string;
  stop_id: string;
}

export interface MBTABusConnection {
  id: number;
  station_id: string;
  bus_route: string;
}

export interface MBTAStationData {
  id: number;
  line_id: string;
  station_id: string;
  stop_name: string;
  short_name?: string;
  order_num: number;
  accessible: boolean;
  enclosed_bike_parking: boolean;
  pedal_park: boolean;
  terminus: boolean;
  stops: { [direction: string]: string[] };
  bus_connections: string[];
}

// Interface for direction data from Supabase
export interface SupabaseDirection {
  id: number;
  line_id: string; 
  direction_id: string;
  direction_name: string;
  created_at: string;
  updated_at: string;
}

// Interface for station data from Supabase
export interface SupabaseStation {
  id: number;
  line_id: string;
  station_id: string;
  stop_name: string;
  short_name?: string;
  order_num: number;
  accessible: boolean;
  enclosed_bike_parking: boolean;
  pedal_park: boolean;
  terminus: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Fetches MBTA transit line data from Supabase
 */
export const fetchMBTALines = async (): Promise<{ [key: string]: { type: string, direction: { [key: string]: string } } }> => {
  try {
    // Fetch transit lines
    const { data: lines, error: linesError } = await supabase
      .from('mbta_transit_lines')
      .select('*');
      
    if (linesError) throw linesError;
    if (!lines || lines.length === 0) return {};
    
    // Fetch directions for each line
    const { data: directions, error: directionsError } = await supabase
      .from('mbta_line_directions')
      .select('*');
      
    if (directionsError) throw directionsError;
    
    // Format the data
    const result: { [key: string]: { type: string, direction: { [key: string]: string } } } = {};
    
    lines.forEach((line: MBTALine) => {
      const lineDirections: { [key: string]: string } = {};
      
      directions?.forEach((dir: SupabaseDirection) => {
        if (dir.line_id === line.line_id) {
          lineDirections[dir.direction_id] = dir.direction_name;
        }
      });
      
      result[line.line_id] = {
        type: line.type,
        direction: lineDirections
      };
    });
    
    return result;
    
  } catch (error) {
    console.error('Error fetching MBTA lines:', error);
    return {};
  }
};

/**
 * Fetches MBTA stations data from Supabase
 */
export const fetchMBTAStations = async (lineId: string): Promise<Station[]> => {
  try {
    // Fetch stations
    const { data: stations, error: stationsError } = await supabase
      .from('mbta_stations')
      .select('*')
      .eq('line_id', lineId)
      .order('order_num');
      
    if (stationsError) throw stationsError;
    if (!stations || stations.length === 0) return [];
    
    // Fetch station stops
    const { data: stops, error: stopsError } = await supabase
      .from('mbta_station_stops')
      .select('*');
      
    if (stopsError) throw stopsError;
    
    // Fetch bus connections
    const { data: busConnections, error: busError } = await supabase
      .from('mbta_bus_connections')
      .select('*');
      
    if (busError) throw busError;
    
    // Format the data
    const formattedStations: Station[] = stations.map((station: SupabaseStation) => {
      // Process stops for this station
      const stationStops: { [direction: string]: string[] } = {};
      
      stops?.forEach((stop: MBTAStationStop) => {
        if (stop.station_id === station.station_id) {
          if (!stationStops[stop.direction_id]) {
            stationStops[stop.direction_id] = [];
          }
          stationStops[stop.direction_id].push(stop.stop_id);
        }
      });
      
      // Get bus connections for this station
      const buses: string[] = [];
      busConnections?.forEach((bus: MBTABusConnection) => {
        if (bus.station_id === station.station_id) {
          buses.push(bus.bus_route);
        }
      });
      
      return {
        stop_name: station.stop_name,
        short: station.short_name || undefined,
        branches: null,
        station: station.station_id,
        order: station.order_num,
        stops: stationStops,
        accessible: station.accessible,
        enclosed_bike_parking: station.enclosed_bike_parking,
        pedal_park: station.pedal_park,
        terminus: station.terminus
      };
    });
    
    return formattedStations;
    
  } catch (error) {
    console.error('Error fetching MBTA stations:', error);
    return [];
  }
};

/**
 * Fetches bus connections for MBTA stations from Supabase
 */
export const fetchBusConnections = async (): Promise<{ [stationId: string]: string[] }> => {
  try {
    const { data, error } = await supabase
      .from('mbta_bus_connections')
      .select('station_id, bus_route');
      
    if (error) throw error;
    if (!data || data.length === 0) return {};
    
    // Group bus routes by station ID
    const result: { [stationId: string]: string[] } = {};
    
    data.forEach((item: { station_id: string, bus_route: string }) => {
      if (!result[item.station_id]) {
        result[item.station_id] = [];
      }
      result[item.station_id].push(item.bus_route);
    });
    
    return result;
    
  } catch (error) {
    console.error('Error fetching bus connections:', error);
    return {};
  }
};
