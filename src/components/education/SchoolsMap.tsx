
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import { School } from "./SchoolCard";

interface SchoolsMapProps {
  schools: School[];
  selectedSchool: School | null;
  onSelectSchool: (school: School) => void;
}

export default function SchoolsMap({ 
  schools, 
  selectedSchool, 
  onSelectSchool 
}: SchoolsMapProps) {
  // This is a placeholder component for a map
  // In a real implementation, you would use a mapping library like Leaflet or Google Maps
  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-purple-900/70 to-indigo-900/70 pb-2">
        <CardTitle className="text-xl font-bold text-white">Schools Map</CardTitle>
      </CardHeader>
      <CardContent className="p-0 bg-gray-800 relative h-[400px] flex items-center justify-center">
        <div className="absolute inset-0 z-0 opacity-70 bg-[url('https://maps.googleapis.com/maps/api/staticmap?center=Revere,MA&zoom=13&size=600x400&maptype=roadmap&style=element:geometry%7Ccolor:0x242f3e&style=element:labels.text.fill%7Ccolor:0x746855&style=element:labels.text.stroke%7Ccolor:0x242f3e&style=feature:administrative.locality%7Celement:labels.text.fill%7Ccolor:0xd59563&style=feature:road%7Celement:geometry%7Ccolor:0x38414e&style=feature:road%7Celement:geometry.stroke%7Ccolor:0x212a37&style=feature:road%7Celement:labels.text.fill%7Ccolor:0x9ca5b3&style=feature:water%7Celement:geometry%7Ccolor:0x17263c&key=YOUR_API_KEY')] bg-cover bg-no-repeat bg-center"></div>
        <div className="absolute inset-0 z-10">
          <div className="w-full h-full flex items-center justify-center">
            {schools.map((school, index) => (
              <div
                key={index}
                className={`absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
                  selectedSchool === school ? "scale-125 z-20" : "hover:scale-110"
                }`}
                style={{
                  left: `${20 + (index * 50) % 80}%`,
                  top: `${15 + ((index * 15) % 70)}%`,
                }}
                onClick={() => onSelectSchool(school)}
              >
                <div className="flex flex-col items-center">
                  <MapPin
                    size={24}
                    className={`${
                      selectedSchool === school
                        ? "text-highlight"
                        : "text-white"
                    }`}
                  />
                  {selectedSchool === school && (
                    <div className="absolute top-full mt-1 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                      {school.name}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute bottom-4 left-4 z-20 bg-black/70 text-xs text-gray-300 px-2 py-1 rounded">
          Map data for Revere, MA (Placeholder)
        </div>
      </CardContent>
    </Card>
  );
}
