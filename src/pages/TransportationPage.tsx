
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
            <h2 className="text-xl font-semibold text-foreground mb-4">Commute Time</h2>
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
                color="#b9e3fb"
                yAxisLabel="% of commuters"
                height={300}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <Card className="bg-card/40 border border-border">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-2">Longer Than Average</h3>
                  <p className="text-foreground/80">
                    Employees in Revere, MA have a longer commute time (35.1 minutes) than the normal US worker (26.6 minutes).
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-card/40 border border-border">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-2">Super Commuters</h3>
                  <p className="text-foreground/80">
                    3.48% of the workforce in Revere, MA have "super commutes" in excess of 90 minutes.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="mode" className="mt-4">
            <h2 className="text-xl font-semibold text-foreground mb-4">Mode of Transportation</h2>
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
                colors={["#0297DE", "#8a9ba8", "#FC734D", "#5cc6ff", "#f4a58a", "#2f7fb3"]}
                height={300}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <Card className="bg-card/40 border border-border">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-2">Drove Alone</h3>
                  <p className="text-foreground/80">
                    <span className="text-2xl font-bold">53.5%</span> of workers drove alone to work in 2023.
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-card/40 border border-border">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-2">Public Transit</h3>
                  <p className="text-foreground/80">
                    <span className="text-2xl font-bold">23.9%</span> of workers used public transit to commute.
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-card/40 border border-border">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-2">Carpooled</h3>
                  <p className="text-foreground/80">
                    <span className="text-2xl font-bold">10.4%</span> of workers carpooled to their workplace.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="cars" className="mt-4">
            <h2 className="text-xl font-semibold text-foreground mb-4">Car Ownership</h2>
            <div className="h-80">
              <BarChart
                data={[
                  { name: "No vehicle", value: 14 },
                  { name: "1 vehicle", value: 38 },
                  { name: "2 vehicles", value: 33 },
                  { name: "3+ vehicles", value: 15 }
                ]}
                color="#ffc2ad"
                yAxisLabel="% of households"
                height={300}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <Card className="bg-card/40 border border-border">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-2">Average Ownership</h3>
                  <p className="text-foreground/80">
                    The largest share of households in Revere, MA have 2 cars, which is consistent with national averages.
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-card/40 border border-border">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-2">Comparison</h3>
                  <p className="text-foreground/80">
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
