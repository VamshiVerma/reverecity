
import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Station } from "@/data/mbtaData";
import { Clock, MapPin, TrainFront, Bus, ArrowRight, ArrowLeft, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { TravelTimeData, fetchTravelTimes } from "@/services/mbtaService";
import { 
  fetchMBTALines, 
  fetchMBTAStations, 
  fetchBusConnections 
} from "@/services/mbtaSupabaseService";
import TravelTimeChart from "@/components/mbta/TravelTimeChart";
import MBTAAlerts from "@/components/mbta/MBTAAlerts";
import { toast } from "sonner";

const MBTAPage = () => {
  // Initializing date to the current day instead of potentially a previous date
  const [date, setDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState("Blue");
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [fromStation, setFromStation] = useState<Station | null>(null);
  const [toStation, setToStation] = useState<Station | null>(null);
  const [travelTimeData, setTravelTimeData] = useState<TravelTimeData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stations, setStations] = useState<Station[]>([]);
  const [busConnections, setBusConnections] = useState<{[stationId: string]: string[]}>({});
  const [isLoadingStations, setIsLoadingStations] = useState(true);

  // Load transit line data from Supabase
  useEffect(() => {
    const loadMBTAData = async () => {
      setIsLoadingStations(true);
      try {
        // Fetch stations data
        const stationsData = await fetchMBTAStations(activeTab);
        setStations(stationsData);
        
        // Fetch bus connections
        const connectionsData = await fetchBusConnections();
        setBusConnections(connectionsData);
        
        // Set default stations (Wonderland to Revere Beach)
        if (stationsData.length > 0) {
          const wonderland = stationsData.find(s => s.station === "place-wondl");
          const revereBeach = stationsData.find(s => s.station === "place-rbmnl");
          
          if (wonderland && revereBeach) {
            console.log("Setting default stations: Wonderland to Revere Beach");
            setFromStation(wonderland);
            setToStation(revereBeach);
          }
        }
        
      } catch (error) {
        console.error('Error loading MBTA data:', error);
        toast.error('Failed to load MBTA station data');
      } finally {
        setIsLoadingStations(false);
      }
    };

    loadMBTAData();
  }, [activeTab]);
  
  // Handle station selection
  const handleStationClick = (station: Station) => {
    setSelectedStation(station === selectedStation ? null : station);
    
    // If no origin station is selected, set this as origin
    if (!fromStation) {
      setFromStation(station);
      console.log(`Operation: Set origin station to ${station.stop_name}`);
    } 
    // If origin is already selected but destination isn't, set this as destination
    else if (!toStation && fromStation.station !== station.station) {
      setToStation(station);
      console.log(`Operation: Set destination station to ${station.stop_name}`);
    }
    // If both are selected, start over with this as origin
    else {
      setFromStation(station);
      setToStation(null);
      console.log(`Operation: Reset and set origin station to ${station.stop_name}`);
    }
  };

  // Function to get bus connections for a station
  const getStationBuses = (stationId: string) => {
    return busConnections[stationId] || [];
  };

  // Function to swap origin and destination stations
  const handleSwapStations = () => {
    if (fromStation && toStation) {
      console.log(`Operation: Swapping stations from ${fromStation.stop_name} → ${toStation.stop_name} to ${toStation.stop_name} → ${fromStation.stop_name}`);
      const temp = fromStation;
      setFromStation(toStation);
      setToStation(temp);
    }
  };

  // Fetch travel time data when stations or date changes
  useEffect(() => {
    const loadTravelTimes = async () => {
      if (fromStation && toStation) {
        setIsLoading(true);
        
        // Find the stop ID for the selected direction (southbound = 1)
        const fromStopId = fromStation.stops["1"]?.[0];
        const toStopId = toStation.stops["1"]?.[0];

        if (fromStopId && toStopId) {
          console.log(`Operation: Fetching travel times from ${fromStation.stop_name} (${fromStopId}) to ${toStation.stop_name} (${toStopId})`);
          // Use the selected date from the state
          const data = await fetchTravelTimes(date, fromStopId, toStopId);
          setTravelTimeData(data);
        } else {
          console.log(`Operation: Could not fetch travel times - missing stop IDs`);
          setTravelTimeData([]);
        }
        
        setIsLoading(false);
      }
    };

    loadTravelTimes();
  }, [fromStation, toStation, date]);

  return (
    <DashboardLayout pageTitle="MBTA Transit">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">MBTA Transit</h2>
            <p className="text-muted-foreground">
              View MBTA transit lines serving Revere and surrounding areas.
            </p>
          </div>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                <Calendar className="mr-2 h-4 w-4" />
                {format(date, "PPP")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                mode="single"
                selected={date}
                onSelect={(newDate) => {
                  if (newDate) {
                    console.log(`Operation: Changed date to ${format(newDate, "yyyy-MM-dd")}`);
                    setDate(newDate);
                  }
                }}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <Tabs defaultValue={activeTab} onValueChange={(value) => {
          console.log(`Operation: Changed transit line to ${value}`);
          setActiveTab(value);
        }} className="w-full">
          <TabsList className="bg-card border">
            <TabsTrigger value="Blue" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <div className="flex items-center gap-2">
                <TrainFront size={18} />
                <span>Blue Line</span>
              </div>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="Blue" className="mt-4">
            <div className="grid grid-cols-1 gap-6">
              {/* Travel Times Chart */}
              <TravelTimeChart 
                fromStation={fromStation}
                toStation={toStation}
                travelTimeData={travelTimeData}
                isLoading={isLoading}
                onSwapStations={handleSwapStations}
                onFromStationChange={setFromStation}
                onToStationChange={setToStation}
                stations={stations}
                date={date}
              />
              
              {isLoadingStations ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-10">
                    <div className="text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                      <p className="mt-2 text-muted-foreground">Loading transit data...</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrainFront className="h-5 w-5 text-blue-500" />
                      <span>Blue Line Transit Map</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <div className="min-w-[1200px]">
                        {/* Horizontal Map */}
                        <div className="relative p-6 flex flex-col">
                          {/* Blue Line - continuous line across all stations */}
                          <div className="absolute left-[40px] top-[30px] right-[40px] h-1.5 bg-blue-600"></div>
                          
                          {/* Stations */}
                          <div className="flex flex-col space-y-12">
                            <div className="flex items-start justify-between relative">
                              {stations.map((station, i) => {
                                const isFromStation = fromStation?.station === station.station;
                                const isToStation = toStation?.station === station.station;
                                const isSelected = isFromStation || isToStation;
                                
                                return (
                                  <div key={station.station} className="flex-1 relative">
                                    {/* Station marker */}
                                    <div className="absolute left-[40px] transform -translate-x-1/2 flex flex-col items-center">
                                      <div className={cn(
                                        "w-6 h-6 rounded-full border-2 flex items-center justify-center z-10",
                                        station.terminus ? "bg-blue-600 border-blue-700" : "bg-white border-blue-600",
                                        isFromStation && "ring-2 ring-offset-2 ring-blue-500",
                                        isToStation && "ring-2 ring-offset-2 ring-green-500"
                                      )}></div>
                                      
                                      {/* Vertical line connecting station to info */}
                                      <div className="w-0.5 h-8 bg-gray-300"></div>
                                    </div>
                                    
                                    {/* Station information card */}
                                    <div 
                                      className={cn(
                                        "mx-2 mt-10 p-3 border rounded-lg shadow-sm cursor-pointer bg-white dark:bg-gray-800",
                                        "transition-all duration-200 hover:shadow-md",
                                        isSelected && "ring-2",
                                        isFromStation && "ring-blue-500",
                                        isToStation && "ring-green-500"
                                      )}
                                      onClick={() => handleStationClick(station)}
                                      style={{ 
                                        minWidth: "100px",
                                        width: "90%",
                                        maxWidth: "150px"
                                      }}
                                    >
                                      <div className="flex flex-col space-y-1">
                                        <h3 className="font-medium text-sm">
                                          {station.stop_name}
                                          {station.short && <span className="text-xs text-muted-foreground ml-1">({station.short})</span>}
                                        </h3>
                                        
                                        {/* Bus connections */}
                                        {getStationBuses(station.station).length > 0 && (
                                          <div className="flex flex-wrap gap-1 mt-1">
                                            {getStationBuses(station.station).map((bus, busIdx) => (
                                              <span key={`${station.station}-${bus}-${busIdx}`} className="inline-flex h-5 w-auto px-1.5 items-center justify-center rounded-sm bg-yellow-400 text-[10px] font-medium text-yellow-950">
                                                {bus}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                        
                                        {/* Amenities icons */}
                                        <div className="flex items-center gap-1 text-muted-foreground">
                                          {station.accessible && (
                                            <span className="rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 p-0.5 text-xs">♿</span>
                                          )}
                                          {station.enclosed_bike_parking && (
                                            <span className="rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 p-0.5 text-xs">🚲</span>
                                          )}
                                          {station.pedal_park && (
                                            <span className="rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 p-0.5 text-xs">🅿️</span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Show more details when selected */}
                                      {selectedStation?.station === station.station && (
                                        <div className="mt-3 pt-2 border-t text-xs">
                                          <div className="grid grid-cols-2 gap-2">
                                            <div>
                                              <span className="text-muted-foreground">Order:</span> {station.order}
                                            </div>
                                            <div>
                                              <span className="text-muted-foreground">ID:</span> {station.station}
                                            </div>
                                          </div>
                                          <div className="mt-1">
                                            <div className="flex items-center gap-1 text-xs">
                                              <ArrowRight className="h-3 w-3 text-blue-500" />
                                              <span>Southbound: {station.stops["1"]?.join(", ")}</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-xs">
                                              <ArrowLeft className="h-3 w-3 text-blue-500" />
                                              <span>Northbound: {station.stops["0"]?.join(", ")}</span>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            
                            {/* Direction indicators */}
                            <div className="flex justify-between px-10">
                              <div className="flex items-center gap-1 text-sm">
                                <ArrowLeft className="h-4 w-4" /> 
                                <span>Northbound (Wonderland)</span>
                              </div>
                              <div className="flex items-center gap-1 text-sm">
                                <span>Southbound (Bowdoin)</span>
                                <ArrowRight className="h-4 w-4" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Service Alerts */}
              <MBTAAlerts stationId={selectedStation?.station} />

              {/* Schedule and Info Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bus className="h-5 w-5 text-yellow-500" />
                    <span>Bus Connections</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2">
                      <p className="text-sm text-muted-foreground mb-4">
                        The MBTA Blue Line connects with various bus routes that service the Greater Boston area.
                        Key bus connections are shown with yellow indicators at each station.
                      </p>
                      
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Station</TableHead>
                            <TableHead>Bus Routes</TableHead>
                            <TableHead>Service Areas</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell>Wonderland</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {getStationBuses("place-wondl").map((bus) => (
                                  <span key={bus} className="inline-flex h-5 w-auto px-1.5 items-center justify-center rounded-sm bg-yellow-400 text-[10px] font-medium text-yellow-950">
                                    {bus}
                                  </span>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>Revere, Chelsea, Lynn</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Orient Heights</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {getStationBuses("place-orhte").map((bus) => (
                                  <span key={bus} className="inline-flex h-5 w-auto px-1.5 items-center justify-center rounded-sm bg-yellow-400 text-[10px] font-medium text-yellow-950">
                                    {bus}
                                  </span>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>East Boston, Winthrop</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Airport</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {getStationBuses("place-aport").map((bus) => (
                                  <span key={bus} className="inline-flex h-5 w-auto px-1.5 items-center justify-center rounded-sm bg-yellow-400 text-[10px] font-medium text-yellow-950">
                                    {bus}
                                  </span>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>Logan Airport, Silver Line</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Government Center</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {getStationBuses("place-gover").map((bus) => (
                                  <span key={bus} className="inline-flex h-5 w-auto px-1.5 items-center justify-center rounded-sm bg-yellow-400 text-[10px] font-medium text-yellow-950">
                                    {bus}
                                  </span>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>Downtown, Green Line</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>

                    <div>
                      <div className="space-y-4">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                          <h4 className="font-medium mb-2">Blue Line Service</h4>
                          <p className="text-sm">The Blue Line connects Revere to Boston, running between Wonderland and Bowdoin stations.</p>
                        </div>

                        <div>
                          <h4 className="font-medium mb-2">Hours of Operation</h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>Mon-Sat</span>
                              <span>5:00 AM - 1:00 AM</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Sunday</span>
                              <span>6:00 AM - 12:00 AM</span>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium mb-2">Station Legend</h4>
                          <div className="space-y-1.5 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 p-0.5 text-xs">♿</span>
                              <span>Accessible</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 p-0.5 text-xs">🚲</span>
                              <span>Bike Parking</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 p-0.5 text-xs">🅿️</span>
                              <span>Pedal Park</span>
                            </div>
                          </div>
                        </div>

                        <Button variant="outline" className="w-full" asChild>
                          <a 
                            href="https://www.mbta.com/schedules/Blue/line" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-600"
                          >
                            <Clock className="mr-2 h-4 w-4" />
                            View Full Schedule
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default MBTAPage;
