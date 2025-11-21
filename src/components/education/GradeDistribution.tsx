
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { School } from "./SchoolCard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ScrollArea } from "@/components/ui/scroll-area";

interface GradeDistributionProps {
  schools: School[];
}

export default function GradeDistribution({ schools }: GradeDistributionProps) {
  // Calculate the number of schools serving each grade level
  const gradeCounts: Record<string, number> = {};

  schools.forEach(school => {
    const gradeRange = school.grades;
    
    // Parse grade range (e.g., "PK-5", "6-8", "9-12")
    const match = gradeRange.match(/([A-Za-z0-9]+)-([A-Za-z0-9]+)/);
    
    if (match) {
      const start = match[1];
      const end = match[2];
      
      // Convert grade levels to numbers for easy comparison
      const numericStart = start === "PK" ? -1 : start === "KG" ? 0 : parseInt(start);
      const numericEnd = parseInt(end);
      
      // Count each grade level
      if (!isNaN(numericStart) && !isNaN(numericEnd)) {
        for (let i = numericStart; i <= numericEnd; i++) {
          const gradeName = i === -1 ? "PK" : i === 0 ? "K" : i.toString();
          gradeCounts[gradeName] = (gradeCounts[gradeName] || 0) + 1;
        }
      }
    }
  });

  // Create data for chart
  const chartData = Object.entries(gradeCounts)
    .map(([grade, count]) => ({ 
      grade, 
      count,
      color: getGradeColor(grade)
    }))
    .sort((a, b) => {
      if (a.grade === "PK") return -1;
      if (b.grade === "PK") return 1;
      if (a.grade === "K") return -1;
      if (b.grade === "K") return 1;
      return parseInt(a.grade) - parseInt(b.grade);
    });

  function getGradeColor(grade: string): string {
    if (grade === "PK" || grade === "K" || parseInt(grade) <= 5) {
      return "#9b87f5"; // Elementary - purple
    } else if (parseInt(grade) <= 8) {
      return "#1EAEDB"; // Middle - blue
    } else {
      return "#BB86FC"; // High - bright purple
    }
  }

  return (
    <Card className="h-full overflow-hidden bg-card border-gray-800">
      <CardHeader className="pb-2 bg-gradient-to-r from-purple-900/70 to-indigo-900/70">
        <CardTitle className="text-xl font-bold text-white">Grade Level Distribution</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <ScrollArea className="h-[280px]">
          <div className="h-[280px] w-full min-w-[500px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis 
                  dataKey="grade" 
                  stroke="#aaa" 
                  tick={{ fill: '#aaa' }}
                />
                <YAxis 
                  stroke="#aaa" 
                  tick={{ fill: '#aaa' }}
                  label={{ 
                    value: 'Number of Schools', 
                    angle: -90, 
                    position: 'insideLeft', 
                    fill: '#aaa',
                    style: { textAnchor: 'middle' }
                  }}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151',
                    borderRadius: '0.375rem'
                  }}
                  labelStyle={{ color: '#f3f4f6' }}
                  itemStyle={{ color: '#f3f4f6' }}
                  formatter={(value) => [`${value} schools`, 'Schools']}
                  labelFormatter={(grade) => `Grade ${grade}`}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ScrollArea>
        <div className="flex justify-center gap-6 mt-4">
          <div className="flex items-center">
            <div className="h-3 w-3 rounded-full bg-[#9b87f5] mr-2"></div>
            <span className="text-xs text-gray-300">Elementary (PK-5)</span>
          </div>
          <div className="flex items-center">
            <div className="h-3 w-3 rounded-full bg-[#1EAEDB] mr-2"></div>
            <span className="text-xs text-gray-300">Middle (6-8)</span>
          </div>
          <div className="flex items-center">
            <div className="h-3 w-3 rounded-full bg-[#BB86FC] mr-2"></div>
            <span className="text-xs text-gray-300">High (9-12)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
