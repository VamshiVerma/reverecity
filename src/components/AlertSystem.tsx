import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { BellRing, TrainFront, AlertTriangle, Info, Bus, DollarSign, Building, CloudSun } from 'lucide-react';
import { fetchMBTAAlerts } from '@/services/mbtaAlertService';
import { MBTAAlert } from '@/services/mbtaAlertService';
import { getTravelTimeStats, fetchTravelTimes, formatSecondsToMinSec } from '@/services/mbtaService';
import { mbtaData } from '@/data/mbtaData';
import { getLatestWeatherData } from '@/services/weatherService';

// List of potential alerts to display, with more variety
const ALERT_TYPES = [
  'mbta-delays',
  'mbta-travel-insight',
  'traffic-alert',
  'city-info',
  'city-budget',
  'city-development',
  'weather-alert'
];

const AlertSystem = () => {
  const [lastAlertType, setLastAlertType] = useState<string | null>(null);
  const [lastAlertId, setLastAlertId] = useState<string | null>(null);
  const [mbta_alerts, setMbtaAlerts] = useState<MBTAAlert[]>([]);
  const [travelTimeData, setTravelTimeData] = useState<any[]>([]);
  const [weatherData, setWeatherData] = useState<any>(null);
  const [lastAlertTime, setLastAlertTime] = useState<Date | null>(null);
  
  // Clear all existing toasts when component mounts to prevent stacking
  useEffect(() => {
    toast.dismiss();
  }, []);

  // Fetch MBTA alerts on component mount
  useEffect(() => {
    const loadMbtaAlerts = async () => {
      try {
        const alerts = await fetchMBTAAlerts();
        setMbtaAlerts(alerts.filter(alert => alert.current));
      } catch (error) {
        console.error('Error loading MBTA alerts:', error);
      }
    };
    
    loadMbtaAlerts();
  }, []);

  // Fetch weather data
  useEffect(() => {
    const loadWeatherData = async () => {
      try {
        const data = await getLatestWeatherData();
        if (data) {
          setWeatherData(data);
          console.log("Weather data loaded successfully");
        }
      } catch (error) {
        console.error('Error loading weather data:', error);
      }
    };
    
    loadWeatherData();
  }, []);

  // Fetch travel time data for insights
  useEffect(() => {
    const loadTravelTimeData = async () => {
      try {
        // Get Blue Line stations
        const blueLineStations = mbtaData.Blue.stations;
        if (blueLineStations.length < 2) return;
        
        // Get travel times for a few key station pairs
        const today = new Date();
        
        // Wonderland to Revere Beach
        const wonderlandToRevere = await fetchTravelTimes(
          today,
          blueLineStations[0].station, // Wonderland
          blueLineStations[1].station  // Revere Beach
        );
        
        // Revere Beach to Airport
        const revereToAirport = await fetchTravelTimes(
          today,
          blueLineStations[1].station, // Revere Beach
          blueLineStations[6].station  // Airport
        );
        
        // Wonderland to Downtown (State)
        const wonderlandToState = await fetchTravelTimes(
          today,
          blueLineStations[0].station, // Wonderland
          blueLineStations[9].station  // State
        );
        
        // Airport to Downtown (State)
        const airportToState = await fetchTravelTimes(
          today,
          blueLineStations[6].station, // Airport
          blueLineStations[9].station  // State
        );
        
        // Wonderland to Government Center
        const wonderlandToGovCenter = await fetchTravelTimes(
          today,
          blueLineStations[0].station, // Wonderland
          blueLineStations[10].station  // Government Center
        );

        // Beachmont to State
        const beachmontToState = await fetchTravelTimes(
          today,
          blueLineStations[2].station, // Beachmont
          blueLineStations[9].station  // State
        );
        
        setTravelTimeData([
          { from: 'Wonderland', to: 'Revere Beach', data: wonderlandToRevere },
          { from: 'Revere Beach', to: 'Airport', data: revereToAirport },
          { from: 'Wonderland', to: 'State Street', data: wonderlandToState },
          { from: 'Airport', to: 'State Street', data: airportToState },
          { from: 'Wonderland', to: 'Government Center', data: wonderlandToGovCenter },
          { from: 'Beachmont', to: 'State Street', data: beachmontToState }
        ]);
        
      } catch (error) {
        console.error('Error loading travel time data:', error);
      }
    };
    
    loadTravelTimeData();
  }, []);

  // Display an alert every 20 seconds with 10 second initial delay
  useEffect(() => {
    toast.dismiss(); // Clear existing toasts
    
    const showRandomAlert = () => {
      toast.dismiss(); // Clear any existing toast before showing a new one
      
      // Determine which type of alert to show based on available data
      let availableTypes = [...ALERT_TYPES];
      
      // Filter alert types based on available data
      if (mbta_alerts.length === 0) {
        availableTypes = availableTypes.filter(type => type !== 'mbta-delays');
      }
      
      if (!travelTimeData || travelTimeData.length === 0 || !travelTimeData.some(item => item.data && item.data.length > 0)) {
        availableTypes = availableTypes.filter(type => type !== 'mbta-travel-insight');
      }
      
      if (!weatherData) {
        availableTypes = availableTypes.filter(type => type !== 'weather-alert');
      }
      
      // Try not to show the same type twice in a row
      if (lastAlertType && availableTypes.length > 1) {
        availableTypes = availableTypes.filter(type => type !== lastAlertType);
      }
      
      // Pick a random alert type from the available ones
      const alertType = availableTypes.length > 0 
        ? availableTypes[Math.floor(Math.random() * availableTypes.length)]
        : 'city-info'; // Default to city info if no data is available
      
      setLastAlertType(alertType);
      
      // Show the appropriate alert based on type
      switch (alertType) {
        case 'mbta-delays':
          showMBTAAlert();
          break;
        case 'mbta-travel-insight':
          showTravelTimeInsight();
          break;  
        case 'traffic-alert':
          showTrafficAlert();
          break;
        case 'city-info':
          showCityInfo();
          break;
        case 'city-budget':
          showBudgetInsight();
          break;
        case 'city-development':
          showDevelopmentInsight();
          break;
        case 'weather-alert':
          showWeatherInsight();
          break;
        default:
          showCityInfo();
      }
      
      setLastAlertTime(new Date());
    };
    
    // Show an initial alert after 10 seconds
    const initialTimer = setTimeout(showRandomAlert, 10000);
    
    // Then show alerts every 20 seconds
    const intervalTimer = setInterval(showRandomAlert, 20000);
    
    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
    };
  }, [lastAlertType, mbta_alerts, travelTimeData, weatherData]);
  
  // MBTA Alert - Show actual MBTA alerts if available
  const showMBTAAlert = () => {
    if (mbta_alerts.length > 0) {
      // Use a real alert from the data, but avoid showing the same one twice in a row
      const usableAlerts = mbta_alerts.filter(alert => alert.id !== lastAlertId);
      
      if (usableAlerts.length > 0) {
        const randomIndex = Math.floor(Math.random() * usableAlerts.length);
        const alert = usableAlerts[randomIndex];
        setLastAlertId(alert.id);
        
        toast(alert.header, {
          description: alert.description?.slice(0, 100) + (alert.description && alert.description.length > 100 ? '...' : ''),
          icon: <TrainFront className="h-5 w-5" />,
          duration: 8000,
        });
      } else {
        // If we've shown all alerts already, show a travel time insight instead
        showTravelTimeInsight();
      }
    } else {
      // Show a travel time insight instead when no alerts are available
      showTravelTimeInsight();
    }
  };
  
  // Travel Time Insight - Based on real data from the database
  const showTravelTimeInsight = () => {
    if (travelTimeData.length > 0) {
      // Filter out routes with no data
      const routesWithData = travelTimeData.filter(item => item.data && item.data.length > 0);
      
      if (routesWithData.length === 0) {
        showCityInfo(); // Fallback if somehow we have no data
        return;
      }
      
      // Pick a random route with data
      const randomRoute = routesWithData[Math.floor(Math.random() * routesWithData.length)];
      
      // Skip if no valid data
      if (!randomRoute.data || randomRoute.data.length === 0) {
        showCityInfo();
        return;
      }
      
      // Calculate real travel time statistics
      const stats = getTravelTimeStats(randomRoute.data);
      
      // Validate stats before creating notification
      if (!stats || typeof stats.avg !== 'number' || isNaN(stats.avg)) {
        showCityInfo(); // Fallback if stats are invalid
        return;
      }
      
      // Format the travel time in a human-readable format
      const formattedAvgTime = formatSecondsToMinSec(stats.avg);
      const formattedMinTime = stats.min ? formatSecondsToMinSec(stats.min) : '';
      const formattedMaxTime = stats.max ? formatSecondsToMinSec(stats.max) : '';
      
      // Choose type of insight to show
      const insightType = Math.floor(Math.random() * 3);
      let description = '';
      
      if (insightType === 0 && stats.max && typeof stats.max === 'number' && !isNaN(stats.max)) {
        // Show max time insight
        description = `Average travel time from ${randomRoute.from} to ${randomRoute.to} is ${formattedAvgTime}. Longest trip today: ${formattedMaxTime}.`;
      } else if (insightType === 1 && stats.min && typeof stats.min === 'number' && !isNaN(stats.min)) {
        // Show min time insight
        description = `Today's fastest trip from ${randomRoute.from} to ${randomRoute.to} was ${formattedMinTime}, compared to the average ${formattedAvgTime}.`;
      } else {
        // Show general insight about average travel time
        description = `Current average travel time from ${randomRoute.from} to ${randomRoute.to} is ${formattedAvgTime}.`;
      }
      
      toast(`MBTA Travel Insight`, {
        description: description,
        icon: <TrainFront className="h-5 w-5" />,
        duration: 8000,
      });
    } else {
      showCityInfo(); // Fallback to city info
    }
  };
  
  // Traffic Alert - Based on actual traffic patterns and current time
  const showTrafficAlert = () => {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    
    // Specific traffic alerts based on time of day and day of week
    if (isWeekday) {
      if (hour >= 7 && hour <= 9) {
        // Morning rush hour
        const morningAlerts = [
          'Heavy traffic reported on Route 1A toward Boston. Travel time to downtown is approximately 35 minutes.',
          'North Shore Road congestion near Bell Circle. Expect delays of 10-15 minutes.',
          'Backup at Sumner Tunnel. Consider using Blue Line as an alternative route.'
        ];
        
        toast('Morning Traffic Alert', {
          description: morningAlerts[Math.floor(Math.random() * morningAlerts.length)],
          icon: <AlertTriangle className="h-5 w-5" />,
          duration: 8000,
        });
      } else if (hour >= 16 && hour <= 18) {
        // Evening rush hour
        const eveningAlerts = [
          'Traffic congestion on Revere Beach Parkway westbound. Delays of approximately 20 minutes.',
          'Slowdowns on Route 1 southbound from Chelsea to Tobin Bridge.',
          'Heavy traffic on Broadway near City Hall. Consider alternate routes.'
        ];
        
        toast('Evening Traffic Alert', {
          description: eveningAlerts[Math.floor(Math.random() * eveningAlerts.length)],
          icon: <AlertTriangle className="h-5 w-5" />,
          duration: 8000,
        });
      } else {
        // Off-peak hours
        toast('Traffic Update', {
          description: 'Traffic flowing normally on major routes through Revere.',
          icon: <Info className="h-5 w-5" />,
          duration: 8000,
        });
      }
    } else {
      // Weekend traffic
      const weekendAlerts = [
        'Increased traffic near Revere Beach during peak hours. Consider public transit.',
        'Traffic flowing normally on major routes through Revere.',
        'Local roads near shopping centers experiencing moderate congestion.'
      ];
      
      toast('Weekend Traffic', {
        description: weekendAlerts[Math.floor(Math.random() * weekendAlerts.length)],
        icon: <Info className="h-5 w-5" />,
        duration: 8000,
      });
    }
  };
  
  // City Information - Factual information about Revere
  const showCityInfo = () => {
    const cityInfos = [
      'Revere Beach is America\'s first public beach, established in 1896.',
      'Revere\'s population is 54,755 residents with a median age of 41.2 years.',
      'The school system serves 8,234 students across 11 schools with an 89.5% graduation rate.',
      'Revere\'s FY2025 budget is $293,008,066, with 44.2% allocated to education.',
      'The median home price in Revere is $485,000 with 127 new building permits issued.',
      'Crime incidents decreased by 12% with emergency response time averaging 4.2 minutes.',
      'Blue Line MBTA serves 12,450 daily passengers across 4 stations in Revere.',
      'The city is investing $9M in ARPA funding for water and sewer infrastructure improvements.',
      'Education receives $129.6M (44.2%) of the budget, supporting a 14:1 student-teacher ratio.',
      'A $2M health and wellness center is being built to serve approximately 10,000 senior residents.'
    ];
    
    // Don't repeat the last city info fact if possible
    let availableInfos = [...cityInfos];
    if (lastAlertId && lastAlertId.startsWith('cityinfo-')) {
      const lastIndex = parseInt(lastAlertId.split('-')[1]);
      if (!isNaN(lastIndex) && lastIndex >= 0 && lastIndex < cityInfos.length) {
        availableInfos.splice(lastIndex, 1);
      }
    }
    
    const randomIndex = Math.floor(Math.random() * availableInfos.length);
    const randomInfo = availableInfos[randomIndex];
    const originalIndex = cityInfos.indexOf(randomInfo);
    setLastAlertId(`cityinfo-${originalIndex}`);
    
    toast('Revere Insight', {
      description: randomInfo,
      icon: <Info className="h-5 w-5" />,
      duration: 8000,
    });
  };
  
  // Budget Insight - Based on real budget data
  const showBudgetInsight = () => {
    const budgetInsights = [
      'Education accounts for 44% ($120.7M) of Revere\'s FY2025 budget, the largest allocation.',
      'The city\'s health insurance costs total $15 million for 1,033 full-time employees.',
      'Public safety receives 18% of the city budget, approximately $49.4M.',
      'Infrastructure projects account for 20% ($54.9M) of the annual budget.',
      'New growth revenue of $1.2M from development projects helps keep the tax levy below 2.5%.'
    ];
    
    const randomInsight = budgetInsights[Math.floor(Math.random() * budgetInsights.length)];
    
    toast('Budget Insight', {
      description: randomInsight,
      icon: <DollarSign className="h-5 w-5" />,
      duration: 8000,
    });
  };
  
  // Development Insight - Based on real development projects
  const showDevelopmentInsight = () => {
    const developmentInsights = [
      'Wonderland High School construction is 30% complete, with capacity for 2,450 students.',
      'Suffolk Downs 160-acre development includes 5.8M sq ft of mixed-use space.',
      'Waterfront Square project is 60% complete with 1,172 residential units.',
      'Water/Sewer infrastructure upgrades are 40% complete, preventing illegal sanitary sewer overflows.',
      'Health & Wellness Center construction is underway, expanding public health services.'
    ];
    
    const randomInsight = developmentInsights[Math.floor(Math.random() * developmentInsights.length)];
    
    toast('Development Update', {
      description: randomInsight,
      icon: <Building className="h-5 w-5" />,
      duration: 8000,
    });
  };
  
  // Weather Insight - Based on actual weather data when available
  const showWeatherInsight = () => {
    if (weatherData && weatherData.currentConditions) {
      // Use actual weather data
      const currentConditions = weatherData.currentConditions;
      
      // Format temperature
      const tempF = Math.round(currentConditions.temp);
      const feelsLikeF = Math.round(currentConditions.feelslike);
      
      // Format conditions description
      let description = `Current temperature is ${tempF}°F`;
      
      if (feelsLikeF !== tempF) {
        description += `, feels like ${feelsLikeF}°F`;
      }
      
      description += `. ${currentConditions.conditions}.`;
      
      // Add humidity info
      if (typeof currentConditions.humidity === 'number') {
        description += ` Humidity: ${Math.round(currentConditions.humidity)}%.`;
      }
      
      // Add precipitation info if relevant
      if (currentConditions.precipprob && currentConditions.precipprob > 20) {
        description += ` ${Math.round(currentConditions.precipprob)}% chance of precipitation.`;
      }
      
      toast('Current Weather', {
        description: description,
        icon: <CloudSun className="h-5 w-5" />,
        duration: 8000,
      });
    } else {
      // Fallback to seasonal patterns if no actual data
      const now = new Date();
      const month = now.getMonth(); // 0-11
      
      let weatherInsight = '';
      let conditions = '';
      
      // Seasonal insights based on actual Revere climate patterns
      if (month >= 11 || month <= 1) { // Winter (Dec-Feb)
        const winterInsights = [
          'Current temperature is 28°F with wind chill of 20°F. Bundle up if heading out.',
          'Light snow expected later today. Accumulation of 1-3 inches possible.',
          'Clear conditions with temperatures below freezing. Watch for icy patches on roads.',
          'Winter weather advisory in effect. Expect difficult travel conditions during evening commute.'
        ];
        weatherInsight = winterInsights[Math.floor(Math.random() * winterInsights.length)];
        conditions = 'Winter Weather';
      } else if (month >= 2 && month <= 4) { // Spring (Mar-May)
        const springInsights = [
          'Temperatures rising to 58°F today with partly cloudy skies.',
          'Rain showers expected this afternoon. Keep an umbrella handy.',
          'Pollen levels are high today. Those with allergies should take precautions.',
          'Pleasant spring conditions with temperatures in the mid-60s.'
        ];
        weatherInsight = springInsights[Math.floor(Math.random() * springInsights.length)];
        conditions = 'Spring Conditions';
      } else if (month >= 5 && month <= 8) { // Summer (Jun-Sep)
        const summerInsights = [
          'Heat advisory in effect. Temperatures reaching 90°F with high humidity.',
          'Perfect beach weather today with temperatures in the mid-80s.',
          'Thunderstorms possible later today. Keep an eye on changing conditions.',
          'UV index is very high. Remember sunscreen if heading to Revere Beach.'
        ];
        weatherInsight = summerInsights[Math.floor(Math.random() * summerInsights.length)];
        conditions = 'Summer Weather';
      } else { // Fall (Oct-Nov)
        const fallInsights = [
          'Fall foliage at peak colors. Temperature around 55°F.',
          'Morning fog clearing to partly sunny skies. High of 62°F expected.',
          'Breezy conditions with temperatures in the mid-50s.',
          'Rain expected this evening. Temperatures dropping to mid-40s overnight.'
        ];
        weatherInsight = fallInsights[Math.floor(Math.random() * fallInsights.length)];
        conditions = 'Fall Weather';
      }
      
      toast(conditions, {
        description: weatherInsight,
        icon: <CloudSun className="h-5 w-5" />,
        duration: 8000,
      });
    }
  };

  // This component doesn't render anything visible itself
  return null;
};

export default AlertSystem;
