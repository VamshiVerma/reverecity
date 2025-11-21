
import { useState } from "react";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/formatters";

// Define types for our data
interface RevenueDataPoint {
  year: string; // Using just the year number (e.g., "2016") instead of "FY2016"
  actualAmount: number | null;
  budgetedAmount: number | null;
  isFutureYear: boolean;
}

interface RevenueBarChartProps {
  title: string;
  data: RevenueDataPoint[];
  color: string;
  height?: number;
}

const RevenueBarChart = ({ 
  title, 
  data,
  color,
  height = 350 
}: RevenueBarChartProps) => {
  // Transform the data for Recharts
  const chartData = data.map(item => {
    const dataPoint: any = {
      name: item.year, // Just the year number
    };

    // For future years (only budgeted amount)
    if (item.isFutureYear) {
      dataPoint.budgeted = item.budgetedAmount;
      return dataPoint;
    }

    // For historical years
    if (item.actualAmount !== null && item.budgetedAmount !== null) {
      // Check if over budget
      if (item.actualAmount > item.budgetedAmount) {
        dataPoint.budgeted = item.budgetedAmount;
        dataPoint.overBudget = item.actualAmount - item.budgetedAmount;
      } else {
        dataPoint.actual = item.actualAmount;
        // If under budget, show the difference
        if (item.actualAmount < item.budgetedAmount) {
          dataPoint.underBudget = item.budgetedAmount - item.actualAmount;
        }
      }
    } else if (item.actualAmount !== null) {
      dataPoint.actual = item.actualAmount;
    } else if (item.budgetedAmount !== null) {
      dataPoint.budgeted = item.budgetedAmount;
    }

    return dataPoint;
  });

  // Custom tooltip to show the relevant budget information
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <div className="bg-card p-3 rounded-md border border-border shadow-md">
          <p className="font-medium text-sm">{label}</p>
          <div className="mt-2 space-y-1 text-xs">
            {data.actual !== undefined && (
              <p className="text-emerald-500">
                Actual: {formatCurrency(data.actual)}
              </p>
            )}
            {data.budgeted !== undefined && (
              <p className="text-blue-500">
                Budgeted: {formatCurrency(data.budgeted)}
              </p>
            )}
            {data.overBudget !== undefined && (
              <p className="text-red-500">
                Over Budget: {formatCurrency(data.overBudget)}
              </p>
            )}
            {data.underBudget !== undefined && (
              <p className="text-amber-500">
                Under Budget: {formatCurrency(data.underBudget)}
              </p>
            )}
            {data.actual !== undefined && data.budgeted !== undefined && (
              <p className={`${data.actual > data.budgeted ? 'text-red-500' : 'text-emerald-500'}`}>
                Difference: {formatCurrency(data.actual - data.budgeted)}
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Function to format Y-axis values
  const formatYAxis = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value}`;
  };

  return (
    <div className="glass-card p-4 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-light-text">{title}</h3>
      </div>
      
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#444" vertical={false} />
            <XAxis 
              dataKey="name" 
              tick={{ fill: "#999" }} 
              axisLine={{ stroke: "#555" }}
              tickLine={{ stroke: "#555" }}
              // Ensure all ticks are shown
              interval={0}
              // Rotate labels if needed for long datasets
              angle={data.length > 8 ? -45 : 0}
              textAnchor={data.length > 8 ? "end" : "middle"}
              height={data.length > 8 ? 60 : 30}
            />
            <YAxis 
              tickFormatter={formatYAxis}
              tick={{ fill: "#999" }} 
              axisLine={{ stroke: "#555" }}
              tickLine={{ stroke: "#555" }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {/* Actual amounts - emerald */}
            <Bar 
              dataKey="actual" 
              stackId="a"
              fill="#10b981" // emerald-500
              radius={[4, 4, 0, 0]}
              name="Actual"
            />
            
            {/* Budgeted amounts - using the passed color */}
            <Bar 
              dataKey="budgeted" 
              stackId="a"
              fill={color} 
              radius={[4, 4, 0, 0]}
              name="Budgeted"
            />
            
            {/* Over budget amounts - red */}
            <Bar 
              dataKey="overBudget" 
              stackId="a"
              fill="#ef4444" // red-500
              radius={[4, 4, 0, 0]}
              name="Over Budget"
            />
            
            {/* Under budget amounts - amber */}
            <Bar 
              dataKey="underBudget" 
              stackId="a"
              fill="#f59e0b" // amber-500
              radius={[4, 4, 0, 0]}
              name="Under Budget"
              opacity={0.7}
            />
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RevenueBarChart;
