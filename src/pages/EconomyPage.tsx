
import DashboardLayout from "@/components/DashboardLayout";
import { TrendingUp, BriefcaseBusiness, DollarSign, Users, Database, BarChart3 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatCard from "@/components/cards/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/formatters";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import PieChart from "@/components/charts/PieChart";
import BarChart from "@/components/charts/BarChart";

const EconomyPage = () => {
  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-light-text flex items-center">
          <TrendingUp className="mr-3 text-highlight" /> Economic Data
        </h1>
        <p className="text-gray-400 mt-2">
          Economic insights for Revere, Massachusetts
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Median Household Income"
          value={formatCurrency(66167)}
          icon={<DollarSign size={20} />}
          change={{ value: 2.5, isPositive: true }}
        />
        <StatCard
          title="Employment Value"
          value="31.9k"
          icon={<Users size={20} />}
          change={{ value: 0.549, isPositive: false }}
        />
        <StatCard
          title="Largest Industry"
          value="Healthcare"
          icon={<BriefcaseBusiness size={20} />}
        />
      </div>

      <div className="glass-card p-4 rounded-lg mb-6">
        <Tabs defaultValue="industries" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="industries">Employment by Industries</TabsTrigger>
            <TabsTrigger value="occupations">Occupations</TabsTrigger>
            <TabsTrigger value="earnings">Median Earnings</TabsTrigger>
          </TabsList>
          
          {/* Employment by Industries Tab */}
          <TabsContent value="industries" className="mt-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-card/40 border border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <Database className="h-4 w-4 mr-2 text-highlight" />
                    Employment Stats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-300">2023 Value</span>
                      <span className="font-semibold text-light-text">31.9k</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">1 Year Change</span>
                      <span className="text-red-400">-0.549%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-card/40 border border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <BriefcaseBusiness className="h-4 w-4 mr-2 text-highlight" />
                    Top Industries
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-gray-300 space-y-2">
                    <li className="flex justify-between items-center">
                      <span>Health Care & Social Assistance</span>
                      <Badge variant="outline" className="bg-highlight/10">4,270</Badge>
                    </li>
                    <li className="flex justify-between items-center">
                      <span>Accommodation & Food Services</span>
                      <Badge variant="outline" className="bg-highlight/10">4,229</Badge>
                    </li>
                    <li className="flex justify-between items-center">
                      <span>Retail Trade</span>
                      <Badge variant="outline" className="bg-highlight/10">3,198</Badge>
                    </li>
                  </ul>
                </CardContent>
              </Card>
              
              <Card className="bg-card/40 border border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <TrendingUp className="h-4 w-4 mr-2 text-highlight" />
                    Industry Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Healthcare Growth</span>
                      <span className="text-green-400">+3.2%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Retail Decline</span>
                      <span className="text-red-400">-1.7%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Food Service Growth</span>
                      <span className="text-green-400">+2.1%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <h2 className="text-xl font-semibold text-light-text mb-4">Employment by Industries</h2>
            <div className="h-80">
              <BarChart
                data={[
                  { name: "Health Care", value: 17.5 },
                  { name: "Retail Trade", value: 11.8 },
                  { name: "Food Services", value: 10.2 },
                  { name: "Construction", value: 9.6 },
                  { name: "Education", value: 8.9 },
                  { name: "Transportation", value: 7.4 },
                  { name: "Professional", value: 6.1 },
                  { name: "Manufacturing", value: 5.3 },
                  { name: "Finance", value: 4.5 },
                  { name: "Public Admin", value: 4.1 }
                ]}
                color="#2196F3"
                yAxisLabel="% of workforce"
                height={300}
              />
            </div>
          </TabsContent>
          
          {/* Occupations Tab */}
          <TabsContent value="occupations" className="mt-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-card/40 border border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <Users className="h-4 w-4 mr-2 text-highlight" />
                    Occupation Stats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-300">2023 Value</span>
                      <span className="font-semibold text-light-text">31.9k</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">1 Year Change</span>
                      <span className="text-red-400">-0.549%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-card/40 border border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <BriefcaseBusiness className="h-4 w-4 mr-2 text-highlight" />
                    Top Occupations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-gray-300 space-y-2">
                    <li className="flex justify-between items-center">
                      <span>Management Occupations</span>
                      <Badge variant="outline" className="bg-highlight/10">3,499</Badge>
                    </li>
                    <li className="flex justify-between items-center">
                      <span>Food Preparation & Serving</span>
                      <Badge variant="outline" className="bg-highlight/10">3,154</Badge>
                    </li>
                    <li className="flex justify-between items-center">
                      <span>Office & Administrative Support</span>
                      <Badge variant="outline" className="bg-highlight/10">2,514</Badge>
                    </li>
                  </ul>
                </CardContent>
              </Card>
              
              <Card className="bg-card/40 border border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <TrendingUp className="h-4 w-4 mr-2 text-highlight" />
                    Growing Occupations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Computer & Mathematical</span>
                      <span className="text-green-400">+22.0%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Business & Financial Operations</span>
                      <span className="text-green-400">+17.0%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <h2 className="text-xl font-semibold text-light-text mb-4">Occupations</h2>
            <div className="h-80">
              <PieChart
                data={[
                  { name: "Management/Business/Science/Arts", value: 30.2 },
                  { name: "Service", value: 26.5 },
                  { name: "Sales & Office", value: 24.0 },
                  { name: "Production & Transport", value: 12.8 },
                  { name: "Construction & Maintenance", value: 6.5 }
                ]}
                colors={["#4CAF50", "#2196F3", "#FF9800", "#9C27B0", "#F44336"]}
                height={300}
              />
            </div>
          </TabsContent>
          
          {/* Median Earnings Tab */}
          <TabsContent value="earnings" className="mt-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-card/40 border border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <DollarSign className="h-4 w-4 mr-2 text-highlight" />
                    Median Income by Gender
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Men</span>
                      <div className="flex flex-col items-end">
                        <span className="text-xl font-bold text-light-text">{formatCurrency(52793)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Women</span>
                      <div className="flex flex-col items-end">
                        <span className="text-xl font-bold text-light-text">{formatCurrency(36103)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-card/40 border border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <BarChart3 className="h-4 w-4 mr-2 text-highlight" />
                    Top Industries for Men
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-gray-300 space-y-2">
                    <li className="flex justify-between items-center">
                      <HoverCard>
                        <HoverCardTrigger><span className="border-b border-dotted border-gray-500">Information</span></HoverCardTrigger>
                        <HoverCardContent className="bg-card/80 border border-white/10">Tech, telecom, publishing, broadcasting industries</HoverCardContent>
                      </HoverCard>
                      <span className="font-semibold">{formatCurrency(84525)}</span>
                    </li>
                    <li className="flex justify-between items-center">
                      <span>Public Administration</span>
                      <span className="font-semibold">{formatCurrency(78750)}</span>
                    </li>
                    <li className="flex justify-between items-center">
                      <span>Professional Services</span>
                      <span className="font-semibold">{formatCurrency(61907)}</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
              
              <Card className="bg-card/40 border border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <BarChart3 className="h-4 w-4 mr-2 text-highlight" />
                    Top Industries for Women
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-gray-300 space-y-2">
                    <li className="flex justify-between items-center">
                      <span>Finance & Real Estate</span>
                      <span className="font-semibold">{formatCurrency(90141)}</span>
                    </li>
                    <li className="flex justify-between items-center">
                      <span>Construction</span>
                      <span className="font-semibold">{formatCurrency(80172)}</span>
                    </li>
                    <li className="flex justify-between items-center">
                      <span>Information</span>
                      <span className="font-semibold">{formatCurrency(78224)}</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
            
            <h2 className="text-xl font-semibold text-light-text mb-4">Median Earnings</h2>
            <div className="h-80">
              <BarChart
                data={[
                  { name: "Male (Full-time)", value: 47000 },
                  { name: "Female (Full-time)", value: 41000 }
                ]}
                color="#009688"
                yAxisLabel="Median earnings ($)"
                height={300}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default EconomyPage;
