import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { Clock, ChartLine, ArrowRight } from "lucide-react";
import { TravelTimeData, formatSecondsToMinSec, getTravelTimeStats } from "@/services/mbtaService";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Dot,
} from "recharts";
import { Station } from "@/data/mbtaData";
import { toast } from "sonner";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ChartDataPoint {
  time: string;
  hour: number;
  fullTime: string;
  seconds: number;
  formattedTime: string;
  benchmark: number;
}

interface TravelTimeChartProps {
  fromStation: Station | null;
  toStation: Station | null;
  travelTimeData: TravelTimeData[];
  isLoading: boolean;
  onSwapStations: () => void;
  onFromStationChange: (station: Station | null) => void;
  onToStationChange: (station: Station | null) => void;
  stations: Station[];
  date: Date;
}

const TravelTimeChart = ({ 
  fromStation, 
  toStation, 
  travelTimeData,
  isLoading,
  onSwapStations,
  onFromStationChange,
  onToStationChange,
  stations,
  date
}: TravelTimeChartProps) => {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  useEffect(() => {
    if (travelTimeData && travelTimeData.length > 0) {
      console.log(`Operation: Processing ${travelTimeData.length} travel time records for chart`);
      
      // Convert to chart data format with proper time sorting
      const formattedData: ChartDataPoint[] = travelTimeData.map(item => {
        // Parse the ISO string
        let parsedTime = parseISO(item.dep_dt);
        
        // Log the time for debugging
        console.log(`Original time: ${item.dep_dt}, Parsed time: ${format(parsedTime, "yyyy-MM-dd HH:mm:ss")}`);
        
        return {
          // Format for display with standard 12-hour time
          time: format(parsedTime, "h:mm a"),
          // Keep numeric hour for proper sorting
          hour: parsedTime.getHours() + (parsedTime.getMinutes() / 60),
          // Keep full time format for tooltip
          fullTime: format(parsedTime, "h:mm:ss a"),
          seconds: item.travel_time_sec,
          formattedTime: formatSecondsToMinSec(item.travel_time_sec),
          benchmark: item.benchmark_travel_time_sec
        };
      });
      
      // Sort by time (hour)
      formattedData.sort((a, b) => a.hour - b.hour);
      
      if (formattedData.length > 0) {
        console.log(`Processed ${formattedData.length} data points for chart display`);
        console.log(`Sample time point: ${formattedData[0].fullTime}, travel time: ${formattedData[0].formattedTime}`);
        toast.success(`Loaded ${travelTimeData.length} travel time records`);
      }
      
      setChartData(formattedData);
    } else {
      setChartData([]);
    }
  }, [travelTimeData]);

  const stats = getTravelTimeStats(travelTimeData);

  // Format Y-axis ticks to show minutes
  const formatYAxis = (value: number) => {
    return `${Math.floor(value / 60)}m${value % 60 !== 0 ? ' ' + (value % 60) + 's' : ''}`;
  };

  // Define custom dot renderer to control dot size and appearance
  const renderDot = (props: any) => {
    const { cx, cy } = props;
    return <Dot cx={cx} cy={cy} r={3} fill="#4ade80" stroke="none" />;
  };
  
  // Safe tooltip label formatter that handles undefined data
  const safeTooltipLabelFormatter = (label: any, data: any[]) => {
    if (!data || !data[0] || !data[0].payload) {
      return "No data";
    }
    return `Departure: ${data[0].payload.fullTime}`;
  };

  const handleFromStationChange = (value: string) => {
    const station = stations.find(s => s.station === value) || null;
    console.log(`Operation: Changed origin station to ${station?.stop_name || 'None'}`);
    onFromStationChange(station);
  };

  const handleToStationChange = (value: string) => {
    const station = stations.find(s => s.station === value) || null;
    console.log(`Operation: Changed destination station to ${station?.stop_name || 'None'}`);
    onToStationChange(station);
  };

  // Station selector component integrated into the travel times card
  const StationSelectors = () => (
    <Card className="mb-4 border-0 shadow-none bg-background">
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="w-full sm:w-2/5">
            <div className="font-medium mb-2 text-sm">Origin Station</div>
            <Select
              value={fromStation?.station || ""}
              onValueChange={handleFromStationChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select origin station" />
              </SelectTrigger>
              <SelectContent>
                {stations.map((station) => (
                  <SelectItem key={station.station} value={station.station}>
                    {station.stop_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center justify-center">
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>
          
          <div className="w-full sm:w-2/5">
            <div className="font-medium mb-2 text-sm">Destination Station</div>
            <Select
              value={toStation?.station || ""}
              onValueChange={handleToStationChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select destination station" />
              </SelectTrigger>
              <SelectContent>
                {stations.map((station) => (
                  <SelectItem key={station.station} value={station.station}>
                    {station.stop_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (!stations.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            <span>Travel Times</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <div className="flex flex-col items-center gap-3">
            <p className="text-muted-foreground">Loading stations...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {/* First add the station selector component at the top of the card */}
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            <span>Travel Times</span>
          </CardTitle>
          <div className="text-xs text-muted-foreground">
            {format(date, "EEEE, MMMM d, yyyy")}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Station selectors */}
        <StationSelectors />
        
        <div className="flex justify-between items-center mt-2 mb-4">
          {fromStation && toStation && (
            <div className="flex items-center gap-2 text-lg font-medium">
              <span className="text-blue-600">{fromStation.stop_name}</span>
              <span className="text-muted-foreground">to</span>
              <span className="text-blue-600">{toStation.stop_name}</span>
            </div>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              console.log("Operation: Swap stations (from chart)");
              onSwapStations();
            }}
            className="ml-auto"
          >
            Swap Stations
          </Button>
        </div>

        <div className="space-y-6">
          <div className="relative h-[300px] w-full">
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-pulse text-muted-foreground">Loading travel times...</div>
              </div>
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 20, right: 10, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="time" 
                    tick={{ fontSize: 11 }}
                    interval={Math.floor(chartData.length / 10)}
                    minTickGap={15}
                  />
                  <YAxis
                    domain={['dataMin - 10', 'dataMax + 10']}
                    tickFormatter={formatYAxis}
                    tick={{ fontSize: 11 }}
                    label={{ 
                      value: 'Minutes', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { textAnchor: 'middle', fontSize: 12 },
                      dy: 50
                    }}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatSecondsToMinSec(value), "Travel Time"]}
                    labelFormatter={safeTooltipLabelFormatter}
                  />
                  {chartData[0]?.benchmark && (
                    <ReferenceLine
                      y={chartData[0].benchmark}
                      stroke="rgba(239, 68, 68, 0.5)"
                      strokeDasharray="5 5"
                      label={{
                        value: "Scheduled",
                        position: "insideBottomLeft",
                        fontSize: 11,
                        fill: "#ef4444",
                      }}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="seconds"
                    stroke="#4ade80"
                    strokeWidth={1.5}
                    dot={renderDot}
                    activeDot={{ r: 6, fill: "#4ade80" }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-muted-foreground">No travel time data available for the selected stations and date</div>
              </div>
            )}
          </div>

          {chartData.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 border-t pt-4">
              <div className="p-2 text-center">
                <div className="text-sm text-muted-foreground">Average</div>
                <div className="text-lg font-bold">{formatSecondsToMinSec(stats.avg)}</div>
              </div>
              <div className="p-2 text-center">
                <div className="text-sm text-muted-foreground">Median</div>
                <div className="text-lg font-bold">{formatSecondsToMinSec(stats.median)}</div>
              </div>
              <div className="p-2 text-center">
                <div className="text-sm text-muted-foreground">Min</div>
                <div className="text-lg font-bold">{formatSecondsToMinSec(stats.min)}</div>
              </div>
              <div className="p-2 text-center">
                <div className="text-sm text-muted-foreground">Max</div>
                <div className="text-lg font-bold">{formatSecondsToMinSec(stats.max)}</div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TravelTimeChart;
