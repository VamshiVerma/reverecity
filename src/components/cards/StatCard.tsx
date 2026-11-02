import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

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

const StatCard = ({ title, value, change, className, footnote }: StatCardProps) => {
  return (
    <div className={cn("flex h-full flex-col rounded-[28px] bg-card p-5 md:p-6", className)}>
      <h3 className="text-[14px] text-muted-foreground">{title}</h3>
      <div className="figure mt-2 text-[44px] leading-none text-foreground">{value}</div>
      {change && (
        <div className="mt-3 flex items-center gap-1.5 text-[13px]">
          <span className={cn("inline-flex items-center gap-0.5 font-semibold tnum", change.isPositive ? "text-highlight" : "text-highlight-secondary")}>
            {change.isPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {Math.abs(change.value)}%
          </span>
          <span className="text-muted-foreground">vs the previous estimate</span>
        </div>
      )}
      {footnote && <div className="mt-auto pt-3 text-[13px] leading-relaxed text-muted-foreground">{footnote}</div>}
    </div>
  );
};

export default StatCard;
