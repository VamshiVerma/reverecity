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

const StatCard = ({ title, value, icon, change, className, footnote }: StatCardProps) => {
  return (
    <div
      className={cn(
        "group glass-card hover-lift relative flex h-full flex-col overflow-hidden p-5",
        className
      )}
    >
      {/* top brand hairline */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-highlight/50 to-transparent opacity-70" />

      <div className="mb-4 flex items-start justify-between gap-3">
        <h3 className="eyebrow leading-tight">{title}</h3>
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-highlight/10 text-highlight ring-1 ring-highlight/20 transition-colors group-hover:bg-highlight/15">
          {icon}
        </div>
      </div>

      <div className="text-3xl font-display font-semibold tracking-tight text-foreground tnum">
        {value}
      </div>

      {change && (
        <div className="mt-2 flex items-center gap-1.5 text-sm">
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold tnum",
              change.isPositive
                ? "bg-success/10 text-success"
                : "bg-destructive/10 text-destructive"
            )}
          >
            {change.isPositive ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {Math.abs(change.value)}%
          </span>
          <span className="text-muted-foreground">vs last period</span>
        </div>
      )}

      {footnote && (
        <div className="mt-auto pt-3 text-xs leading-relaxed text-muted-foreground">
          {footnote}
        </div>
      )}
    </div>
  );
};

export default StatCard;
