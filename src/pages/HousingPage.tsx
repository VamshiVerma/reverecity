
import DashboardLayout from "@/components/DashboardLayout";
import LineChart from "@/components/charts/LineChart";
import BarChart from "@/components/charts/BarChart";
import PieChart from "@/components/charts/PieChart";
import { Building, Home, TrendingUp, DollarSign, CalendarDays } from "lucide-react";
import StatCard from "@/components/cards/StatCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

// Format housing data for visualization
const formatHousingPriceData = () => {
  // Use the last 12 months of housing price data
  const priceData = [
    { name: "Mar", value: 567500 },
    { name: "Apr", value: 675000 },
    { name: "May", value: 635000 },
    { name: "Jun", value: 650000 },
    { name: "Jul", value: 690000 },
    { name: "Aug", value: 707500 },
    { name: "Sep", value: 705000 },
    { name: "Oct", value: 650000 },
    { name: "Nov", value: 707000 },
    { name: "Dec", value: 650000 },
    { name: "Jan", value: 595000 },
    { name: "Feb", value: 655000 }
  ];
  return priceData;
};

// Format homes sold data for visualization
const formatHomesSoldData = () => {
  // Use the last 12 months of homes sold data
  const soldData = [
    { name: "Mar", value: 28 },
    { name: "Apr", value: 30 },
    { name: "May", value: 44 },
    { name: "Jun", value: 29 },
    { name: "Jul", value: 29 },
    { name: "Aug", value: 28 },
    { name: "Sep", value: 31 },
    { name: "Oct", value: 30 },
    { name: "Nov", value: 25 },
    { name: "Dec", value: 29 },
    { name: "Jan", value: 18 },
    { name: "Feb", value: 17 }
  ];
  return soldData;
};

// Format days on market data for visualization
const formatDaysOnMarketData = () => {
  // Use the last 12 months of days on market data
  const daysData = [
    { name: "Mar", value: 16 },
    { name: "Apr", value: 17 },
    { name: "May", value: 23 },
    { name: "Jun", value: 19 },
    { name: "Jul", value: 20 },
    { name: "Aug", value: 17 },
    { name: "Sep", value: 17 },
    { name: "Oct", value: 19 },
    { name: "Nov", value: 20 },
    { name: "Dec", value: 19 },
    { name: "Jan", value: 21 },
    { name: "Feb", value: 35 }
  ];
  return daysData;
};

// Migration data
const inboundData = [
  { city: "New York, NY", count: 3926 },
  { city: "Hartford, CT", count: 3225 },
  { city: "Springfield, MA", count: 1310 },
  { city: "Washington, DC", count: 408 },
  { city: "San Francisco, CA", count: 400 }
];

const outboundData = [
  { city: "Portland, ME", count: 2974 },
  { city: "Lebanon, NH", count: 2252 },
  { city: "Miami, FL", count: 1558 },
  { city: "Cape Coral, FL", count: 962 },
  { city: "Orlando, FL", count: 952 }
];

// Property types data for pie chart
const propertyTypesData = [
  { name: "Single Family", value: 42 },
  { name: "Multi-Family", value: 28 },
  { name: "Condo", value: 21 },
  { name: "Apartment", value: 7 },
  { name: "Other", value: 2 }
];

// Ownership data for pie chart
const ownershipData = [
  { name: "Owner Occupied", value: 52 },
  { name: "Renter Occupied", value: 43 },
  { name: "Vacant", value: 5 }
];

const HousingPage = () => {
  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-light-text flex items-center">
          <Building className="mr-3 text-highlight" /> Housing
        </h1>
        <p className="text-gray-400 mt-2">
          Explore housing data including property values, permits, and development trends for Revere, Massachusetts.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Median Home Price"
          value="$655,000"
          icon={<DollarSign size={20} />}
          change={{ value: -0.76, isPositive: false }}
          footnote="February 2025 data"
        />
        <StatCard
          title="Homes Sold"
          value="17"
          icon={<Home size={20} />}
          change={{ value: 54.5, isPositive: true }}
          footnote="February 2025 data"
        />
        <StatCard
          title="Median Days on Market"
          value="35"
          icon={<CalendarDays size={20} />}
          change={{ value: 7, isPositive: false }}
          footnote="7 days more than last year"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <DollarSign className="text-highlight" size={18} /> 
              Median Home Price Trend (Last 12 Months)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[250px]">
            <LineChart
              data={formatHousingPriceData()}
              yAxisLabel="Price ($)"
              height={250}
              color="#BB86FC"
              timeframe="Mar 2024 - Feb 2025"
            />
          </CardContent>
        </Card>
        
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Home className="text-highlight" size={18} /> 
              Homes Sold (Last 12 Months)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[250px]">
            <BarChart
              data={formatHomesSoldData()}
              yAxisLabel="Number of Homes"
              height={250}
              color="#03DAC6"
              title=""
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <CalendarDays className="text-highlight" size={18} /> 
              Days on Market (Last 12 Months)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[250px]">
            <LineChart
              data={formatDaysOnMarketData()}
              yAxisLabel="Days"
              height={250}
              color="#CF6679"
              timeframe="Mar 2024 - Feb 2025"
            />
          </CardContent>
        </Card>
        
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Property Types</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <PieChart
              title=""
              data={propertyTypesData}
              colors={["#9b87f5", "#03DAC6", "#CF6679", "#8BC34A", "#FFC107"]}
              height={250}
            />
          </CardContent>
        </Card>
        
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Ownership vs. Rental</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <PieChart
              title=""
              data={ownershipData}
              colors={["#BB86FC", "#03DAC6", "#CF6679"]}
              height={250}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <TrendingUp className="text-green-400" size={18} />
              People Moving to Revere (Jan-Mar 2025)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {inboundData.map((item, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-light-text">{i+1}. {item.city}</span>
                  <span className="font-semibold">{item.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <TrendingUp className="text-red-400" size={18} transform="rotate(180)" />
              People Leaving Revere (Jan-Mar 2025)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {outboundData.map((item, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-light-text">{i+1}. {item.city}</span>
                  <span className="font-semibold">{item.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default HousingPage;
