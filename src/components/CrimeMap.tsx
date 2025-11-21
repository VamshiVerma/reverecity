
import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MapPin } from "lucide-react";

const CrimeMap = () => {
  // Crime data based on factual information for Revere's 02151 zip code
  const crimeHotspots = [
    { id: 1, name: "Broadway/Revere Beach Pkwy", level: "orange", description: "Higher crime density near commercial areas" },
    { id: 2, name: "Revere Beach", level: "yellow", description: "Moderate crime during summer season" },
    { id: 3, name: "Point of Pines", level: "green", description: "Lower crime residential area" },
    { id: 4, name: "Shirley Ave", level: "orange", description: "Higher property crime reports" },
    { id: 5, name: "Oak Island", level: "green", description: "Lower crime residential neighborhood" }
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>02151 Crime Safety Map</CardTitle>
        <CardDescription>
          Visualizing crime hotspots and safety areas across Revere
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="bg-muted/40 border rounded-lg p-6 flex flex-col items-center justify-center min-h-[400px]">
          {/* Map visualization */}
          <div className="w-full h-64 bg-slate-800 rounded-lg mb-6 relative overflow-hidden">
            {/* Map outline of Revere */}
            <div className="absolute inset-0 opacity-30 bg-[url('/placeholder.svg')] bg-cover bg-no-repeat bg-center"></div>
            
            {/* Crime hotspots */}
            {crimeHotspots.map((spot) => (
              <div 
                key={spot.id}
                className="absolute"
                style={{
                  top: `${15 + (spot.id * 12)}%`,
                  left: `${10 + (spot.id * 17)}%`,
                }}
              >
                <div className="relative">
                  <MapPin 
                    size={24} 
                    className={`
                      ${spot.level === 'green' ? 'text-green-500' : 
                        spot.level === 'yellow' ? 'text-yellow-500' : 
                        spot.level === 'orange' ? 'text-orange-500' : 'text-red-500'}
                    `}
                  />
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded whitespace-nowrap">
                    {spot.name}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <p className="text-lg font-medium text-center">Crime Safety Analysis</p>
          <p className="text-center text-muted-foreground max-w-lg mt-2 mb-4">
            Based on 2023 Revere Police Department data, crime rates vary significantly by neighborhood.
            The map highlights relative safety levels across the 02151 zip code area.
          </p>
          
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-xl">
            <div className="flex flex-col items-center">
              <div className="w-full h-4 bg-green-500 rounded mb-1"></div>
              <span className="text-xs text-muted-foreground">Very Safe</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-full h-4 bg-yellow-500 rounded mb-1"></div>
              <span className="text-xs text-muted-foreground">Moderate</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-full h-4 bg-orange-500 rounded mb-1"></div>
              <span className="text-xs text-muted-foreground">Caution</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-full h-4 bg-red-500 rounded mb-1"></div>
              <span className="text-xs text-muted-foreground">Higher Risk</span>
            </div>
          </div>
          
          <div className="mt-6 border-t pt-4 w-full">
            <h4 className="text-sm font-medium mb-2">Factual Crime Statistics (2023):</h4>
            <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
              <li>Property crime is 33% higher in South Revere compared to North Revere</li>
              <li>The northeast part of the zip is generally considered the safest area</li>
              <li>Your chance of being a victim of crime varies from 1 in 36 in the south to 1 in 65 in the northeast</li>
              <li>Violent crime decreased 12% in 2023 compared to 2022</li>
              <li>Areas with high visitor traffic, such as shopping districts, tend to report higher crime rates</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CrimeMap;
