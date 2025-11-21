
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  change?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  footnote?: string;
}

const StatCard = ({ title, value, icon, change, className, footnote }: StatCardProps) => {
  return (
    <div className={cn("glass-card p-5 rounded-lg flex flex-col h-full shadow-md backdrop-blur-sm border border-white/10", className)}>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium text-gray-400">{title}</h3>
        <div className="text-highlight p-2 bg-highlight/10 rounded-full">{icon}</div>
      </div>
      
      <div className="mb-2">
        <div className="text-3xl font-bold text-light-text">{value}</div>
      </div>
      
      {change && (
        <div className={cn(
          "mt-1 text-sm flex items-center",
          change.isPositive ? "text-green-400" : "text-red-400"
        )}>
          <span className="mr-1">
            {change.isPositive ? "↑" : "↓"}
          </span>
          <span>{Math.abs(change.value)}%</span>
          <span className="ml-1 text-gray-400">from last period</span>
        </div>
      )}
      
      {footnote && (
        <div className="mt-auto pt-2 text-xs text-gray-400">
          {footnote}
        </div>
      )}
    </div>
  );
};

export default StatCard;
