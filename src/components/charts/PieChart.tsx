
import { useState, useEffect } from "react";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Sector
} from "recharts";

interface DataPoint {
  name: string;
  value: number;
  color?: string; // Added color as an optional property
}

interface PieChartProps {
  title?: string;
  colors?: string[];
  categories?: string[];
  height?: number;
  data?: DataPoint[];
}

const PieChart = ({ 
  title, 
  colors = ["#9b87f5", "#03DAC6", "#CF6679", "#8BC34A", "#FFC107"], 
  categories,
  height = 250,
  data: providedData
}: PieChartProps) => {
  const [data, setData] = useState<DataPoint[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  useEffect(() => {
    // If data is provided, use it directly
    if (providedData && providedData.length > 0) {
      setData(providedData);
      return;
    }
    
    // Use provided categories or default
    const labels = categories || ['Category A', 'Category B', 'Category C', 'Category D', 'Category E'];
    
    // Generate random placeholder data
    const randomData = labels.map(label => ({
      name: label,
      value: Math.floor(Math.random() * 100) + 10,
    }));
    
    setData(randomData);
  }, [categories, providedData]);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(undefined);
  };

  // Custom renderer for active slice
  const renderActiveShape = (props: any) => {
    const { 
      cx, cy, innerRadius, outerRadius, startAngle, endAngle,
      fill, payload, value
    } = props;
    
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 8}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 10}
          outerRadius={outerRadius + 14}
          fill={fill}
        />
      </g>
    );
  };

  // Custom tooltip formatter
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const total = data.total;
      const percentage = Math.round((data.value / total) * 100);
      
      return (
        <div className="bg-card p-3 rounded-md border border-border shadow-md">
          <p className="font-medium text-sm">{data.name}</p>
          <div className="mt-2 space-y-1 text-xs">
            <p className="text-foreground">Rate: {data.value.toFixed(3)}</p>
            <p className="text-muted-foreground">{percentage}% of total</p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Calculate total for percentages
  const total = data.reduce((sum, item) => sum + item.value, 0);
  // Add total to each item for percentage calculation in tooltip
  const dataWithTotal = data.map(item => ({ ...item, total }));

  return (
    <div className={title ? "glass-card p-4 rounded-lg" : ""}>
      {title && (
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-light-text">{title}</h3>
        </div>
      )}
      
      <div style={{ height: height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart>
            <Pie
              data={dataWithTotal}
              cx="50%"
              cy="50%"
              outerRadius={80}
              innerRadius={46}
              paddingAngle={3}
              dataKey="value"
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              onMouseEnter={onPieEnter}
              onMouseLeave={onPieLeave}
              stroke="#1e1e1e"
              strokeWidth={1}
            >
              {dataWithTotal.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color || colors[index % colors.length]} // Use the provided color or fall back to colors array
                  className="hover:opacity-90 transition-opacity"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              layout="vertical" 
              verticalAlign="middle" 
              align="right"
              iconSize={8}
              iconType="circle"
              wrapperStyle={{ 
                fontSize: '10px', 
                paddingLeft: '10px', 
                lineHeight: '1.2em' 
              }}
              formatter={(value, entry, index) => (
                <span style={{ color: 'inherit', fontSize: '10px' }}>
                  {value} ({dataWithTotal[index].value.toFixed(2)})
                </span>
              )}
            />
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PieChart;
