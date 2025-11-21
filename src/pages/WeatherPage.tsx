
import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatCard from "@/components/cards/StatCard";
import { Cloud, Sun, Wind, Thermometer, Droplet, Gauge, Sunrise, Sunset, Umbrella, Eye, RefreshCw } from "lucide-react";
import LineChart from "@/components/charts/LineChart";
import { toast } from "sonner";
import { getLatestWeatherData, refreshWeatherData } from "@/services/weatherService";
import type { WeatherData } from "@/services/weatherService";

const WeatherPage: React.FC = () => {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Format temperature function
  const formatTemp = (temp: number) => {
    return `${Math.round(temp)}°F`;
  };
  
  // Get icon component based on weather condition icon
  const getWeatherIcon = (icon: string) => {
    switch(icon) {
      case "rain":
      case "showers-day":
      case "showers-night":
        return <Cloud className="h-5 w-5 text-blue-400" />;
      case "cloudy":
      case "partly-cloudy-day":
      case "partly-cloudy-night":
        return <Cloud className="h-5 w-5 text-gray-400" />;
      case "wind":
        return <Wind className="h-5 w-5 text-gray-400" />;
      case "clear-day":
        return <Sun className="h-5 w-5 text-yellow-400" />;
      default:
        return <Sun className="h-5 w-5 text-yellow-400" />;
    }
  };

  // Format timestamp to readable time
  const formatTime = (timestamp: string) => {
    const time = timestamp.split(':');
    const hour = parseInt(time[0]);
    const minute = time[1];
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minute} ${period}`;
  };

  // Format date from ISO string
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }).format(date);
  };

  // Refresh weather data function
  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setError(null);
      
      const data = await refreshWeatherData();
      
      if (data) {
        console.log("Weather data refreshed:", data);
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
          console.log("Weather data loaded:", data);
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
  
  // Prepare hourly temperature data for chart
  const prepareHourlyTempData = () => {
    if (!weatherData || !weatherData.days || weatherData.days.length === 0) {
      return [];
    }
    
    const today = weatherData.days[0];
    
    return today.hours.slice(0, 24).map(hour => {
      const timeStr = hour.datetime.split(':')[0];
      const timeNum = parseInt(timeStr);
      let displayTime = timeNum;
      const amPm = timeNum >= 12 ? 'PM' : 'AM';
      
      if (timeNum === 0) {
        displayTime = 12;
      } else if (timeNum > 12) {
        displayTime = timeNum - 12;
      }
      
      return {
        name: `${displayTime}${amPm}`,
        value: Math.round(hour.temp)
      };
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Weather Dashboard: {weatherData?.resolvedAddress || "Revere, MA"}</h1>
            <p className="text-muted-foreground mt-2">
              Current weather conditions and forecast for {weatherData?.resolvedAddress || "Revere"}
              {weatherData?.fetchTimestamp && (
                <span className="text-xs ml-2">
                  (Updated: {new Date(weatherData.fetchTimestamp).toLocaleTimeString()})
                </span>
              )}
            </p>
          </div>
          <Button 
            onClick={handleRefresh} 
            disabled={refreshing || loading}
            className="flex items-center gap-1"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> 
            {refreshing ? 'Refreshing...' : 'Refresh Weather'}
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <Card className="p-6">
            <div className="text-center text-red-500">{error}</div>
          </Card>
        ) : weatherData && (
          <>
            {/* Current Weather Conditions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="bg-primary/10 p-3 rounded-full">
                    {getWeatherIcon(weatherData.currentConditions.icon)}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">
                      {formatTemp(weatherData.currentConditions.temp)}
                    </h3>
                    <p className="text-muted-foreground">
                      {weatherData.currentConditions.conditions}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Feels like {formatTemp(weatherData.currentConditions.feelslike)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Updated: {formatTime(weatherData.currentConditions.datetime)}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-medium mb-4">Today's Forecast</h3>
                <div className="flex justify-between">
                  <div className="text-center">
                    <p className="text-muted-foreground text-xs">High</p>
                    <p className="text-lg font-bold">
                      {weatherData.days[0].tempmax ? formatTemp(weatherData.days[0].tempmax) : 'N/A'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground text-xs">Low</p>
                    <p className="text-lg font-bold">
                      {weatherData.days[0].tempmin ? formatTemp(weatherData.days[0].tempmin) : 'N/A'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground text-xs">Wind</p>
                    <p className="text-lg font-bold">{weatherData.days[0].windspeed} mph</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground text-xs">Rain</p>
                    <p className="text-lg font-bold">{weatherData.days[0].precipprob}%</p>
                  </div>
                </div>
                <div className="mt-4 text-sm">
                  <p>{weatherData.days[0].description}</p>
                </div>
              </Card>
            </div>

            {/* Weather Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatCard 
                title="Temperature" 
                value={formatTemp(weatherData.currentConditions.temp)} 
                icon={<Thermometer className="h-5 w-5" />}
                footnote={`Feels like ${formatTemp(weatherData.currentConditions.feelslike)}`}
              />
              <StatCard 
                title="Humidity" 
                value={`${weatherData.currentConditions.humidity}%`} 
                icon={<Droplet className="h-5 w-5" />}
                footnote="Current humidity level"
              />
              <StatCard 
                title="Wind Speed" 
                value={`${weatherData.currentConditions.windspeed} mph`} 
                icon={<Wind className="h-5 w-5" />}
                footnote={`Wind direction ${weatherData.currentConditions.winddir}°`}
              />
              <StatCard 
                title="UV Index" 
                value={weatherData.currentConditions.uvindex.toString()} 
                icon={<Sun className="h-5 w-5" />}
                footnote="Current UV radiation level"
              />
            </div>

            {/* Additional Weather Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatCard 
                title="Dew Point" 
                value={`${Math.round(weatherData.currentConditions.dew)}°F`} 
                icon={<Droplet className="h-5 w-5" />}
                footnote="Current dew point"
              />
              <StatCard 
                title="Pressure" 
                value={`${weatherData.currentConditions.pressure} mb`} 
                icon={<Gauge className="h-5 w-5" />}
                footnote="Barometric pressure"
              />
              <StatCard 
                title="Visibility" 
                value={`${weatherData.currentConditions.visibility} mi`} 
                icon={<Eye className="h-5 w-5" />}
                footnote="Current visibility"
              />
              <StatCard 
                title="Precipitation" 
                value={`${weatherData.days[0].precipprob}%`} 
                icon={<Umbrella className="h-5 w-5" />}
                footnote={`${weatherData.days[0].precip} in expected`}
              />
            </div>

            {/* Sunrise/Sunset Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Sunrise className="h-8 w-8 text-orange-400 mr-4" />
                    <div>
                      <p className="text-sm font-medium">Sunrise</p>
                      <p className="text-2xl font-bold">{formatTime(weatherData.currentConditions.sunrise)}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Sunset className="h-8 w-8 text-red-400 mr-4" />
                    <div>
                      <p className="text-sm font-medium">Sunset</p>
                      <p className="text-2xl font-bold">{formatTime(weatherData.currentConditions.sunset)}</p>
                    </div>
                  </div>
                </div>
              </Card>
              
              <Card className="p-6">
                <h3 className="text-lg font-medium mb-2">Weather Description</h3>
                <p className="text-base">{weatherData.days[0].description}</p>
                <div className="flex items-center mt-4">
                  <div className="bg-primary/10 p-2 rounded-full mr-3">
                    {getWeatherIcon(weatherData.days[0].icon)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(weatherData.days[0].datetime)}
                  </div>
                </div>
              </Card>
            </div>

            {/* Hourly Temperature Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Today's Temperature Forecast</CardTitle>
              </CardHeader>
              <CardContent>
                <LineChart 
                  data={prepareHourlyTempData()} 
                  color="#FF5722"
                  yAxisLabel="Temperature (°F)"
                  height={300}
                />
              </CardContent>
            </Card>

            {/* Weather Conditions */}
            <Card>
              <CardHeader>
                <CardTitle>Weather Conditions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground mb-4">
                  {weatherData.days[0].conditions} throughout the day.
                  {weatherData.days[0].precipprob > 30 ? 
                    ` ${weatherData.days[0].precipprob}% chance of precipitation.` : ''}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div className="bg-card/50 p-4 rounded-lg border">
                    <h4 className="font-medium mb-2">Cloud Cover</h4>
                    <div className="flex items-center justify-between">
                      <Cloud className="h-5 w-5 text-blue-400" />
                      <span className="text-2xl font-bold">{weatherData.currentConditions.cloudcover}%</span>
                    </div>
                  </div>
                  <div className="bg-card/50 p-4 rounded-lg border">
                    <h4 className="font-medium mb-2">Precipitation</h4>
                    <div className="flex items-center justify-between">
                      <Cloud className="h-5 w-5 text-blue-500" />
                      <span className="text-2xl font-bold">{weatherData.days[0].precipprob}%</span>
                    </div>
                  </div>
                  <div className="bg-card/50 p-4 rounded-lg border">
                    <h4 className="font-medium mb-2">Solar Energy</h4>
                    <div className="flex items-center justify-between">
                      <Sun className="h-5 w-5 text-yellow-400" />
                      <span className="text-2xl font-bold">
                        {weatherData.currentConditions.solarenergy} MJ/m²
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default WeatherPage;
