
import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import BudgetChart from "@/components/charts/BudgetChart";
import BudgetPieChart from "@/components/charts/BudgetPieChart";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import { 
  PieChart, 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  School, 
  Shield, 
  Droplet, 
  Building2, 
  Bookmark, 
  Banknote, 
  Construction,
  Trash2, 
  Heart, 
  Ticket
} from "lucide-react";

// Sample budget data for FY2025
const totalBudget = 293008066;

const budgetCategories = [
  { name: "Education", value: 129570276, percentage: 44.2, color: "#3b82f6" }, // blue
  { name: "Pensions & Benefits", value: 46120481, percentage: 15.7, color: "#10b981" }, // emerald
  { name: "Public Safety", value: 32810322, percentage: 11.2, color: "#f97316" }, // orange
  { name: "Water & Sewer", value: 31742531, percentage: 10.8, color: "#06b6d4" }, // cyan
  { name: "State Assessments", value: 18587631, percentage: 6.3, color: "#8b5cf6" }, // violet
  { name: "General Government", value: 10705999, percentage: 3.7, color: "#ec4899" }, // pink
  { name: "Debt Service", value: 9218671, percentage: 3.1, color: "#f43f5e" }, // rose
  { name: "Public Works", value: 4862822, percentage: 1.7, color: "#14b8a6" }, // teal
  { name: "Solid Waste", value: 4827700, percentage: 1.6, color: "#84cc16" }, // lime
  { name: "Health & Human Services", value: 2433149, percentage: 0.8, color: "#eab308" }, // yellow
  { name: "Cultural Recreation", value: 2128484, percentage: 0.7, color: "#6366f1" }, // indigo
];

// Sample data for historical tracking - ensuring all fiscal years are present
const educationData = [
  { fiscalYear: "FY2016", actualAmount: 74211101, budgetedAmount: null, isFutureYear: false },
  { fiscalYear: "FY2017", actualAmount: 74241299, budgetedAmount: null, isFutureYear: false },
  { fiscalYear: "FY2018", actualAmount: 80807760, budgetedAmount: null, isFutureYear: false },
  { fiscalYear: "FY2019", actualAmount: 83868959, budgetedAmount: 96983901, isFutureYear: false },
  { fiscalYear: "FY2020", actualAmount: 89947444, budgetedAmount: 95000000, isFutureYear: false },
  { fiscalYear: "FY2021", actualAmount: 94093447, budgetedAmount: 94093447, isFutureYear: false },
  { fiscalYear: "FY2022", actualAmount: 59879539, budgetedAmount: 1830956, isFutureYear: false },
  { fiscalYear: "FY2023", actualAmount: null, budgetedAmount: 110837077, isFutureYear: true },
  { fiscalYear: "FY2024", actualAmount: null, budgetedAmount: 124005564, isFutureYear: true },
  { fiscalYear: "FY2025", actualAmount: null, budgetedAmount: 129570276, isFutureYear: true },
];

const pensionBenefitsData = [
  { fiscalYear: "FY2016", actualAmount: 10541893, budgetedAmount: null, isFutureYear: false },
  { fiscalYear: "FY2017", actualAmount: 11033908, budgetedAmount: null, isFutureYear: false },
  { fiscalYear: "FY2018", actualAmount: 32215668, budgetedAmount: null, isFutureYear: false },
  { fiscalYear: "FY2019", actualAmount: 34739748, budgetedAmount: 34000000, isFutureYear: false },
  { fiscalYear: "FY2020", actualAmount: 37131226, budgetedAmount: 37015360, isFutureYear: false },
  { fiscalYear: "FY2021", actualAmount: 38562953, budgetedAmount: 38562953, isFutureYear: false },
  { fiscalYear: "FY2022", actualAmount: 27607238, budgetedAmount: 39920887, isFutureYear: false },
  { fiscalYear: "FY2023", actualAmount: null, budgetedAmount: 41285165, isFutureYear: true },
  { fiscalYear: "FY2024", actualAmount: null, budgetedAmount: 44174306, isFutureYear: true },
  { fiscalYear: "FY2025", actualAmount: null, budgetedAmount: 46120481, isFutureYear: true },
];

const publicSafetyData = [
  { fiscalYear: "FY2016", actualAmount: 20150320, budgetedAmount: null, isFutureYear: false },
  { fiscalYear: "FY2017", actualAmount: 20049753, budgetedAmount: null, isFutureYear: false },
  { fiscalYear: "FY2018", actualAmount: 23375551, budgetedAmount: null, isFutureYear: false },
  { fiscalYear: "FY2019", actualAmount: 23630359, budgetedAmount: 23630359, isFutureYear: false },
  { fiscalYear: "FY2020", actualAmount: 24702702, budgetedAmount: 24000000, isFutureYear: false },
  { fiscalYear: "FY2021", actualAmount: 25915665, budgetedAmount: 25527942, isFutureYear: false },
  { fiscalYear: "FY2022", actualAmount: 19682297, budgetedAmount: 26193860, isFutureYear: false },
  { fiscalYear: "FY2023", actualAmount: null, budgetedAmount: 28514536, isFutureYear: true },
  { fiscalYear: "FY2024", actualAmount: null, budgetedAmount: 31070560, isFutureYear: true },
  { fiscalYear: "FY2025", actualAmount: null, budgetedAmount: 32810322, isFutureYear: true },
];

const waterSewerData = [
  { fiscalYear: "FY2016", actualAmount: 23022677, budgetedAmount: null, isFutureYear: false },
  { fiscalYear: "FY2017", actualAmount: 26089498, budgetedAmount: null, isFutureYear: false },
  { fiscalYear: "FY2018", actualAmount: 27121590, budgetedAmount: null, isFutureYear: false },
  { fiscalYear: "FY2019", actualAmount: 27811448, budgetedAmount: 27811448, isFutureYear: false },
  { fiscalYear: "FY2020", actualAmount: 28077892, budgetedAmount: 25125568, isFutureYear: false },
  { fiscalYear: "FY2021", actualAmount: 27433257, budgetedAmount: 25574843, isFutureYear: false },
  { fiscalYear: "FY2022", actualAmount: 22277345, budgetedAmount: 26726074, isFutureYear: false },
  { fiscalYear: "FY2023", actualAmount: null, budgetedAmount: 29369763, isFutureYear: true },
  { fiscalYear: "FY2024", actualAmount: null, budgetedAmount: 31109532, isFutureYear: true },
  { fiscalYear: "FY2025", actualAmount: null, budgetedAmount: 31742531, isFutureYear: true },
];

const stateAssessmentsData = [
  { fiscalYear: "FY2016", actualAmount: 8368133, budgetedAmount: null, isFutureYear: false },
  { fiscalYear: "FY2017", actualAmount: 9346992, budgetedAmount: null, isFutureYear: false },
  { fiscalYear: "FY2018", actualAmount: 10394287, budgetedAmount: null, isFutureYear: false },
  { fiscalYear: "FY2019", actualAmount: 12231375, budgetedAmount: 0, isFutureYear: false },
  { fiscalYear: "FY2020", actualAmount: 12996858, budgetedAmount: 0, isFutureYear: false },
  { fiscalYear: "FY2021", actualAmount: 13557475, budgetedAmount: 766214, isFutureYear: false },
  { fiscalYear: "FY2022", actualAmount: 9999488, budgetedAmount: 0, isFutureYear: false },
  { fiscalYear: "FY2023", actualAmount: null, budgetedAmount: 17092400, isFutureYear: true },
  { fiscalYear: "FY2024", actualAmount: null, budgetedAmount: 18144845, isFutureYear: true },
  { fiscalYear: "FY2025", actualAmount: null, budgetedAmount: 18587631, isFutureYear: true },
];

const generalGovernmentData = [
  { fiscalYear: "FY2016", actualAmount: 34402369, budgetedAmount: null, isFutureYear: false },
  { fiscalYear: "FY2017", actualAmount: 17995367, budgetedAmount: null, isFutureYear: false },
  { fiscalYear: "FY2018", actualAmount: 9559667, budgetedAmount: null, isFutureYear: false },
  { fiscalYear: "FY2019", actualAmount: 9245003, budgetedAmount: 9245003, isFutureYear: false },
  { fiscalYear: "FY2020", actualAmount: 9478496, budgetedAmount: 9233417, isFutureYear: false },
  { fiscalYear: "FY2021", actualAmount: 9176091, budgetedAmount: 8950386, isFutureYear: false },
  { fiscalYear: "FY2022", actualAmount: 6095333, budgetedAmount: 8603810, isFutureYear: false },
  { fiscalYear: "FY2023", actualAmount: null, budgetedAmount: 9414866, isFutureYear: true },
  { fiscalYear: "FY2024", actualAmount: null, budgetedAmount: 9240382, isFutureYear: true },
  { fiscalYear: "FY2025", actualAmount: null, budgetedAmount: 10705999, isFutureYear: true },
];

const debtServiceData = [
  { fiscalYear: "FY2018", actualAmount: 5189776, budgetedAmount: null, isFutureYear: false },
  { fiscalYear: "FY2019", actualAmount: 5028850, budgetedAmount: null, isFutureYear: false },
  { fiscalYear: "FY2020", actualAmount: 5086105, budgetedAmount: null, isFutureYear: false },
  { fiscalYear: "FY2021", actualAmount: 5247406, budgetedAmount: 4828738, isFutureYear: false },
  { fiscalYear: "FY2022", actualAmount: 6949491, budgetedAmount: 6246105, isFutureYear: false },
  { fiscalYear: "FY2023", actualAmount: 7494022, budgetedAmount: null, isFutureYear: false },
  { fiscalYear: "FY2024", actualAmount: null, budgetedAmount: 9104073, isFutureYear: true },
  { fiscalYear: "FY2025", actualAmount: null, budgetedAmount: 9218671, isFutureYear: true },
];

// Other category data would be defined similarly

const BudgetPage = () => {
  const [activeTab, setActiveTab] = useState("overview");

  // Calculate year-to-year growth in budgeted amounts for most recent years
  const calculateGrowth = (currentAmount: number, previousAmount: number) => {
    return ((currentAmount - previousAmount) / previousAmount) * 100;
  };

  const educationGrowth = calculateGrowth(129570276, 124005564);
  const pensionsGrowth = calculateGrowth(46120481, 44174306);
  const publicSafetyGrowth = calculateGrowth(32810322, 31070560);
  const waterSewerGrowth = calculateGrowth(31742531, 31109532);

  // Get category icon based on name
  const getCategoryIcon = (name: string) => {
    const iconProps = { className: "h-5 w-5 mr-2", strokeWidth: 1.5 };
    
    switch(name.toLowerCase()) {
      case "education": return <School {...iconProps} />;
      case "pensions & benefits": return <Wallet {...iconProps} />;
      case "public safety": return <Shield {...iconProps} />;
      case "water & sewer": return <Droplet {...iconProps} />;
      case "state assessments": return <Building2 {...iconProps} />;
      case "general government": return <Bookmark {...iconProps} />;
      case "debt service": return <Banknote {...iconProps} />;
      case "public works": return <Construction {...iconProps} />;
      case "solid waste": return <Trash2 {...iconProps} />;
      case "health & human services": return <Heart {...iconProps} />;
      case "cultural recreation": return <Ticket {...iconProps} />;
      default: return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gradient">City Expenditures Dashboard</h1>
        <p className="text-gray-400 mt-2">
          Comprehensive analysis of Revere's municipal expenditures and budget allocations
        </p>
      </div>

      <Tabs defaultValue="overview" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 lg:grid-cols-6 mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="education">Education</TabsTrigger>
          <TabsTrigger value="pensions">Pensions & Benefits</TabsTrigger>
          <TabsTrigger value="safety">Public Safety</TabsTrigger>
          <TabsTrigger value="water">Water & Sewer</TabsTrigger>
          <TabsTrigger value="other">Other Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 bg-card/80 backdrop-blur-sm border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl flex items-center">
                  <PieChart className="mr-2 h-5 w-5" strokeWidth={1.5} />
                  FY2025 Expenditure Allocation
                </CardTitle>
                <CardDescription>
                  Total Budget: {formatCurrency(totalBudget)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BudgetPieChart 
                  title="" 
                  data={budgetCategories} 
                  totalAmount={totalBudget}
                  height={400}
                />
              </CardContent>
            </Card>
            
            <div className="space-y-6">
              <Card className="bg-card/80 backdrop-blur-sm border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <BarChart3 className="mr-2 h-5 w-5" strokeWidth={1.5} />
                    Top Budget Categories
                  </CardTitle>
                  <CardDescription>FY2025 Budget Year</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {budgetCategories.slice(0, 4).map((category, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: category.color }}
                        ></div>
                        <span className="text-sm">{category.name}</span>
                      </div>
                      <div className="text-sm font-medium">
                        {formatCurrency(category.value)}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
              
              <Card className="bg-card/80 backdrop-blur-sm border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <TrendingUp className="mr-2 h-5 w-5" strokeWidth={1.5} />
                    Year-over-Year Growth
                  </CardTitle>
                  <CardDescription>FY2024 to FY2025</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Education</span>
                    <div className="flex items-center gap-1">
                      {educationGrowth > 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                      <span className={`text-sm font-medium ${educationGrowth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {educationGrowth.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Pensions & Benefits</span>
                    <div className="flex items-center gap-1">
                      {pensionsGrowth > 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                      <span className={`text-sm font-medium ${pensionsGrowth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {pensionsGrowth.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Public Safety</span>
                    <div className="flex items-center gap-1">
                      {publicSafetyGrowth > 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                      <span className={`text-sm font-medium ${publicSafetyGrowth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {publicSafetyGrowth.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Water & Sewer</span>
                    <div className="flex items-center gap-1">
                      {waterSewerGrowth > 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                      <span className={`text-sm font-medium ${waterSewerGrowth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {waterSewerGrowth.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card/80 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <School className="mr-2 h-5 w-5" strokeWidth={1.5} />
                  Education Budget Trend
                </CardTitle>
                <CardDescription>10-Year Budget vs. Actual Spending</CardDescription>
              </CardHeader>
              <CardContent>
                <BudgetChart 
                  title="" 
                  data={educationData}
                  height={300}
                />
              </CardContent>
            </Card>
            
            <Card className="bg-card/80 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="mr-2 h-5 w-5" strokeWidth={1.5} />
                  Public Safety Budget Trend
                </CardTitle>
                <CardDescription>10-Year Budget vs. Actual Spending</CardDescription>
              </CardHeader>
              <CardContent>
                <BudgetChart 
                  title="" 
                  data={publicSafetyData}
                  height={300}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="education" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Education Department Budget</CardTitle>
              <CardDescription>
                Detailed budget vs. actual spending on education (FY2016-FY2025)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BudgetChart 
                title="" 
                data={educationData}
                height={400}
              />
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">FY2025 Budget</CardTitle>
                <CardDescription>Education Department</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-500 mb-2">
                  {formatCurrency(129570276)}
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-500">+{educationGrowth.toFixed(1)}% from FY2024</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Percentage of Total</CardTitle>
                <CardDescription>FY2025 Budget</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-500 mb-2">
                  44.2%
                </div>
                <div className="text-sm text-muted-foreground">
                  Largest budget allocation
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">10-Year Growth</CardTitle>
                <CardDescription>FY2016 to FY2025</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-500 mb-2">
                  74.6%
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatCurrency(129570276 - 74211101)} increase
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pensions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pensions & Benefits Budget</CardTitle>
              <CardDescription>
                Detailed budget vs. actual spending on pensions and benefits (FY2016-FY2025)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BudgetChart 
                title="" 
                data={pensionBenefitsData}
                height={400}
              />
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">FY2025 Budget</CardTitle>
                <CardDescription>Pensions & Benefits</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-500 mb-2">
                  {formatCurrency(46120481)}
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-500">+{pensionsGrowth.toFixed(1)}% from FY2024</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Percentage of Total</CardTitle>
                <CardDescription>FY2025 Budget</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-500 mb-2">
                  15.7%
                </div>
                <div className="text-sm text-muted-foreground">
                  Second largest budget allocation
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">10-Year Growth</CardTitle>
                <CardDescription>FY2016 to FY2025</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-500 mb-2">
                  337.5%
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatCurrency(46120481 - 10541893)} increase
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="safety" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Public Safety Budget</CardTitle>
              <CardDescription>
                Detailed budget vs. actual spending on public safety (FY2016-FY2025)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BudgetChart 
                title="" 
                data={publicSafetyData}
                height={400}
              />
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">FY2025 Budget</CardTitle>
                <CardDescription>Public Safety</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-500 mb-2">
                  {formatCurrency(32810322)}
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-500">+{publicSafetyGrowth.toFixed(1)}% from FY2024</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Percentage of Total</CardTitle>
                <CardDescription>FY2025 Budget</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-500 mb-2">
                  11.2%
                </div>
                <div className="text-sm text-muted-foreground">
                  Third largest budget allocation
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">10-Year Growth</CardTitle>
                <CardDescription>FY2016 to FY2025</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-500 mb-2">
                  62.8%
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatCurrency(32810322 - 20150320)} increase
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="water" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Water & Sewer Enterprise Budget</CardTitle>
              <CardDescription>
                Detailed budget vs. actual spending on water & sewer (FY2016-FY2025)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BudgetChart 
                title="" 
                data={waterSewerData}
                height={400}
              />
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">FY2025 Budget</CardTitle>
                <CardDescription>Water & Sewer Enterprise</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-cyan-500 mb-2">
                  {formatCurrency(31742531)}
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-500">+{waterSewerGrowth.toFixed(1)}% from FY2024</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Percentage of Total</CardTitle>
                <CardDescription>FY2025 Budget</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-cyan-500 mb-2">
                  10.8%
                </div>
                <div className="text-sm text-muted-foreground">
                  Fourth largest budget allocation
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">10-Year Growth</CardTitle>
                <CardDescription>FY2016 to FY2025</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-cyan-500 mb-2">
                  37.9%
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatCurrency(31742531 - 23022677)} increase
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="other" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>State Assessments</CardTitle>
              </CardHeader>
              <CardContent>
                <BudgetChart 
                  title="" 
                  data={stateAssessmentsData}
                  height={300}
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>General Government</CardTitle>
              </CardHeader>
              <CardContent>
                <BudgetChart 
                  title="" 
                  data={generalGovernmentData}
                  height={300}
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Debt Service</CardTitle>
              </CardHeader>
              <CardContent>
                <BudgetChart 
                  title="" 
                  data={debtServiceData}
                  height={300}
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Other Categories</CardTitle>
                  <CardDescription>Remaining budget categories</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <PieChart className="h-4 w-4 mr-2" /> View Breakdown
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-teal-500"></div>
                      <span className="text-sm">Public Works</span>
                    </div>
                    <div className="text-sm font-medium">
                      {formatCurrency(4862822)}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-lime-500"></div>
                      <span className="text-sm">Solid Waste Enterprise</span>
                    </div>
                    <div className="text-sm font-medium">
                      {formatCurrency(4827700)}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <span className="text-sm">Health & Human Services</span>
                    </div>
                    <div className="text-sm font-medium">
                      {formatCurrency(2433149)}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                      <span className="text-sm">Cultural Recreation</span>
                    </div>
                    <div className="text-sm font-medium">
                      {formatCurrency(2128484)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default BudgetPage;
