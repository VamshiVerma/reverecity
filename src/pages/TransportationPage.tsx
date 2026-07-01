
import DashboardLayout from "@/components/DashboardLayout";
import { Bus, Clock, Car, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatCard from "@/components/cards/StatCard";
import { Card, CardContent } from "@/components/ui/card";
import PieChart from "@/components/charts/PieChart";
import BarChart from "@/components/charts/BarChart";

const TransportationPage = () => {
  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-light-text flex items-center">
          <Bus className="mr-3 text-highlight" /> Transportation
        </h1>
        <p className="text-gray-400 mt-2">
          Explore transportation data for Revere, Massachusetts, including commute time, modes of transportation, and car ownership statistics.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Average Commute Time"
          value="35.1 min"
          icon={<Clock size={20} />}
          change={{ value: 1.2, isPositive: false }}
        />
        <StatCard
          title="Most Common Mode"
          value="Driving Alone"
          icon={<Car size={20} />}
          change={{ value: 0.3, isPositive: true }}
        />
        <StatCard
          title="Average Car Ownership"
          value="2 cars"
          icon={<Car size={20} />}
        />
      </div>

      <div className="glass-card p-4 rounded-lg mb-6">
        <Tabs defaultValue="commute" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="commute">Commute Time</TabsTrigger>
            <TabsTrigger value="mode">Transport Modes</TabsTrigger>
            <TabsTrigger value="cars">Car Ownership</TabsTrigger>
          </TabsList>
          
          <TabsContent value="commute" className="mt-4">
            <h2 className="text-xl font-semibold text-light-text mb-4">Commute Time</h2>
            <div className="h-80">
              <BarChart
                data={[
                  { name: "<10 min", value: 10 },
                  { name: "10-19 min", value: 22 },
                  { name: "20-29 min", value: 20 },
                  { name: "30-44 min", value: 25 },
                  { name: "45-59 min", value: 13 },
                  { name: "60+ min", value: 10 }
                ]}
                color="#673AB7"
                yAxisLabel="% of commuters"
                height={300}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <Card className="bg-card/40 border border-white/10">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-2">Longer Than Average</h3>
                  <p className="text-gray-300">
                    Employees in Revere, MA have a longer commute time (35.1 minutes) than the normal US worker (26.6 minutes).
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-card/40 border border-white/10">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-2">Super Commuters</h3>
                  <p className="text-gray-300">
                    3.48% of the workforce in Revere, MA have "super commutes" in excess of 90 minutes.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="mode" className="mt-4">
            <h2 className="text-xl font-semibold text-light-text mb-4">Mode of Transportation</h2>
            <div className="h-80">
              <PieChart
                data={[
                  { name: "Drove Alone", value: 58 },
                  { name: "Public Transit", value: 18 },
                  { name: "Carpooled", value: 12 },
                  { name: "Walked", value: 6 },
                  { name: "Worked from Home", value: 5 },
                  { name: "Other", value: 1 }
                ]}
                colors={["#2196F3", "#4CAF50", "#FF9800", "#9C27B0", "#F44336", "#607D8B"]}
                height={300}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <Card className="bg-card/40 border border-white/10">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-2">Drove Alone</h3>
                  <p className="text-gray-300">
                    <span className="text-2xl font-bold">53.5%</span> of workers drove alone to work in 2023.
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-card/40 border border-white/10">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-2">Public Transit</h3>
                  <p className="text-gray-300">
                    <span className="text-2xl font-bold">23.9%</span> of workers used public transit to commute.
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-card/40 border border-white/10">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-2">Carpooled</h3>
                  <p className="text-gray-300">
                    <span className="text-2xl font-bold">10.4%</span> of workers carpooled to their workplace.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="cars" className="mt-4">
            <h2 className="text-xl font-semibold text-light-text mb-4">Car Ownership</h2>
            <div className="h-80">
              <BarChart
                data={[
                  { name: "No vehicle", value: 14 },
                  { name: "1 vehicle", value: 38 },
                  { name: "2 vehicles", value: 33 },
                  { name: "3+ vehicles", value: 15 }
                ]}
                color="#795548"
                yAxisLabel="% of households"
                height={300}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <Card className="bg-card/40 border border-white/10">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-2">Average Ownership</h3>
                  <p className="text-gray-300">
                    The largest share of households in Revere, MA have 2 cars, which is consistent with national averages.
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-card/40 border border-white/10">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-2">Comparison</h3>
                  <p className="text-gray-300">
                    Revere's car ownership distribution closely mirrors national trends, with slight variations in multi-car households.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default TransportationPage;
