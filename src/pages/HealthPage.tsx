
import React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatCard from "@/components/cards/StatCard";
import { Hospital, Thermometer, User, Users } from "lucide-react";
import PieChart from "@/components/charts/PieChart";
import LineChart from "@/components/charts/LineChart";
import BarChart from "@/components/charts/BarChart";

const HealthPage = () => {
  // Health coverage data
  const healthCoverageData = [
    { name: "Employer Coverage", value: 37.9 },
    { name: "Medicaid", value: 32.9 },
    { name: "Medicare", value: 9.62 },
    { name: "Non-Group", value: 13.8 },
    { name: "Military or VA", value: 0.36 },
    { name: "Uninsured", value: 5.4 }
  ];

  // Health care diversity data - by age
  const healthCareAgeData = [
    { name: "Under 18 years", value: 21.6 },
    { name: "18-34 years", value: 22.2 },
    { name: "35-64 years", value: 41.1 },
    { name: "65+ years", value: 15.1 }
  ];

  // Health care diversity data - by gender
  const healthCareGenderData = [
    { name: "Male", value: 49.4 },
    { name: "Female", value: 50.6 }
  ];

  // Patient data for different provider types
  const providerPatientData = [
    { name: "Primary Care", value: 667 },
    { name: "Dental", value: 424 },
    { name: "Mental Health", value: 99 }
  ];

  // Healthcare trend data
  const healthcareTrendData = [
    { name: "2018", value: 620 },
    { name: "2019", value: 632 },
    { name: "2020", value: 638 },
    { name: "2021", value: 648 },
    { name: "2022", value: 667 }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold tracking-tight">Health Dashboard: Revere, MA</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive analysis of health statistics and healthcare metrics in Revere
          </p>
        </div>

        {/* Health Insurance Coverage Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard 
            title="Health Coverage Rate" 
            value="94.6%" 
            icon={<Hospital className="h-5 w-5" />}
            footnote="Percent of population with health insurance"
          />
          <StatCard 
            title="Uninsured Rate" 
            value="5.4%" 
            icon={<Users className="h-5 w-5" />}
            change={{
              value: 9.23,
              isPositive: false
            }}
            footnote="9.23% increase from previous year"
          />
          <StatCard 
            title="Disability Rate (under 65)" 
            value="8.1%" 
            icon={<User className="h-5 w-5" />}
            footnote="Persons with disability under age 65"
          />
        </div>

        {/* Health Care Provider Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard 
            title="Primary Care Patients" 
            value="667" 
            icon={<Hospital className="h-5 w-5" />}
            change={{
              value: 2.93,
              isPositive: false
            }}
            footnote="Average patients per physician yearly"
          />
          <StatCard 
            title="Dental Patients" 
            value="424" 
            icon={<Thermometer className="h-5 w-5" />}
            footnote="Average patients per dentist yearly"
          />
          <StatCard 
            title="Mental Health Patients" 
            value="99" 
            icon={<User className="h-5 w-5" />}
            footnote="Average patients per provider yearly"
          />
        </div>

        {/* External Data Visualizations */}
        <Card>
          <CardHeader>
            <CardTitle>Health Care Diversity by Gender</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-video w-full">
              <iframe 
                width="100%" 
                height="100%" 
                src="https://datausa.io/profile/geo/revere-ma/health/health_care_diversity?viz=true" 
                frameBorder="0" 
                className="rounded-md"
                title="Health Care Diversity Chart"
              />
            </div>
            <div className="text-center mt-4 text-sm text-muted-foreground">
              The chart shows the number of people with health coverage by gender in Revere, MA (2023)
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Uninsured People and Insurance Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-video w-full">
              <iframe 
                width="100%" 
                height="100%" 
                src="https://datausa.io/profile/geo/revere-ma/health/uninsured_people?viz=true" 
                frameBorder="0"
                className="rounded-md" 
                title="Uninsured People Chart"
              />
            </div>
            <div className="text-center mt-4 text-sm text-muted-foreground">
              Between 2022 and 2023, the percent of uninsured citizens in Revere, MA grew by 9.23% from 4.95% to 5.4%
            </div>
          </CardContent>
        </Card>

        {/* Health Coverage Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Health Insurance Coverage</CardTitle>
            </CardHeader>
            <CardContent>
              <PieChart 
                data={healthCoverageData}
                colors={["#4CAF50", "#8BC34A", "#CDDC39", "#FFEB3B", "#FFC107", "#F44336"]} 
                height={300}
              />
              <div className="text-center mt-2 text-sm font-medium text-muted-foreground">
                94.6% of Revere residents have health coverage
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Provider Patient Ratios</CardTitle>
            </CardHeader>
            <CardContent>
              <BarChart 
                data={providerPatientData}
                color="#9C27B0"
                yAxisLabel="Patients"
                height={300}
              />
              <div className="text-center mt-2 text-sm font-medium text-muted-foreground">
                Average annual patients per provider type in Suffolk County
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Health Demographics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Health Coverage by Age Group</CardTitle>
            </CardHeader>
            <CardContent>
              <PieChart 
                data={healthCareAgeData}
                colors={["#2196F3", "#03A9F4", "#00BCD4", "#607D8B"]} 
                height={300}
              />
              <div className="text-center mt-2 text-sm font-medium text-muted-foreground">
                Distribution of insured persons by age range (2023)
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Health Coverage by Gender</CardTitle>
            </CardHeader>
            <CardContent>
              <PieChart 
                data={healthCareGenderData}
                colors={["#3F51B5", "#E91E63"]} 
                height={300}
              />
              <div className="text-center mt-2 text-sm font-medium text-muted-foreground">
                Distribution of insured persons by gender (2023)
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Healthcare Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Primary Care Physician Patient Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <LineChart 
                data={healthcareTrendData}
                color="#FF5722"
                yAxisLabel="Patients per Physician"
                height={300}
              />
            </div>
            <div className="text-center mt-4 text-sm text-muted-foreground">
              The number of patients seen by primary care physicians in Suffolk County has increased by 2.93% from 2021 to 2022
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default HealthPage;
