
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface CategoryCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  stats: {
    label: string;
    value: string;
  }[];
  to?: string;  // Make 'to' optional since we won't always want view details
  className?: string;
}

const CategoryCard = ({ title, description, icon, stats, to, className }: CategoryCardProps) => {
  return (
    <div className={cn("glass-card rounded-lg overflow-hidden flex flex-col", className)}>
      <div className="p-5 flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="text-highlight text-xl">{icon}</div>
            <h3 className="text-lg font-semibold text-light-text">{title}</h3>
          </div>
          <p className="mt-2 text-sm text-gray-400">{description}</p>
        </div>
      </div>
      
      <div className="px-5 pb-3 mt-auto">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {stats.map((stat, index) => (
            <div key={index} className="flex flex-col">
              <span className="text-xs text-gray-500">{stat.label}</span>
              <span className="text-sm font-medium text-light-text">{stat.value}</span>
            </div>
          ))}
        </div>
      </div>
      
      {to && (
        <Link 
          to={to}
          className="px-5 py-3 border-t border-gray-800 text-sm flex items-center justify-between text-highlight hover:bg-gray-800 transition-colors"
        >
          <span>View Details</span>
          <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
};

export default CategoryCard;
