
import { useState, useEffect } from "react";
import { 
  Cloud, 
  Droplet, 
  Thermometer, 
  Wind, 
  Sun, 
  Umbrella, 
  Snowflake,
  CloudRain,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/cards/StatCard";
import LineChart from "@/components/charts/LineChart";
import BarChart from "@/components/charts/BarChart";
import RevenueBarChart from "@/components/charts/RevenueBarChart";
import BudgetPieChart from "@/components/charts/BudgetPieChart";
import DataTable from "@/components/DataTable";
import PlaceholderMap from "@/components/PlaceholderMap";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getLatestWeatherData, refreshWeatherData } from "@/services/weatherService";
import { toast } from "sonner";
import type { WeatherData } from "@/services/weatherService";

const ClimatePage = () => {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Refresh weather data function
  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setError(null);
      
      const data = await refreshWeatherData();
      
      if (data) {
        console.log("Weather data refreshed for climate page:", data);
        setWeatherData(data);
        toast.success("Weather data successfully refreshed");
      } else {
        throw new Error('Failed to refresh weather data');
      }
    } catch (err) {
      setError("Error refreshing weather data. Please try again later.");
      toast.error("Failed to refresh weather data");
      console.error("Weather data refresh error:", err);
    } finally {
      setRefreshing(false);
    }
  };

  // Fetch weather data from Supabase
  useEffect(() => {
    const fetchWeatherData = async () => {
      try {
        const data = await getLatestWeatherData();
        
        if (data) {
          console.log("Weather data loaded for climate page:", data);
          setWeatherData(data);
        } else {
          throw new Error('Failed to fetch weather data');
        }
      } catch (err) {
        setError("Error fetching weather data. Please try again later.");
        toast.error("Failed to load weather data");
        console.error("Weather data fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchWeatherData();
  }, []);

  // Revenue data based on the provided analysis
  const propertyTaxesData = [
    { year: "2016", actualAmount: 102178663, budgetedAmount: null, isFutureYear: false },
    { year: "2017", actualAmount: 103633382, budgetedAmount: null, isFutureYear: false },
    { year: "2018", actualAmount: 107451253, budgetedAmount: null, isFutureYear: false },
    { year: "2019", actualAmount: 109514192, budgetedAmount: 110160035, isFutureYear: false },
    { year: "2020", actualAmount: 111902828, budgetedAmount: 111587613, isFutureYear: false },
    { year: "2021", actualAmount: 114566415, budgetedAmount: 113883326, isFutureYear: false },
    { year: "2022", actualAmount: 115173941, budgetedAmount: 116231620, isFutureYear: false },
    { year: "2023", actualAmount: null, budgetedAmount: 117982440, isFutureYear: true },
    { year: "2024", actualAmount: null, budgetedAmount: 119502885, isFutureYear: true },
    { year: "2025", actualAmount: null, budgetedAmount: 120086119, isFutureYear: true }
  ];

  // Overall FY2025 Revenue breakdown for pie chart
  const revenuePieData = [
    { name: "Property Taxes", value: 120086119, percentage: 40.7, color: "#4ade80" },
    { name: "Cherry Sheet Revenue", value: 117487079, percentage: 39.9, color: "#3b82f6" },
    { name: "Charges and Fees", value: 32241502, percentage: 10.9, color: "#8b5cf6" },
    { name: "Local Receipts", value: 22025000, percentage: 7.5, color: "#ec4899" },
    { name: "Other Income", value: 2840000, percentage: 1.0, color: "#f97316" }
  ];

  const totalRevenue = 294679700; // Sum of all revenue for FY2025

  // Prepare temperature data from actual weather data
  const prepareTemperatureData = () => {
    if (!weatherData || !weatherData.days || weatherData.days.length === 0) {
      return temperatureData; // fallback to static data
    }
    
    // If we have hourly data, use it for a detailed temperature chart
    if (weatherData.days[0].hours && weatherData.days[0].hours.length > 0) {
      return weatherData.days[0].hours.map(hour => {
        const hourStr = hour.datetime.split(':')[0];
        let displayHour = parseInt(hourStr);
        const amPm = displayHour >= 12 ? 'PM' : 'AM';
        
        if (displayHour === 0) {
          displayHour = 12;
        } else if (displayHour > 12) {
          displayHour = displayHour - 12;
        }
        
        return {
          year: `${displayHour}${amPm}`,
          actualAmount: hour.temp,
          budgetedAmount: null,
          isFutureYear: false
        };
      });
    }
    
    return temperatureData; // fallback to static data
  };

  // Format text-based data
  const formatConditions = () => {
    if (!weatherData || !weatherData.currentConditions) {
      return "Unknown";
    }
    return weatherData.currentConditions.conditions || "Clear";
  };

  // Temperature data as static fallback
  const temperatureData = [
    { year: "Jan", actualAmount: 32, budgetedAmount: null, isFutureYear: false },
    { year: "Feb", actualAmount: 34, budgetedAmount: null, isFutureYear: false },
    { year: "Mar", actualAmount: 42, budgetedAmount: null, isFutureYear: false },
    { year: "Apr", actualAmount: 52, budgetedAmount: null, isFutureYear: false },
    { year: "May", actualAmount: 62, budgetedAmount: null, isFutureYear: false },
    { year: "Jun", actualAmount: 72, budgetedAmount: null, isFutureYear: false },
    { year: "Jul", actualAmount: 78, budgetedAmount: null, isFutureYear: false },
    { year: "Aug", actualAmount: 76, budgetedAmount: null, isFutureYear: false },
    { year: "Sep", actualAmount: 68, budgetedAmount: null, isFutureYear: false },
    { year: "Oct", actualAmount: 58, budgetedAmount: null, isFutureYear: false },
    { year: "Nov", actualAmount: 48, budgetedAmount: null, isFutureYear: false },
    { year: "Dec", actualAmount: 38, budgetedAmount: null, isFutureYear: false }
  ];

  // Climate category data
  const precipitationData = [
    { year: "Jan", actualAmount: 3.5, budgetedAmount: null, isFutureYear: false },
    { year: "Feb", actualAmount: 3.2, budgetedAmount: null, isFutureYear: false },
    { year: "Mar", actualAmount: 4.1, budgetedAmount: null, isFutureYear: false },
    { year: "Apr", actualAmount: 3.8, budgetedAmount: null, isFutureYear: false },
    { year: "May", actualAmount: 3.3, budgetedAmount: null, isFutureYear: false },
    { year: "Jun", actualAmount: 3.6, budgetedAmount: null, isFutureYear: false },
    { year: "Jul", actualAmount: 3.2, budgetedAmount: null, isFutureYear: false },
    { year: "Aug", actualAmount: 3.7, budgetedAmount: null, isFutureYear: false },
    { year: "Sep", actualAmount: 3.4, budgetedAmount: null, isFutureYear: false },
    { year: "Oct", actualAmount: 3.8, budgetedAmount: null, isFutureYear: false },
    { year: "Nov", actualAmount: 3.9, budgetedAmount: null, isFutureYear: false },
    { year: "Dec", actualAmount: 3.5, budgetedAmount: null, isFutureYear: false }
  ];

  const windSpeedData = [
    { year: "Jan", actualAmount: 12.5, budgetedAmount: null, isFutureYear: false },
    { year: "Feb", actualAmount: 13.2, budgetedAmount: null, isFutureYear: false },
    { year: "Mar", actualAmount: 14.1, budgetedAmount: null, isFutureYear: false },
    { year: "Apr", actualAmount: 11.8, budgetedAmount: null, isFutureYear: false },
    { year: "May", actualAmount: 10.3, budgetedAmount: null, isFutureYear: false },
    { year: "Jun", actualAmount: 9.6, budgetedAmount: null, isFutureYear: false },
    { year: "Jul", actualAmount: 8.2, budgetedAmount: null, isFutureYear: false },
    { year: "Aug", actualAmount: 8.7, budgetedAmount: null, isFutureYear: false },
    { year: "Sep", actualAmount: 9.4, budgetedAmount: null, isFutureYear: false },
    { year: "Oct", actualAmount: 10.8, budgetedAmount: null, isFutureYear: false },
    { year: "Nov", actualAmount: 11.9, budgetedAmount: null, isFutureYear: false },
    { year: "Dec", actualAmount: 12.5, budgetedAmount: null, isFutureYear: false }
  ];

  const snowfallData = [
    { year: "Jan", actualAmount: 14.5, budgetedAmount: null, isFutureYear: false },
    { year: "Feb", actualAmount: 12.2, budgetedAmount: null, isFutureYear: false },
    { year: "Mar", actualAmount: 8.1, budgetedAmount: null, isFutureYear: false },
    { year: "Apr", actualAmount: 1.8, budgetedAmount: null, isFutureYear: false },
    { year: "May", actualAmount: 0, budgetedAmount: null, isFutureYear: false },
    { year: "Jun", actualAmount: 0, budgetedAmount: null, isFutureYear: false },
    { year: "Jul", actualAmount: 0, budgetedAmount: null, isFutureYear: false },
    { year: "Aug", actualAmount: 0, budgetedAmount: null, isFutureYear: false },
    { year: "Sep", actualAmount: 0, budgetedAmount: null, isFutureYear: false },
    { year: "Oct", actualAmount: 0.2, budgetedAmount: null, isFutureYear: false },
    { year: "Nov", actualAmount: 3.9, budgetedAmount: null, isFutureYear: false },
    { year: "Dec", actualAmount: 9.5, budgetedAmount: null, isFutureYear: false }
  ];

  const humidityData = [
    { year: "Jan", actualAmount: 65, budgetedAmount: null, isFutureYear: false },
    { year: "Feb", actualAmount: 62, budgetedAmount: null, isFutureYear: false },
    { year: "Mar", actualAmount: 60, budgetedAmount: null, isFutureYear: false },
    { year: "Apr", actualAmount: 58, budgetedAmount: null, isFutureYear: false },
    { year: "May", actualAmount: 63, budgetedAmount: null, isFutureYear: false },
    { year: "Jun", actualAmount: 68, budgetedAmount: null, isFutureYear: false },
    { year: "Jul", actualAmount: 70, budgetedAmount: null, isFutureYear: false },
    { year: "Aug", actualAmount: 72, budgetedAmount: null, isFutureYear: false },
    { year: "Sep", actualAmount: 69, budgetedAmount: null, isFutureYear: false },
    { year: "Oct", actualAmount: 65, budgetedAmount: null, isFutureYear: false },
    { year: "Nov", actualAmount: 66, budgetedAmount: null, isFutureYear: false },
    { year: "Dec", actualAmount: 67, budgetedAmount: null, isFutureYear: false }
  ];

  const sunshineData = [
    { year: "Jan", actualAmount: 140, budgetedAmount: null, isFutureYear: false },
    { year: "Feb", actualAmount: 162, budgetedAmount: null, isFutureYear: false },
    { year: "Mar", actualAmount: 198, budgetedAmount: null, isFutureYear: false },
    { year: "Apr", actualAmount: 210, budgetedAmount: null, isFutureYear: false },
    { year: "May", actualAmount: 248, budgetedAmount: null, isFutureYear: false },
    { year: "Jun", actualAmount: 270, budgetedAmount: null, isFutureYear: false },
    { year: "Jul", actualAmount: 290, budgetedAmount: null, isFutureYear: false },
    { year: "Aug", actualAmount: 280, budgetedAmount: null, isFutureYear: false },
    { year: "Sep", actualAmount: 240, budgetedAmount: null, isFutureYear: false },
    { year: "Oct", actualAmount: 200, budgetedAmount: null, isFutureYear: false },
    { year: "Nov", actualAmount: 160, budgetedAmount: null, isFutureYear: false },
    { year: "Dec", actualAmount: 130, budgetedAmount: null, isFutureYear: false }
  ];

  // Climate pie chart data for monthly analysis
  const climateBreakdownData = [
    { name: "Temperature (°F)", value: 58, percentage: 28.0, color: "#f97316" },
    { name: "Precipitation (in)", value: 44, percentage: 21.2, color: "#3b82f6" },
    { name: "Wind Speed (mph)", value: 12, percentage: 5.8, color: "#8b5cf6" },
    { name: "Snowfall (in)", value: 50, percentage: 24.0, color: "#4ade80" },
    { name: "Humidity (%)", value: 65, percentage: 10.0, color: "#ec4899" },
    { name: "Sunshine (hrs)", value: 205, percentage: 11.0, color: "#eab308" }
  ];

  // Category summaries for tabs
  const categories = [
    {
      id: "temperature",
      icon: <Thermometer className="mr-2 h-4 w-4" />,
      label: "Temperature",
      description: "Temperature data in degrees Fahrenheit",
      color: "#f97316",
      data: prepareTemperatureData(),
      unit: "°F",
      realTimeValue: weatherData?.currentConditions?.temp ? 
        `${Math.round(weatherData.currentConditions.temp)}°F` : "58°F",
      change: { value: 1.2, isPositive: false }
    },
    {
      id: "precipitation",
      icon: <CloudRain className="mr-2 h-4 w-4" />,
      label: "Precipitation",
      description: "Precipitation in inches",
      color: "#3b82f6",
      data: precipitationData,
      unit: "in",
      realTimeValue: weatherData?.days?.[0]?.precip ? 
        `${weatherData.days[0].precip} in` : "44 in/yr",
      change: { value: 2.3, isPositive: true }
    },
    {
      id: "wind",
      icon: <Wind className="mr-2 h-4 w-4" />,
      label: "Wind Speed",
      description: "Average wind speed in miles per hour",
      color: "#8b5cf6",
      data: windSpeedData,
      unit: "mph",
      realTimeValue: weatherData?.currentConditions?.windspeed ? 
        `${weatherData.currentConditions.windspeed} mph` : "12 mph",
      change: { value: 0.8, isPositive: true }
    },
    {
      id: "snowfall",
      icon: <Snowflake className="mr-2 h-4 w-4" />,
      label: "Snowfall",
      description: "Snowfall in inches",
      color: "#4ade80",
      data: snowfallData,
      unit: "in",
      realTimeValue: weatherData?.days?.[0]?.snow !== undefined ? 
        `${weatherData.days[0].snow} in` : "0 in",
      change: { value: 0, isPositive: false }
    },
    {
      id: "humidity",
      icon: <Droplet className="mr-2 h-4 w-4" />,
      label: "Humidity",
      description: "Relative humidity percentage",
      color: "#ec4899",
      data: humidityData,
      unit: "%",
      realTimeValue: weatherData?.currentConditions?.humidity ? 
        `${weatherData.currentConditions.humidity}%` : "65%",
      change: { value: 0.5, isPositive: false }
    },
    {
      id: "sunshine",
      icon: <Sun className="mr-2 h-4 w-4" />,
      label: "Sunshine",
      description: "Hours of sunshine",
      color: "#eab308",
      data: sunshineData,
      unit: "hrs",
      realTimeValue: weatherData?.currentConditions?.solarenergy ? 
        `${weatherData.currentConditions.solarenergy} MJ/m²` : "205 days",
      change: { value: 0.5, isPositive: true }
    }
  ];

  return (
    <DashboardLayout>
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-3xl font-bold text-light-text flex items-center">
            <Cloud className="mr-3 text-blue-400" /> Climate
          </h1>
          <Button 
            onClick={handleRefresh} 
            disabled={refreshing || loading}
            className="flex items-center gap-1"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> 
            {refreshing ? 'Refreshing...' : 'Refresh Weather'}
          </Button>
        </div>
        <p className="text-gray-400 mt-2">
          Explore climate data, weather patterns, and environmental metrics for {weatherData?.resolvedAddress || "Revere, Massachusetts"}.
          {weatherData?.fetchTimestamp && (
            <span className="text-xs ml-2">
              (Updated: {new Date(weatherData.fetchTimestamp).toLocaleTimeString()})
            </span>
          )}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <Card className="p-6 mb-6">
          <div className="flex items-center text-red-500">
            <AlertTriangle className="mr-2" />
            <span>{error}</span>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {categories.slice(0, 4).map((category) => (
              <StatCard
                key={category.id}
                title={category.label}
                value={category.realTimeValue}
                icon={category.icon}
                change={category.change}
              />
            ))}
          </div>

          {weatherData && weatherData.currentConditions && (
            <Card className="mb-6 p-6">
              <div className="flex flex-col md:flex-row items-center justify-between">
                <div className="flex items-center mb-4 md:mb-0">
                  <div className="bg-primary/10 p-3 rounded-full mr-4">
                    {weatherData.currentConditions.icon === "rain" ? 
                      <CloudRain size={32} className="text-blue-500" /> : 
                      weatherData.currentConditions.icon === "partly-cloudy-day" ?
                      <Cloud size={32} className="text-gray-400" /> :
                      <Sun size={32} className="text-yellow-500" />
                    }
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">
                      {Math.round(weatherData.currentConditions.temp)}°F
                    </h3>
                    <p className="text-muted-foreground">
                      {weatherData.currentConditions.conditions}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Feels like {Math.round(weatherData.currentConditions.feelslike)}°F
                    </p>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Today's Forecast</h4>
                  <div className="flex items-center space-x-6">
                    <div className="text-center">
                      <p className="text-muted-foreground text-xs">High</p>
                      <p className="text-lg font-bold">
                        {weatherData.days[0].tempmax ? `${Math.round(weatherData.days[0].tempmax)}°F` : 'N/A'}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground text-xs">Low</p>
                      <p className="text-lg font-bold">
                        {weatherData.days[0].tempmin ? `${Math.round(weatherData.days[0].tempmin)}°F` : 'N/A'}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground text-xs">Rain</p>
                      <p className="text-lg font-bold">{weatherData.days[0].precipprob}%</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          <Tabs defaultValue="temperature" className="mb-6">
            <div className="glass-card p-4 rounded-lg mb-2">
              <h2 className="text-xl font-semibold text-light-text mb-4">Climate Categories</h2>
              <TabsList className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                {categories.map((category) => (
                  <TabsTrigger key={category.id} value={category.id} className="flex items-center">
                    {category.icon}
                    <span>{category.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {categories.map((category) => (
              <TabsContent key={category.id} value={category.id} className="mt-0">
                <Card className="glass-card border-none">
                  <CardHeader className="pb-2">
                    <div className="flex items-center">
                      <div className="mr-2">{category.icon}</div>
                      <div>
                        <CardTitle>{category.label}</CardTitle>
                        <CardDescription>{category.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <RevenueBarChart
                        title={`${category.label} (${category.unit})`}
                        data={category.data}
                        color={category.color}
                        height={350}
                      />
                      <LineChart
                        title={`${category.label} Trend`}
                        timeframe="Hourly Average"
                        color={category.color}
                        height={350}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-light-text mb-4">Climate Overview</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <BudgetPieChart
                title="Climate Metrics Distribution"
                data={climateBreakdownData}
                totalAmount={100}
                height={350}
              />
              
              <PlaceholderMap 
                title="Climate Zone Map" 
                height={350}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <DataTable
              title="Environmental Metrics"
              description="Key climate and environmental indicators"
              columns={[
                { key: "metric", label: "Metric" },
                { key: "value", label: "Current Value" },
                { key: "trend", label: "5-Year Trend" },
                { key: "impact", label: "City Impact" },
                { key: "status", label: "Status" },
                { key: "lastUpdated", label: "Last Updated" }
              ]}
              rowCount={8}
            />
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default ClimatePage;
