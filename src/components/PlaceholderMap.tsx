
import { MapIcon } from "lucide-react";

interface PlaceholderMapProps {
  title: string;
  height?: number;
}

const PlaceholderMap = ({ title, height = 300 }: PlaceholderMapProps) => {
  return (
    <div className="glass-card rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gray-800">
        <h3 className="text-lg font-medium text-light-text">{title}</h3>
      </div>
      
      <div 
        className="flex flex-col items-center justify-center text-gray-500 bg-card-bg"
        style={{ height: `${height}px` }}
      >
        <MapIcon size={48} strokeWidth={1} />
        <p className="mt-4 text-center">
          Map visualization of Revere coming soon
        </p>
        <p className="text-sm text-gray-600 max-w-md text-center mt-2">
          This area will display geographic data for Revere, Massachusetts when real data is integrated.
        </p>
      </div>
    </div>
  );
};

export default PlaceholderMap;
