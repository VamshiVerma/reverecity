
import { supabase } from "@/integrations/supabase/client";
import UAParser from "ua-parser-js";

// Generate a unique visitor ID that persists across sessions
const getOrCreateVisitorId = (): string => {
  const storageKey = 'revere_visitor_id';
  let visitorId = localStorage.getItem(storageKey);
  
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem(storageKey, visitorId);
  }
  
  return visitorId;
};

// Generate a unique session ID that resets on new sessions
const getOrCreateSessionId = (): string => {
  const storageKey = 'revere_session_id';
  const sessionExpiry = 'revere_session_expiry';
  
  const now = Date.now();
  const expiryTime = parseInt(sessionStorage.getItem(sessionExpiry) || '0', 10);
  
  if (now > expiryTime) {
    // Session expired, create new one (30 minutes expiry)
    const sessionId = crypto.randomUUID();
    const newExpiryTime = now + (30 * 60 * 1000);
    
    sessionStorage.setItem(storageKey, sessionId);
    sessionStorage.setItem(sessionExpiry, newExpiryTime.toString());
    
    return sessionId;
  }
  
  // Return existing session ID
  let sessionId = sessionStorage.getItem(storageKey);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    const newExpiryTime = now + (30 * 60 * 1000);
    
    sessionStorage.setItem(storageKey, sessionId);
    sessionStorage.setItem(sessionExpiry, newExpiryTime.toString());
  }
  
  return sessionId;
};

// Parse the user agent to get browser and device info
const parseUserAgent = (): { browser: string; deviceType: string; screenSize: string } => {
  const parser = new UAParser();
  const result = parser.getResult();
  
  const browser = `${result.browser.name || 'Unknown'} ${result.browser.version || ''}`.trim();
  
  let deviceType = 'desktop';
  if (result.device.type) {
    deviceType = result.device.type;
  } else {
    // Fallback to check screen width
    const width = window.innerWidth;
    if (width <= 768) {
      deviceType = 'mobile';
    } else if (width <= 1024) {
      deviceType = 'tablet';
    }
  }
  
  const screenSize = `${window.screen.width}x${window.screen.height}`;
  
  return { browser, deviceType, screenSize };
};

// Check if the visitor is returning
const isReturningVisitor = (): boolean => {
  const storageKey = 'revere_first_visit_date';
  const firstVisit = localStorage.getItem(storageKey);
  
  if (!firstVisit) {
    localStorage.setItem(storageKey, Date.now().toString());
    return false;
  }
  
  // If first visit was more than 1 hour ago, consider them returning
  return (Date.now() - parseInt(firstVisit, 10)) > (60 * 60 * 1000);
};

// Track a page visit
export const trackPageVisit = async (pagePath: string): Promise<void> => {
  try {
    const visitorId = getOrCreateVisitorId();
    const sessionId = getOrCreateSessionId();
    const { browser, deviceType, screenSize } = parseUserAgent();
    const referrer = document.referrer || null;
    const returning = isReturningVisitor();
    
    // Collect data to insert
    const visitData = {
      visitor_id: visitorId,
      session_id: sessionId,
      page_path: pagePath,
      referrer,
      user_agent: navigator.userAgent,
      device_type: deviceType,
      browser,
      screen_size: screenSize,
      is_returning: returning,
      // The IP address, country, region, and city will be empty here
      // They are populated by serverless functions or edge middleware
    };
    
    // Insert the visit data
    const { error } = await supabase
      .from('visitor_tracking')
      .insert([visitData]);
      
    if (error) {
      console.error('Error tracking visit:', error);
    }
  } catch (err) {
    console.error('Failed to track visit:', err);
  }
};

// Get visitor statistics
export const getVisitorStats = async (days: number = 7) => {
  try {
    const { data, error } = await supabase
      .rpc('get_visitor_count_by_day', { days_back: days });
      
    if (error) {
      console.error('Error fetching visitor stats:', error);
      return [];
    }
    
    return data || [];
  } catch (err) {
    console.error('Failed to get visitor stats:', err);
    return [];
  }
};

// Get recent visitors
export const getRecentVisitors = async (limit: number = 50) => {
  try {
    const { data, error } = await supabase
      .from('visitor_tracking')
      .select('*')
      .order('visit_timestamp', { ascending: false })
      .limit(limit);
      
    if (error) {
      console.error('Error fetching recent visitors:', error);
      return [];
    }
    
    return data || [];
  } catch (err) {
    console.error('Failed to get recent visitors:', err);
    return [];
  }
};

// Get page view counts
export const getPageViewCounts = async () => {
  try {
    const { data, error } = await supabase
      .from('visitor_tracking')
      .select('page_path, count')
      .order('count', { ascending: false });
      
    if (error) {
      console.error('Error fetching page view counts:', error);
      return [];
    }
    
    return data || [];
  } catch (err) {
    console.error('Failed to get page view counts:', err);
    return [];
  }
};
