import { useState } from "react";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Sector
} from "recharts";
import { formatCurrency, formatPercent } from "@/lib/formatters";

interface BudgetCategory {
  name: string;
  value: number;
  percentage: number | string;
  color: string;
}

interface BudgetPieChartProps {
  title: string;
  data: BudgetCategory[];
  height?: number;
  totalAmount: number;
}

const BudgetPieChart = ({ 
  title, 
  data,
  totalAmount,
  height = 350
}: BudgetPieChartProps) => {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(undefined);
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <div className="bg-card p-3 rounded-md border border-border shadow-md">
          <p className="font-medium text-sm">{data.name}</p>
          <div className="mt-2 space-y-1 text-xs">
            <p className="text-foreground">{formatCurrency(data.value)}</p>
            <p className="text-muted-foreground">{typeof data.percentage === 'number' ? formatPercent(data.percentage) : data.percentage}</p>
          </div>
        </div>
      );
    }
    return null;
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

  // Custom legend formatter with improved spacing and layout
  const renderLegendText = (value: string, entry: any, index: number) => {
    const { color } = entry;
    const displayValue = value.length > 16 ? value.slice(0, 16) + '...' : value;
    const percentageValue = data[index].percentage;
    const formattedPercentage = typeof percentageValue === 'number' 
      ? formatPercent(percentageValue) 
      : percentageValue;
    
    return (
      <span className="text-xs flex items-center">
        <span className="font-medium" style={{ color }}>{displayValue}</span>
        <span className="ml-1 text-muted-foreground">
          ({formattedPercentage})
        </span>
      </span>
    );
  };

  return (
    <div className="glass-card p-4 rounded-lg">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-medium text-light-text">{title}</h3>
      </div>
      
      <div style={{ height }} className="relative">
        {/* Total in center with improved styling */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
          <div className="bg-background/80 backdrop-blur-sm px-4 py-3 rounded-full shadow-md border border-border/30">
            <span className="text-2xl font-bold text-foreground block text-center">
              {formatCurrency(totalAmount)}
            </span>
            <span className="text-xs text-muted-foreground block text-center">Total</span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={80}
              outerRadius={110}
              paddingAngle={2}
              dataKey="value"
              onMouseEnter={onPieEnter}
              onMouseLeave={onPieLeave}
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color}
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth={1}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              layout="vertical" 
              verticalAlign="middle" 
              align="right"
              formatter={renderLegendText}
              wrapperStyle={{
                paddingLeft: '15px',
                maxHeight: '100%',
                overflowY: 'auto',
                fontSize: '12px'
              }}
              iconSize={10}
              iconType="circle"
            />
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default BudgetPieChart;
