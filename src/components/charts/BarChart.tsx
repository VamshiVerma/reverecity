import { useState, useEffect } from "react";
import {
  BarChart as RechartsBarChart,
  Bar,
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

interface BarChartProps {
  title?: string;
  color?: string;
  categories?: string[];
  yAxisLabel?: string;
  height?: number;
  data?: DataPoint[];
}

const BarChart = ({ 
  title, 
  color = "#03DAC6", 
  categories,
  yAxisLabel,
  height = 200,
  data
}: BarChartProps) => {
  const [chartData, setChartData] = useState<DataPoint[]>([]);

  useEffect(() => {
    // If data is provided, use it directly
    if (data && data.length > 0) {
      setChartData(data);
      return;
    }
    
    // Otherwise use provided categories or default
    const labels = categories || ['Category A', 'Category B', 'Category C', 'Category D', 'Category E'];
    
    // Generate random placeholder data
    const randomData = labels.map(label => ({
      name: label,
      value: Math.floor(Math.random() * 100) + 20,
    }));
    
    setChartData(randomData);
  }, [categories, data]);

  return (
    <div className={title ? "glass-card p-4 rounded-lg" : ""}>
      {title && (
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-light-text">{title}</h3>
          <span className="text-xs text-gray-400">Placeholder Data</span>
        </div>
      )}
      
      <div style={{ height: height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart
            data={chartData}
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis dataKey="name" tick={{ fill: "#999" }} />
            <YAxis 
              tick={{ fill: "#999" }} 
              label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', style: { fill: '#999', textAnchor: 'middle' } } : undefined}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#333', border: '1px solid #555' }}
              labelStyle={{ color: '#fff' }}
            />
            <Bar 
              dataKey="value" 
              fill={color} 
              radius={[4, 4, 0, 0]}
            />
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default BarChart;
