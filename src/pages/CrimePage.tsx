
import React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatCard from "@/components/cards/StatCard";
import { AlertTriangle, Shield, ShieldAlert, MapPin } from "lucide-react";
import PieChart from "@/components/charts/PieChart"; 
import { formatCurrency } from "@/lib/formatters";
import CrimeMap from "@/components/CrimeMap";
import CrimeTable from "@/components/CrimeTable";
import CrimeCostBreakdown from "@/components/CrimeCostBreakdown";

const CrimePage = () => {
  // Crime data for Revere (02151)
  const violentCrimeData = [
    { name: "Assault", value: 2.219 },
    { name: "Robbery", value: 0.4346 },
    { name: "Rape", value: 0.4784 },
    { name: "Murder", value: 0.0324 }
  ];
  
  const propertyCrimeData = [
    { name: "Theft", value: 6.353 },
    { name: "Vehicle Theft", value: 1.528 },
    { name: "Burglary", value: 1.142 },
    { name: "Arson", value: 0.0593 }
  ];
  
  const otherCrimeData = [
    { name: "Vandalism", value: 7.160 },
    { name: "Drug Crimes", value: 1.496 },
    { name: "Identity Theft", value: 0.3322 },
    { name: "Kidnapping", value: 0.0818 },
    { name: "Animal Cruelty", value: 0.0259 }
  ];

  // Crime grade colors
  const crimeGradeColors = {
    "A": "#4CAF50",
    "B+": "#8BC34A",
    "B": "#CDDC39",
    "C+": "#FFEB3B",
    "C": "#FFC107",
    "D": "#FF9800",
    "F": "#F44336"
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold tracking-tight">Crime Dashboard: Revere, MA</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive analysis of crime statistics and safety metrics in Revere
          </p>
        </div>

        {/* Crime Grade Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard 
            title="Overall Crime Grade" 
            value="B" 
            icon={<Shield className="h-5 w-5" />}
            change={{
              value: 63,
              isPositive: true
            }}
            footnote="Safer than 63% of U.S. zip codes"
          />
          <StatCard 
            title="Violent Crime Grade" 
            value="C+" 
            icon={<ShieldAlert className="h-5 w-5" />}
            footnote="3.165 crimes per 1,000 residents"
          />
          <StatCard 
            title="Property Crime Grade" 
            value="B+" 
            icon={<AlertTriangle className="h-5 w-5" />}
            footnote="9.082 crimes per 1,000 residents"
          />
        </div>

        {/* Crime Cost Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard 
            title="Total Cost of Crime (2025)" 
            value={formatCurrency(22034373)} 
            icon={<MapPin className="h-5 w-5" />}
            footnote="Projected for 02151 in 2025"
          />
          <StatCard 
            title="Cost Per Resident" 
            value={formatCurrency(306)} 
            icon={<MapPin className="h-5 w-5" />}
            change={{
              value: 34,
              isPositive: false
            }}
            footnote="$159 less than U.S. average"
          />
          <StatCard 
            title="Cost Per Household" 
            value={formatCurrency(872)} 
            icon={<MapPin className="h-5 w-5" />}
            footnote="0.8% of median household income"
          />
        </div>

        {/* Crime Breakdowns Charts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Violent Crime Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <PieChart 
                data={violentCrimeData}
                colors={["#F44336", "#FF9800", "#FFEB3B", "#616161"]} 
                height={300}
              />
              <div className="text-center mt-2 text-sm font-medium text-muted-foreground">
                Total Rate: 3.165 per 1,000 (Grade: C+)
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Property Crime Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <PieChart 
                data={propertyCrimeData}
                colors={["#2196F3", "#03A9F4", "#00BCD4", "#607D8B"]} 
                height={300}
              />
              <div className="text-center mt-2 text-sm font-medium text-muted-foreground">
                Total Rate: 9.082 per 1,000 (Grade: B+)
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Other Crime Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <PieChart 
                data={otherCrimeData}
                colors={["#9C27B0", "#673AB7", "#3F51B5", "#009688", "#795548"]} 
                height={300}
              />
              <div className="text-center mt-2 text-sm font-medium text-muted-foreground">
                Total Rate: 9.096 per 1,000 (Grade: C)
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Crime Cost Breakdown */}
        <CrimeCostBreakdown />
        
        {/* Safety Map */}
        <CrimeMap />
        
        {/* Detailed Crime Tables */}
        <CrimeTable />
        
        {/* Safety Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Regional Crime Cost Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { region: "02151, MA", cost: 306 },
                { region: "02116, MA", cost: 652 },
                { region: "01748, MA", cost: 147 },
                { region: "Massachusetts", cost: 274 },
                { region: "USA", cost: 464 }
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center p-4 bg-card rounded-xl border">
                  <span className="text-sm text-muted-foreground mb-2">{item.region}</span>
                  <span className={`text-xl font-bold ${item.region === "02151, MA" ? "text-primary" : ""}`}>
                    ${item.cost}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CrimePage;
