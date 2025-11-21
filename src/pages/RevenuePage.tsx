
import { useState } from "react";
import { 
  DollarSign, 
  School, 
  Library, 
  Receipt, 
  CreditCard,
  BarChart4, 
  TrendingUp, 
  Landmark,
  PieChart
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/cards/StatCard";
import CategoryCard from "@/components/cards/CategoryCard";
import RevenueBarChart from "@/components/charts/RevenueBarChart";
import BudgetPieChart from "@/components/charts/BudgetPieChart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const RevenuePage = () => {
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

  const cherrySheetData = [
    { year: "2016", actualAmount: 85392505, budgetedAmount: null, isFutureYear: false },
    { year: "2017", actualAmount: 89082633, budgetedAmount: null, isFutureYear: false },
    { year: "2018", actualAmount: 92659073, budgetedAmount: null, isFutureYear: false },
    { year: "2019", actualAmount: 97134310, budgetedAmount: 97099800, isFutureYear: false },
    { year: "2020", actualAmount: 100722512, budgetedAmount: 98996135, isFutureYear: false },
    { year: "2021", actualAmount: 101016877, budgetedAmount: 100597308, isFutureYear: false },
    { year: "2022", actualAmount: 107591995, budgetedAmount: 106763858, isFutureYear: false },
    { year: "2023", actualAmount: null, budgetedAmount: 111262513, isFutureYear: true },
    { year: "2024", actualAmount: null, budgetedAmount: 114624939, isFutureYear: true },
    { year: "2025", actualAmount: null, budgetedAmount: 117487079, isFutureYear: true }
  ];

  const chargesAndFeesData = [
    { year: "2016", actualAmount: 29430057, budgetedAmount: null, isFutureYear: false },
    { year: "2017", actualAmount: 31278058, budgetedAmount: null, isFutureYear: false },
    { year: "2018", actualAmount: 31580259, budgetedAmount: null, isFutureYear: false },
    { year: "2019", actualAmount: 33332640, budgetedAmount: 31646091, isFutureYear: false },
    { year: "2020", actualAmount: 29631977, budgetedAmount: 31797165, isFutureYear: false },
    { year: "2021", actualAmount: 32072278, budgetedAmount: 29445749, isFutureYear: false },
    { year: "2022", actualAmount: 29514634, budgetedAmount: 31791005, isFutureYear: false },
    { year: "2023", actualAmount: null, budgetedAmount: 31886825, isFutureYear: true },
    { year: "2024", actualAmount: null, budgetedAmount: 32064164, isFutureYear: true },
    { year: "2025", actualAmount: null, budgetedAmount: 32241502, isFutureYear: true }
  ];

  const localReceiptsData = [
    { year: "2016", actualAmount: 20016388, budgetedAmount: null, isFutureYear: false },
    { year: "2017", actualAmount: 20642161, budgetedAmount: null, isFutureYear: false },
    { year: "2018", actualAmount: 22842717, budgetedAmount: null, isFutureYear: false },
    { year: "2019", actualAmount: 22676939, budgetedAmount: 21211674, isFutureYear: false },
    { year: "2020", actualAmount: 19931070, budgetedAmount: 21969959, isFutureYear: false },
    { year: "2021", actualAmount: 21052955, budgetedAmount: 19825625, isFutureYear: false },
    { year: "2022", actualAmount: 21850147, budgetedAmount: 21641195, isFutureYear: false },
    { year: "2023", actualAmount: null, budgetedAmount: 21935843, isFutureYear: true },
    { year: "2024", actualAmount: null, budgetedAmount: 21980421, isFutureYear: true },
    { year: "2025", actualAmount: null, budgetedAmount: 22025000, isFutureYear: true }
  ];

  const otherIncomeData = [
    { year: "2016", actualAmount: 2979592, budgetedAmount: null, isFutureYear: false },
    { year: "2017", actualAmount: 1975443, budgetedAmount: null, isFutureYear: false },
    { year: "2018", actualAmount: 2515052, budgetedAmount: null, isFutureYear: false },
    { year: "2019", actualAmount: 2842429, budgetedAmount: 2540000, isFutureYear: false },
    { year: "2020", actualAmount: 2899727, budgetedAmount: 2610000, isFutureYear: false },
    { year: "2021", actualAmount: 2396133, budgetedAmount: 2680000, isFutureYear: false },
    { year: "2022", actualAmount: 2627000, budgetedAmount: 2750000, isFutureYear: false },
    { year: "2023", actualAmount: null, budgetedAmount: 2800000, isFutureYear: true },
    { year: "2024", actualAmount: null, budgetedAmount: 2820000, isFutureYear: true },
    { year: "2025", actualAmount: null, budgetedAmount: 2840000, isFutureYear: true }
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

  // Revenue categories for tabs - reordered with "Overall" first
  const categories = [
    {
      id: "overall",
      icon: <PieChart className="mr-2 h-4 w-4" />,
      label: "Overall Revenue",
      description: "Breakdown of all city revenue sources for the fiscal year 2025",
      color: "#06b6d4"
    },
    {
      id: "property-taxes",
      icon: <Landmark className="mr-2 h-4 w-4" />,
      label: "Property Taxes",
      description: "Revenue from real estate and personal property taxes",
      color: "#4ade80",
      data: propertyTaxesData
    },
    {
      id: "cherry-sheet",
      icon: <School className="mr-2 h-4 w-4" />,
      label: "Cherry Sheet Revenue",
      description: "State aid and reimbursements for local services",
      color: "#3b82f6",
      data: cherrySheetData
    },
    {
      id: "charges-fees",
      icon: <Receipt className="mr-2 h-4 w-4" />,
      label: "Charges and Fees",
      description: "Revenue from utility fees, permits, licenses, and service charges",
      color: "#8b5cf6",
      data: chargesAndFeesData
    },
    {
      id: "local-receipts",
      icon: <CreditCard className="mr-2 h-4 w-4" />,
      label: "Local Receipts",
      description: "Revenue from local sources including excise taxes and interest income",
      color: "#ec4899",
      data: localReceiptsData
    },
    {
      id: "other-income",
      icon: <TrendingUp className="mr-2 h-4 w-4" />,
      label: "Other Income",
      description: "Miscellaneous revenue sources and one-time income",
      color: "#f97316",
      data: otherIncomeData
    }
  ];

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-light-text flex items-center">
          <DollarSign className="mr-3 text-green-400" /> City Revenue
        </h1>
        <p className="text-gray-400 mt-2">
          Explore revenue sources, trends, and projections for Revere's city budget.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Revenue (FY2025)"
          value="$294.68M"
          icon={<DollarSign size={20} className="text-green-500" />}
          change={{ value: 3.1, isPositive: true }}
        />
        <StatCard
          title="Property Taxes"
          value="$120.09M"
          icon={<Landmark size={20} className="text-emerald-500" />}
          change={{ value: 0.5, isPositive: true }}
        />
        <StatCard
          title="Cherry Sheet"
          value="$117.49M"
          icon={<School size={20} className="text-blue-500" />}
          change={{ value: 2.5, isPositive: true }}
        />
        <StatCard
          title="Charges & Fees"
          value="$32.24M"
          icon={<Receipt size={20} className="text-purple-500" />}
          change={{ value: 0.6, isPositive: true }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="glass-card p-5 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="text-highlight text-xl"><Landmark /></div>
            <h3 className="text-lg font-semibold text-light-text">Property Taxes</h3>
          </div>
          <p className="text-sm text-gray-400 mb-3">Revenue from real estate and personal property taxes</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div className="flex flex-col">
              <span className="text-xs text-gray-500">FY2025 Budget</span>
              <span className="text-sm font-medium text-light-text">$120.09M</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500">% of Total Revenue</span>
              <span className="text-sm font-medium text-light-text">40.7%</span>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-5 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="text-highlight text-xl"><School /></div>
            <h3 className="text-lg font-semibold text-light-text">Cherry Sheet Revenue</h3>
          </div>
          <p className="text-sm text-gray-400 mb-3">State aid and reimbursements for local services</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div className="flex flex-col">
              <span className="text-xs text-gray-500">FY2025 Budget</span>
              <span className="text-sm font-medium text-light-text">$117.49M</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500">% of Total Revenue</span>
              <span className="text-sm font-medium text-light-text">39.9%</span>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-5 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="text-highlight text-xl"><CreditCard /></div>
            <h3 className="text-lg font-semibold text-light-text">Other Revenue Sources</h3>
          </div>
          <p className="text-sm text-gray-400 mb-3">Combined local receipts, charges, fees and other income</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div className="flex flex-col">
              <span className="text-xs text-gray-500">FY2025 Budget</span>
              <span className="text-sm font-medium text-light-text">$57.11M</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500">% of Total Revenue</span>
              <span className="text-sm font-medium text-light-text">19.4%</span>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overall" className="mb-6">
        <div className="glass-card p-4 rounded-lg mb-2">
          <h2 className="text-xl font-semibold text-light-text mb-4">Revenue Categories</h2>
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
                {category.id === 'overall' ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <BudgetPieChart
                      title="FY2025 Revenue Breakdown"
                      data={revenuePieData}
                      totalAmount={totalRevenue}
                      height={350}
                    />
                    <div className="space-y-4">
                      <Card className="border-none bg-card/60">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">Revenue Overview</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-4">
                            {revenuePieData.map((item, index) => (
                              <li key={index} className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <div 
                                    className="w-3 h-3 rounded-full mr-2" 
                                    style={{ backgroundColor: item.color }}
                                  ></div>
                                  <span className="text-sm">{item.name}</span>
                                </div>
                                <div className="flex flex-col items-end">
                                  <span className="text-sm font-medium">${(item.value / 1000000).toFixed(2)}M</span>
                                  <span className="text-xs text-muted-foreground">{item.percentage}%</span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                      <Card className="border-none bg-card/60">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">Revenue Highlights</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2 text-sm">
                            <li className="flex items-start">
                              <span className="text-green-500 mr-2">•</span>
                              <span>Property Taxes account for the largest share at 40.7% of total revenue</span>
                            </li>
                            <li className="flex items-start">
                              <span className="text-blue-500 mr-2">•</span>
                              <span>Cherry Sheet Revenue (state aid) represents 39.9% of total revenue</span>
                            </li>
                            <li className="flex items-start">
                              <span className="text-purple-500 mr-2">•</span>
                              <span>Charges and Fees grew by 0.6% compared to FY2024</span>
                            </li>
                            <li className="flex items-start">
                              <span className="text-pink-500 mr-2">•</span>
                              <span>Local Receipts remain steady at 7.5% of total revenue</span>
                            </li>
                          </ul>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <RevenueBarChart
                      title={`${category.label} (2016-2025)`}
                      data={category.data}
                      color={category.color}
                      height={350}
                    />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card className="border-none bg-card/60">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">Key Insights</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2 text-sm">
                            <li className="flex items-start">
                              <span className="text-green-500 mr-2">•</span>
                              <span>FY2025 budgeted amount: ${(category.data[9].budgetedAmount! / 1000000).toFixed(2)}M</span>
                            </li>
                            <li className="flex items-start">
                              <span className="text-blue-500 mr-2">•</span>
                              <span>Historical growth rate: {calculateGrowthRate(category.data).toFixed(1)}% annually</span>
                            </li>
                            <li className="flex items-start">
                              <span className="text-purple-500 mr-2">•</span>
                              <span>Share of total revenue: {findRevenueShare(category.id, revenuePieData).toFixed(1)}%</span>
                            </li>
                            <li className="flex items-start">
                              <span className="text-pink-500 mr-2">•</span>
                              <span>Year-over-year change: {calculateYearOverYearChange(category.data).toFixed(1)}%</span>
                            </li>
                          </ul>
                        </CardContent>
                      </Card>
                      <Card className="border-none bg-card/60">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">Revenue Forecast</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2 text-sm">
                            <li className="flex items-start">
                              <span className="text-emerald-500 mr-2">•</span>
                              <span>FY2023: ${(category.data[7].budgetedAmount! / 1000000).toFixed(2)}M</span>
                            </li>
                            <li className="flex items-start">
                              <span className="text-emerald-500 mr-2">•</span>
                              <span>FY2024: ${(category.data[8].budgetedAmount! / 1000000).toFixed(2)}M</span>
                            </li>
                            <li className="flex items-start">
                              <span className="text-emerald-500 mr-2">•</span>
                              <span>FY2025: ${(category.data[9].budgetedAmount! / 1000000).toFixed(2)}M</span>
                            </li>
                            <li className="flex items-start">
                              <span className="text-amber-500 mr-2">•</span>
                              <span>Projected 3-year growth: {calculate3YearGrowth(category.data).toFixed(1)}%</span>
                            </li>
                          </ul>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </DashboardLayout>
  );
};

// Helper function to calculate growth rate
const calculateGrowthRate = (data: any[]) => {
  // Use first and last years with actual data to calculate growth
  const firstYear = data.find(d => d.actualAmount !== null);
  const lastYear = [...data].reverse().find(d => d.actualAmount !== null);
  
  if (!firstYear || !lastYear) return 0;
  
  const years = data.filter(d => d.actualAmount !== null).length - 1;
  if (years <= 0) return 0;
  
  return ((lastYear.actualAmount! / firstYear.actualAmount!) ** (1/years) - 1) * 100;
};

// Helper function to calculate year-over-year change
const calculateYearOverYearChange = (data: any[]) => {
  // Compare last two years with budgeted amounts
  const currentYear = data[9].budgetedAmount;
  const previousYear = data[8].budgetedAmount;
  
  if (!currentYear || !previousYear) return 0;
  
  return ((currentYear / previousYear) - 1) * 100;
};

// Helper function to calculate 3-year growth
const calculate3YearGrowth = (data: any[]) => {
  // FY2023 to FY2025 growth
  const year2023 = data[7].budgetedAmount;
  const year2025 = data[9].budgetedAmount;
  
  if (!year2023 || !year2025) return 0;
  
  return ((year2025 / year2023) - 1) * 100;
};

// Helper function to find the revenue share
const findRevenueShare = (categoryId: string, pieData: any[]) => {
  const categories: Record<string, string> = {
    'property-taxes': 'Property Taxes',
    'cherry-sheet': 'Cherry Sheet Revenue',
    'charges-fees': 'Charges and Fees',
    'local-receipts': 'Local Receipts',
    'other-income': 'Other Income'
  };
  
  const item = pieData.find(item => item.name === categories[categoryId]);
  return item ? item.percentage : 0;
};

export default RevenuePage;
