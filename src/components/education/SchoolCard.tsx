
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BookOpen, Phone, MapPin, Users, Calculator } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface SchoolCardProps {
  school: School;
}

export interface School {
  name: string;
  address: string;
  phone: string;
  grades: string;
  enrollment: number;
  studentTeacherRatio: number;
  mathProficiency: number | null;
  readingProficiency: number | null;
}

export default function SchoolCard({ school }: SchoolCardProps) {
  return (
    <Card className="h-full overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-[1.01] bg-card border-gray-800">
      <CardHeader className="pb-2 bg-gradient-to-r from-purple-900/70 to-indigo-900/70">
        <CardTitle className="text-xl font-bold text-white">{school.name}</CardTitle>
        <CardDescription className="text-gray-300 flex items-center mt-2">
          <MapPin className="h-4 w-4 mr-1" /> {school.address}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4 pb-3 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-highlight" />
            <span className="text-sm text-gray-200">{school.phone}</span>
          </div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-highlight" />
            <span className="text-sm text-gray-200">Grades {school.grades}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-highlight" />
            <span className="text-sm text-gray-200">{school.enrollment} students</span>
          </div>
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-highlight" />
            <span className="text-sm text-gray-200">{school.studentTeacherRatio}:1 ratio</span>
          </div>
        </div>
        
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-300">Math Proficiency</span>
              <span className={cn(
                "text-sm font-semibold",
                school.mathProficiency ? 
                  school.mathProficiency >= 40 ? "text-green-400" : 
                  school.mathProficiency >= 30 ? "text-yellow-400" : "text-red-400"
                : "text-gray-400"
              )}>
                {school.mathProficiency !== null ? `${school.mathProficiency}%` : "N/A"}
              </span>
            </div>
            <Progress 
              value={school.mathProficiency || 0} 
              max={100}
              className={cn(
                "h-2 bg-gray-700",
                school.mathProficiency ? 
                  school.mathProficiency >= 40 ? "bg-green-900" : 
                  school.mathProficiency >= 30 ? "bg-yellow-900" : "bg-red-900"
                : "bg-gray-800"
              )}
            />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-300">Reading Proficiency</span>
              <span className={cn(
                "text-sm font-semibold",
                school.readingProficiency ? 
                  school.readingProficiency >= 40 ? "text-green-400" : 
                  school.readingProficiency >= 30 ? "text-yellow-400" : "text-red-400"
                : "text-gray-400"
              )}>
                {school.readingProficiency !== null ? `${school.readingProficiency}%` : "N/A"}
              </span>
            </div>
            <Progress 
              value={school.readingProficiency || 0} 
              max={100} 
              className={cn(
                "h-2 bg-gray-700",
                school.readingProficiency ? 
                  school.readingProficiency >= 40 ? "bg-green-900" : 
                  school.readingProficiency >= 30 ? "bg-yellow-900" : "bg-red-900"
                : "bg-gray-800"
              )}
            />
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0 px-6 pb-4">
        <div className="w-full text-xs text-gray-400 text-center">
          {school.mathProficiency === null && school.readingProficiency === null ? 
            "Proficiency data not available" : ""}
        </div>
      </CardFooter>
    </Card>
  );
}
