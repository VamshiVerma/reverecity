
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageVisit } from '@/services/visitorTrackingService';

export const VisitorTracker = () => {
  const location = useLocation();
  
  useEffect(() => {
    // Track page visit when location changes
    const trackVisit = async () => {
      await trackPageVisit(location.pathname);
    };
    
    trackVisit();
  }, [location.pathname]);
  
  // This component doesn't render anything
  return null;
};

export default VisitorTracker;
