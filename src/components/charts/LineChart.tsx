import { useState, useEffect } from "react";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DataPoint {
  name: string;
  value: number;
}

interface LineChartProps {
  title?: string;
  color?: string;
  timeframe?: string;
  yAxisLabel?: string;
  height?: number;
  data?: DataPoint[];
}

const LineChart = ({ 
  title, 
  color = "#BB86FC", 
  timeframe = "Last 12 Months", 
  yAxisLabel,
  height = 200,
  data
}: LineChartProps) => {
  const [chartData, setChartData] = useState<DataPoint[]>([]);

  useEffect(() => {
    // If data is provided, use it directly
    if (data && data.length > 0) {
      setChartData(data);
      return;
    }
    
    // Otherwise generate random placeholder data
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const randomData = months.map((month, index) => {
      const baseValue = 40 + Math.random() * 60;
      // Create an upward trend with some randomness
      const value = baseValue + (index * 5) + (Math.random() * 20 - 10);
      return {
        name: month,
        value: Math.round(value * 10) / 10,
      };
    });
    
    setChartData(randomData);
  }, [data]);

  return (
    <div className={title ? "glass-card p-4 rounded-lg" : ""}>
      {title && (
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-light-text">{title}</h3>
          <span className="text-xs text-gray-400">{timeframe}</span>
        </div>
      )}
      
      <div style={{ height: height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsLineChart
            data={chartData}
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis dataKey="name" tick={{ fill: "#999" }} />
            <YAxis 
              tick={{ fill: "#999" }} 
              label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', style: { fill: '#999', textAnchor: 'middle' } } : undefined} 
              tickFormatter={(value) => value >= 1000 ? `${(value/1000)}k` : value}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#333', border: '1px solid #555' }}
              labelStyle={{ color: '#fff' }}
              formatter={(value: any) => {
                if (yAxisLabel?.includes("Price")) {
                  return [`$${value.toLocaleString()}`];
                }
                return [value];
              }}
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={color} 
              strokeWidth={2}
              dot={{ r: 3, fill: color }}
              activeDot={{ r: 5, fill: color }}
            />
          </RechartsLineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default LineChart;
