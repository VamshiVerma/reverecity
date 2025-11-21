import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import StatCard from "@/components/cards/StatCard";
import LineChart from "@/components/charts/LineChart";
import PieChart from "@/components/charts/PieChart";
import CategoryCard from "@/components/cards/CategoryCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Building,
  Bus,
  CloudSun,
  BookOpen,
  Shield,
  Heart,
  PieChart as PieChartIcon,
  Zap,
  TrendingUp,
  Users,
  DollarSign,
  Lightbulb,
  BarChart3,
  ArrowRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from "@/components/ui/navigation-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Use actual data from other sections
const KeyCategories = [
  { 
    name: "Budget", 
    path: "/budget", 
    icon: PieChartIcon, 
    color: "bg-indigo-500/10 text-indigo-500",
    description: "Municipal spending and finances"
  },
  { 
    name: "Revenue", 
    path: "/revenue", 
    icon: DollarSign,
    color: "bg-emerald-500/10 text-emerald-500",
    description: "City income sources and financial resources"
  },
  { 
    name: "Public Safety", 
    path: "/crime", 
    icon: Shield,
    color: "bg-orange-500/10 text-orange-500",
    description: "Safety and security statistics"
  },
  { 
    name: "Education", 
    path: "/education", 
    icon: BookOpen,
    color: "bg-sky-500/10 text-sky-500",
    description: "Schools and educational metrics"
  },
  { 
    name: "Weather", 
    path: "/weather", 
    icon: CloudSun,
    color: "bg-amber-500/10 text-amber-500",
    description: "Climate conditions and forecasts"
  },
  { 
    name: "Economic Dev", 
    path: "/economic", 
    icon: TrendingUp,
    color: "bg-rose-500/10 text-rose-500",
    description: "Business growth and development"
  }
];

// Using verified project data from the provided document
const CityProjectHighlights = [
  {
    title: "Wonderland High School",
    description: "New high school for 2,450 students on 34-acre Wonderland site",
    status: 30,
    timeframe: "2024-2027"
  },
  {
    title: "Suffolk Downs Development",
    description: "160-acre mixed-use project with 5.8M sq ft space including biotech",
    status: 15,
    timeframe: "2023-2028"
  },
  {
    title: "Waterfront Square",
    description: "1,172 residential units, 172-room Marriott Hotel",
    status: 60,
    timeframe: "2022-2025"
  },
  {
    title: "Water/Sewer Upgrades",
    description: "Infrastructure to prevent illegal sanitary sewer overflows",
    status: 40,
    timeframe: "2023-2026"
  }
];

// Data from various pages - updated with actual figures
const KeyMetrics = {
  population: {
    current: 57954, // Updated to 2023 population figure
    change: 2.1,
    timeDescription: "Since 2023" // Fixed: Changed from "Since 2020" to "Since 2023"
  },
  budget: {
    current: 274400000, // FY2025 budget
    change: 3.2,
    timeDescription: "YoY increase"
  },
  housingPrice: {
    current: 655000, // From Housing page
    change: -0.76, // From Housing page
    timeDescription: "Monthly change"
  },
  unemployment: {
    current: 4.1, // From Economy page
    change: -0.5,
    timeDescription: "Last quarter"
  }
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return `$${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `$${(num / 1000).toFixed(0)}K`;
  } else {
    return num.toLocaleString();
  }
};

const getStatusColor = (status: number): string => {
  if (status >= 75) return "bg-emerald-500";
  if (status >= 50) return "bg-amber-500";
  return "bg-indigo-500";
};

// Health data from the Health page
const healthCoverageData = [
  { name: "Employer Coverage", value: 37.9 },
  { name: "Medicaid", value: 32.9 },
  { name: "Medicare", value: 9.6 },
  { name: "Non-Group", value: 13.8 },
  { name: "Military or VA", value: 0.4 },
  { name: "Uninsured", value: 5.4 }
];

// Updated budget allocation from Budget page based on FY2025 highlight (44% to education)
const budgetAllocationData = [
  { name: "Education", value: 44, color: "#4f46e5" }, 
  { name: "Public Safety", value: 18, color: "#059669" }, 
  { name: "Infrastructure", value: 20, color: "#0284c7" }, 
  { name: "Health", value: 12, color: "#d946ef" }, 
  { name: "Admin & Other", value: 6, color: "#f59e0b" }, 
];

// Updated revenue data from Revenue page
const revenueSourcesData = [
  { name: "Property Tax", value: 67, color: "#4f46e5" }, 
  { name: "State Aid", value: 25, color: "#059669" }, 
  { name: "Local Receipts", value: 8, color: "#0284c7" }, 
];

const Index = () => {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <DashboardLayout pageTitle="City Overview">
      {/* City Header with Key Stats */}
      <div className="relative mb-8 rounded-xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/90 via-purple-600/90 to-sky-600/90 opacity-90"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/30 to-gray-700/30 mix-blend-overlay"></div>
        
        <div className="relative p-6 md:p-8">
          <div className="mb-6">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Revere, Massachusetts</h1>
            <p className="text-white/80 max-w-2xl">
              Comprehensive city dashboard with verified metrics, trends, and insights for residents, officials, and stakeholders.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <p className="text-xs text-white/70 uppercase font-medium mb-1">Population</p>
              <div className="flex justify-between items-baseline">
                <h3 className="text-2xl font-bold text-white">{KeyMetrics.population.current.toLocaleString()}</h3>
                <span className={`text-sm px-1.5 py-0.5 rounded ${KeyMetrics.population.change >= 0 ? 'bg-green-500/20 text-green-100' : 'bg-red-500/20 text-red-100'}`}>
                  {KeyMetrics.population.change >= 0 ? '+' : ''}{KeyMetrics.population.change}%
                </span>
              </div>
              <p className="text-xs text-white/60 mt-1">{KeyMetrics.population.timeDescription}</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <p className="text-xs text-white/70 uppercase font-medium mb-1">Annual Budget</p>
              <div className="flex justify-between items-baseline">
                <h3 className="text-2xl font-bold text-white">{formatNumber(KeyMetrics.budget.current)}</h3>
                <span className={`text-sm px-1.5 py-0.5 rounded ${KeyMetrics.budget.change >= 0 ? 'bg-green-500/20 text-green-100' : 'bg-red-500/20 text-red-100'}`}>
                  {KeyMetrics.budget.change >= 0 ? '+' : ''}{KeyMetrics.budget.change}%
                </span>
              </div>
              <p className="text-xs text-white/60 mt-1">{KeyMetrics.budget.timeDescription}</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <p className="text-xs text-white/70 uppercase font-medium mb-1">Median Home Price</p>
              <div className="flex justify-between items-baseline">
                <h3 className="text-2xl font-bold text-white">{formatNumber(KeyMetrics.housingPrice.current)}</h3>
                <span className={`text-sm px-1.5 py-0.5 rounded ${KeyMetrics.housingPrice.change >= 0 ? 'bg-green-500/20 text-green-100' : 'bg-red-500/20 text-red-100'}`}>
                  {KeyMetrics.housingPrice.change >= 0 ? '+' : ''}{KeyMetrics.housingPrice.change}%
                </span>
              </div>
              <p className="text-xs text-white/60 mt-1">{KeyMetrics.housingPrice.timeDescription}</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <p className="text-xs text-white/70 uppercase font-medium mb-1">Unemployment Rate</p>
              <div className="flex justify-between items-baseline">
                <h3 className="text-2xl font-bold text-white">{KeyMetrics.unemployment.current}%</h3>
                <span className={`text-sm px-1.5 py-0.5 rounded ${KeyMetrics.unemployment.change <= 0 ? 'bg-green-500/20 text-green-100' : 'bg-red-500/20 text-red-100'}`}>
                  {KeyMetrics.unemployment.change >= 0 ? '+' : ''}{KeyMetrics.unemployment.change}%
                </span>
              </div>
              <p className="text-xs text-white/60 mt-1">{KeyMetrics.unemployment.timeDescription}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Tabs - Improved UI with full width */}
      <Tabs defaultValue="overview" className="mb-6" onValueChange={setActiveTab}>
        <div className="flex justify-between items-center mb-6">
          <TabsList className="w-full max-w-full">
            <TabsTrigger value="overview" className="flex-1">City Overview</TabsTrigger>
            <TabsTrigger value="projects" className="flex-1">Key Projects</TabsTrigger>
            <TabsTrigger value="insights" className="flex-1">Data Insights</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-8">
          {/* Key Departments Section - Using compact cards */}
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Key City Departments</h2>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {KeyCategories.map((category, index) => (
                <a key={index} href={category.path} className="group block">
                  <Card className="overflow-hidden transition-all duration-300 hover:shadow-md hover:border-primary/30 dark:hover:border-primary/30 h-full">
                    <CardHeader className={`border-b border-gray-100 dark:border-gray-800 ${category.color.split(' ')[0]} p-4`}>
                      <div className="flex items-center justify-between">
                        <div className={`p-2 rounded-md ${category.color}`}>
                          <category.icon className="h-5 w-5" />
                        </div>
                        <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
                      </div>
                      <CardTitle className="mt-2 text-base">{category.name}</CardTitle>
                    </CardHeader>
                  </Card>
                </a>
              ))}
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Budget Allocation</CardTitle>
                <CardDescription>Distribution across major departments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-square max-h-80 w-full">
                  <PieChart
                    data={budgetAllocationData}
                    height={320}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Sources</CardTitle>
                <CardDescription>Where city funding comes from</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-square max-h-80 w-full">
                  <PieChart
                    data={revenueSourcesData}
                    height={320}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Health & Education Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Public Schools"
              value="11"
              icon={<BookOpen size={20} />}
              footnote="Number of public schools in Revere"
            />
            <StatCard
              title="Health Coverage"
              value="94.6%"
              icon={<Heart size={20} />}
              footnote="Percentage with health insurance"
            />
            <StatCard
              title="Public Safety"
              value="$12M"
              icon={<Shield size={20} />}
              footnote="Annual public safety budget"
            />
            <StatCard
              title="Full-Time Staff"
              value="1,033"
              icon={<Users size={20} />}
              footnote="City employees across 22 departments"
            />
          </div>
        </TabsContent>

        <TabsContent value="projects" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {CityProjectHighlights.map((project, index) => (
              <Card key={index} className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-background">
                      {project.timeframe}
                    </Badge>
                  </div>
                  <CardTitle className="mt-2">{project.title}</CardTitle>
                  <CardDescription>{project.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Capital Improvement Projects</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Current fiscal year capital improvement budget: $15 million for 10 infrastructure projects
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead>Projects</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Public Works</TableCell>
                    <TableCell>Water/Sewer Upgrades</TableCell>
                    <TableCell className="text-right">In Progress</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Education</TableCell>
                    <TableCell>Wonderland High School</TableCell>
                    <TableCell className="text-right">Planning</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Public Health</TableCell>
                    <TableCell>Health & Wellness Center</TableCell>
                    <TableCell className="text-right">Construction</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Infrastructure</TableCell>
                    <TableCell>Road Improvements</TableCell>
                    <TableCell className="text-right">Ongoing</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge className="bg-sky-500/10 text-sky-500 hover:bg-sky-500/20">Demographics</Badge>
                  <span className="text-sm text-muted-foreground">May 2025</span>
                </div>
                <CardTitle className="mt-2">Foreign-Born Population Trends</CardTitle>
                <CardDescription>Analysis based on demographic data</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  43.2% of Revere residents (approximately 23,000 people) were born outside of the United States, 
                  much higher than the national average of 13.8%. This percentage decreased slightly 
                  from 43.8% in 2022 to the current figure in 2023, representing a 
                  0.6% decline. The city continues to be culturally diverse, with significant immigrant communities.
                </p>
              </CardContent>
              <CardFooter className="border-t">
                <Button variant="outline" size="sm" asChild className="ml-auto">
                  <a href="/demographics">
                    <ArrowRight className="mr-2 h-4 w-4" />
                    View Demographics
                  </a>
                </Button>
              </CardFooter>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-violet-500/80 to-purple-500/80 text-white">
                <CardTitle className="text-white">Health Insurance Coverage</CardTitle>
                <CardDescription className="text-white/80">Distribution by type</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {healthCoverageData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <span className="text-sm">{item.name}</span>
                      <div className="flex items-center">
                        <div className="w-32 h-2 bg-gray-200 rounded-full mr-2">
                          <div 
                            className="h-full bg-purple-600 rounded-full" 
                            style={{ width: `${item.value}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{item.value}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge className="bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20">Budget</Badge>
                  <BarChart3 className="h-5 w-5 text-muted-foreground" />
                </div>
                <CardTitle className="mt-2">Budget Insights</CardTitle>
                <CardDescription>FY2025 data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      The FY2025 budget totals $274.4 million, with nearly 44% dedicated to Revere Public Schools.
                      Health insurance costs of $15 million cover 1,033 full-time employees, with a 5% premium increase due to 
                      an aging workforce, representing a significant portion of the total budget.
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">Education</p>
                      <p className="text-muted-foreground">44% of budget</p>
                    </div>
                    <div>
                      <p className="font-medium">Public Safety</p>
                      <p className="text-muted-foreground">18% of budget</p>
                    </div>
                    <div>
                      <p className="font-medium">Infrastructure</p>
                      <p className="text-muted-foreground">20% of budget</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20">Economy</Badge>
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                </div>
                <CardTitle className="mt-2">Economic Indicators</CardTitle>
                <CardDescription>Latest economic data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Revere's economy generates $408.8 million in total wages, with 1,235 business establishments benefiting from
                      development projects. New growth revenue of $1.2 million from Suffolk Downs and other developments keeps the 
                      tax levy below 2.5%, helping stabilize city finances.
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">Employment</p>
                      <p className="text-muted-foreground">1,033 city FTEs</p>
                    </div>
                    <div>
                      <p className="font-medium">Business Growth</p>
                      <p className="text-muted-foreground">1,235 establishments</p>
                    </div>
                    <div>
                      <p className="font-medium">Unemployment</p>
                      <p className="text-muted-foreground">4.1%</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Top Categories */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">All Categories</h2>
          <Badge variant="outline" className="text-xs">
            12 departments
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <CategoryCard
            title="Budget"
            description="Municipal spending and finances"
            icon={<PieChartIcon />}
            stats={[
              { label: "Total Budget", value: "$274.4M" },
              { label: "Education", value: "44%" },
              { label: "Infrastructure", value: "20%" },
              { label: "Public Safety", value: "18%" }
            ]}
            to="/budget"
          />
          
          <CategoryCard
            title="Revenue"
            description="City income and financial resources"
            icon={<DollarSign />}
            stats={[
              { label: "Property Tax", value: "67%" },
              { label: "State Aid", value: "25%" },
              { label: "Local Receipts", value: "8%" },
              { label: "New Growth", value: "$1.2M" }
            ]}
            to="/revenue"
          />
          
          <CategoryCard
            title="Demographics"
            description="Population statistics and trends"
            icon={<Users />}
            stats={[
              { label: "Population", value: "57,954" },
              { label: "Foreign-Born", value: "43.2%" },
              { label: "Citizenship", value: "73.9%" },
              { label: "Hispanic Pop.", value: "38.6%" }
            ]}
            to="/demographics"
          />
          
          <CategoryCard
            title="Housing"
            description="Residential properties and development"
            icon={<Building />}
            stats={[
              { label: "Median Price", value: "$655,000" },
              { label: "Monthly Change", value: "-0.76%" },
              { label: "Days on Market", value: "35" },
              { label: "Residential Units", value: "1,172+" }
            ]}
            to="/housing"
          />
          
          <CategoryCard
            title="Transportation"
            description="Public transit and infrastructure"
            icon={<Bus />}
            stats={[
              { label: "Bus Routes", value: "12" },
              { label: "Rapid Transit", value: "Blue Line" },
              { label: "Road Budget", value: "$5M" },
              { label: "Infrastructure", value: "$9M" }
            ]}
            to="/transportation"
          />
          
          <CategoryCard
            title="Public Safety"
            description="Safety and security statistics"
            icon={<Shield />}
            stats={[
              { label: "Police Budget", value: "$7M" },
              { label: "Fire Budget", value: "$5M" },
              { label: "Total Budget", value: "$12M" },
              { label: "RECC Budget", value: "$1.5M" }
            ]}
            to="/crime"
          />
          
          <CategoryCard
            title="Health"
            description="Public health and healthcare access"
            icon={<Heart />}
            stats={[
              { label: "Coverage Rate", value: "94.6%" },
              { label: "Uninsured", value: "5.4%" },
              { label: "Health Center", value: "$2M" },
              { label: "Senior Programs", value: "50+" }
            ]}
            to="/health"
          />
          
          <CategoryCard
            title="Education"
            description="Schools and educational metrics"
            icon={<BookOpen />}
            stats={[
              { label: "Schools", value: "11" },
              { label: "New HS Budget", value: "$50M" },
              { label: "Student Count", value: "2,450" },
              { label: "Ed. Budget %", value: "44%" }
            ]}
            to="/education"
          />
          
          <CategoryCard
            title="Economic Dev"
            description="Business growth and development"
            icon={<TrendingUp />}
            stats={[
              { label: "Total Wages", value: "$408.8M" },
              { label: "Businesses", value: "1,235" },
              { label: "ARPA Grants", value: "$10M" },
              { label: "New Growth", value: "$1.2M" }
            ]}
            to="/economic"
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
