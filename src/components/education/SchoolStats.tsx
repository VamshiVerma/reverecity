
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { School } from "./SchoolCard";
import { BookOpen, Users, Calculator, Percent } from "lucide-react";

interface SchoolStatsProps {
  schools: School[];
}

export default function SchoolStats({ schools }: SchoolStatsProps) {
  // Calculate stats
  const totalEnrollment = schools.reduce((sum, school) => sum + school.enrollment, 0);
  
  const avgStudentTeacherRatio = 
    schools.reduce((sum, school) => sum + school.studentTeacherRatio, 0) / schools.length;
  
  const schoolsWithMathData = schools.filter(s => s.mathProficiency !== null);
  const avgMathProficiency = schoolsWithMathData.length > 0 
    ? schoolsWithMathData.reduce((sum, s) => sum + (s.mathProficiency || 0), 0) / schoolsWithMathData.length
    : null;
  
  const schoolsWithReadingData = schools.filter(s => s.readingProficiency !== null);
  const avgReadingProficiency = schoolsWithReadingData.length > 0
    ? schoolsWithReadingData.reduce((sum, s) => sum + (s.readingProficiency || 0), 0) / schoolsWithReadingData.length
    : null;

  // Stats cards data
  const stats = [
    { 
      title: "Total Schools", 
      value: schools.length, 
      icon: BookOpen,
      description: "Public schools in Revere",
      color: "from-violet-500 to-purple-500" 
    },
    { 
      title: "Total Enrollment", 
      value: totalEnrollment.toLocaleString(), 
      icon: Users,
      description: "Students enrolled",
      color: "from-blue-500 to-indigo-500" 
    },
    { 
      title: "Average Student-Teacher Ratio", 
      value: avgStudentTeacherRatio.toFixed(1) + ":1", 
      icon: Calculator,
      description: "Students per teacher",
      color: "from-emerald-500 to-teal-500" 
    },
    { 
      title: "Average Proficiency", 
      value: avgMathProficiency && avgReadingProficiency 
        ? `${((avgMathProficiency + avgReadingProficiency) / 2).toFixed(1)}%` 
        : "N/A", 
      icon: Percent,
      description: "Math & reading combined",
      color: "from-amber-500 to-orange-500" 
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card key={index} className="hover:shadow-lg transition-all duration-300 bg-card border-gray-800">
          <CardHeader className={`pb-2 bg-gradient-to-r ${stat.color}`}>
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-medium text-white">{stat.title}</CardTitle>
              <stat.icon className="h-5 w-5 text-white opacity-80" />
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-white">{stat.value}</div>
            <p className="text-xs text-gray-400 mt-1">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
