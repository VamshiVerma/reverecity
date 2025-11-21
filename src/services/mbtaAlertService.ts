
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MBTAAlert {
  id: string;
  header: string;
  description: string | null;
  type: string;
  start_time: string | null;
  end_time: string | null;
  current: boolean;
  upcoming: boolean;
  stops: string[];
}

/**
 * Fetch MBTA alerts from the TransitMatters API
 * @param stations Optional array of station IDs to filter alerts
 */
export const fetchMBTAAlerts = async (stations?: string[]): Promise<MBTAAlert[]> => {
  try {
    // Build the station query parameters if provided
    const stationParams = stations ? stations.join('%2C') : 'place-wondl%2Cplace-rbmnl%2Cplace-bmmnl%2Cplace-sdmnl%2Cplace-orhte%2Cplace-wimnl%2Cplace-aport%2Cplace-mvbcl%2Cplace-aqucl%2Cplace-state%2Cplace-gover%2Cplace-bomnl';
    
    // Fetch alerts from the TransitMatters API
    const apiUrl = `https://corsproxy.io/?https://dashboard-api.labs.transitmatters.org/api/alerts?activity=USING_ESCALATOR%2CUSING_WHEELCHAIR&stop=${stationParams}`;
    
    console.log(`Operation: Fetching MBTA alerts from ${apiUrl}`);
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    // Parse the JSON response
    const rawAlerts = await response.json();
    console.log(`Operation: Received ${rawAlerts.length} MBTA alerts`);
    
    // Transform the alerts into our format
    const formattedAlerts: MBTAAlert[] = rawAlerts.map((alert: any) => {
      const activePeriod = alert.active_period?.[0] || {};
      
      return {
        id: alert.id,
        header: alert.header,
        description: alert.description,
        type: alert.type,
        start_time: activePeriod.start || null,
        end_time: activePeriod.end || null,
        current: activePeriod.current || false,
        upcoming: activePeriod.upcoming || false,
        stops: alert.stops || []
      };
    });
    
    // Store the alerts in Supabase
    await storeAlertsInSupabase(formattedAlerts);
    
    return formattedAlerts;
  } catch (error) {
    console.error("Error fetching MBTA alerts:", error);
    toast.error("Failed to load MBTA alerts");
    return [];
  }
};

/**
 * Fetch MBTA alerts from Supabase database
 */
export const fetchStoredAlerts = async (stationId?: string): Promise<MBTAAlert[]> => {
  try {
    let query = supabase.from('mbta_alerts').select('*');
    
    // If a station ID is provided, filter by stops containing that station
    if (stationId) {
      query = query.contains('stops', [stationId]);
    }
    
    const { data, error } = await query.order('current', { ascending: false });
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error("Error fetching stored alerts:", error);
    return [];
  }
};

/**
 * Store alerts in the Supabase database
 */
const storeAlertsInSupabase = async (alerts: MBTAAlert[]): Promise<void> => {
  if (!alerts || alerts.length === 0) return;
  
  try {
    console.log(`Operation: Storing ${alerts.length} alerts in Supabase`);
    
    // Use upsert to insert or update alerts
    const { error } = await supabase
      .from('mbta_alerts')
      .upsert(alerts, { onConflict: 'id' });
    
    if (error) throw error;
    
    console.log(`Operation: Successfully stored MBTA alerts in Supabase`);
  } catch (error) {
    console.error("Error storing alerts in Supabase:", error);
  }
};

/**
 * Get alerts for a specific station
 */
export const getStationAlerts = (alerts: MBTAAlert[], stationId: string): MBTAAlert[] => {
  return alerts.filter(alert => 
    alert.stops && alert.stops.some(stop => 
      stop === stationId || stop.startsWith(`door-${stationId.substring(6)}`)
    )
  );
};

/**
 * Format alert type to a more readable format
 */
export const formatAlertType = (type: string): string => {
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, l => l.toUpperCase());
};
