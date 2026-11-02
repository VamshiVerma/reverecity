
import DashboardLayout from "@/components/DashboardLayout";
import { Users, Globe, Percent } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatCard from "@/components/cards/StatCard";
import { Card, CardContent } from "@/components/ui/card";
import PieChart from "@/components/charts/PieChart";

const DemographicsPage = () => {
  return (
    <DashboardLayout pageTitle="Demographics">
      <div className="mb-6">
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Population"
          value="57,954"
          icon={<Users size={20} />}
          footnote="2023 Census Estimate"
        />
        <StatCard
          title="Citizenship Rate"
          value="73.9%"
          icon={<Percent size={20} />}
          change={{ value: 0.7, isPositive: false }}
        />
        <StatCard
          title="Foreign-Born"
          value="43.2%"
          icon={<Globe size={20} />}
          change={{ value: 0.6, isPositive: false }}
        />
      </div>

      <div className="glass-card p-4 rounded-lg mb-6">
        <Tabs defaultValue="citizenship" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="citizenship">Citizenship</TabsTrigger>
            <TabsTrigger value="race">Race & Ethnicity</TabsTrigger>
            <TabsTrigger value="foreign">Foreign-Born Population</TabsTrigger>
          </TabsList>
          
          <TabsContent value="citizenship" className="mt-4">
            <h2 className="text-xl font-semibold text-foreground mb-4">Citizenship</h2>
            <div className="h-80">
              <PieChart
                data={[
                  { name: "US Citizen", value: 74 },
                  { name: "Non-Citizen", value: 26 }
                ]}
                colors={["#b9e3fb", "#FC734D"]}
                height={300}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <Card className="bg-card/40 border border-border">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-2">2023 Citizenship</h3>
                  <p className="text-foreground/80">
                    <span className="text-2xl font-bold">73.9%</span> of Revere, MA residents were US citizens, which is lower than the national average of 93.4%.
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-card/40 border border-border">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-2">Trend</h3>
                  <p className="text-foreground/80">
                    In 2022, the percentage was 74.6%, indicating a slight decrease in the citizenship rate over the past year.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="race" className="mt-4">
            <h2 className="text-xl font-semibold text-foreground mb-4">Race and Ethnicity</h2>
            <div className="h-80">
              <PieChart
                data={[
                  { name: "White (Non-Hispanic)", value: 44 },
                  { name: "Hispanic", value: 37 },
                  { name: "Asian", value: 6 },
                  { name: "Black", value: 5 },
                  { name: "Two or More", value: 6 },
                  { name: "Other", value: 2 }
                ]}
                colors={["#0297DE", "#FC734D", "#8a9ba8", "#5cc6ff", "#f4a58a", "#2f7fb3"]}
                height={300}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <Card className="bg-card/40 border border-border">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-2">Largest Group</h3>
                  <p className="text-foreground/80">
                    <span className="text-2xl font-bold">28.7k</span> White (Non-Hispanic) residents, 2.74 times more than any other ethnic group.
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-card/40 border border-border">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-2">Hispanic Population</h3>
                  <p className="text-foreground/80">
                    <span className="text-2xl font-bold">38.6%</span> of people in Revere are Hispanic (23.2k people).
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-card/40 border border-border">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-2">Other Major Groups</h3>
                  <p className="text-foreground/80">
                    Second largest: Two+ (Hispanic) with 10.5k residents
                    <br />
                    Third largest: Other (Hispanic) with 7.13k residents
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="foreign" className="mt-4">
            <h2 className="text-xl font-semibold text-foreground mb-4">Foreign-Born Population</h2>
            <div className="h-80">
              <PieChart
                data={[
                  { name: "Foreign-born", value: 41 },
                  { name: "Native-born", value: 59 }
                ]}
                colors={["#5cc6ff", "#4b5a66"]}
                height={300}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <Card className="bg-card/40 border border-border">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-2">2023 Foreign-Born</h3>
                  <p className="text-foreground/80">
                    <span className="text-2xl font-bold">43.2%</span> of Revere residents (25.9k people) were born outside of the United States, much higher than the national average of 13.8%.
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-card/40 border border-border">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-2">Recent Trend</h3>
                  <p className="text-foreground/80">
                    The foreign-born population decreased slightly from 43.8% (26.6k people) in 2022 to 43.2% (25.9k people) in 2023.
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

export default DemographicsPage;
