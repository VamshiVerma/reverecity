
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { School } from "./SchoolCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SchoolsTableProps {
  schools: School[];
  onSelectSchool: (school: School) => void;
}

export default function SchoolsTable({ schools, onSelectSchool }: SchoolsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  
  const filteredSchools = schools.filter(school => 
    school.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    school.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    school.grades.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card className="h-full overflow-hidden bg-card border-gray-800">
      <CardHeader className="pb-2 bg-gradient-to-r from-purple-900/70 to-indigo-900/70">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <CardTitle className="text-xl font-bold text-foreground">Revere Schools Directory</CardTitle>
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search schools..."
              className="pl-8 h-9 bg-card border-gray-700 text-foreground w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px] w-full">
          <Table>
            <TableHeader className="sticky top-0 bg-gray-800">
              <TableRow>
                <TableHead className="text-foreground/80">School Name</TableHead>
                <TableHead className="text-foreground/80">Grades</TableHead>
                <TableHead className="text-foreground/80 hidden sm:table-cell">Enrollment</TableHead>
                <TableHead className="text-foreground/80 hidden md:table-cell">Student-Teacher Ratio</TableHead>
                <TableHead className="text-foreground/80 hidden lg:table-cell">Math</TableHead>
                <TableHead className="text-foreground/80 hidden lg:table-cell">Reading</TableHead>
                <TableHead className="text-foreground/80 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSchools.map((school, i) => (
                <TableRow 
                  key={i} 
                  className="hover:bg-gray-800/50 cursor-pointer"
                  onClick={() => onSelectSchool(school)}
                >
                  <TableCell className="font-medium text-foreground">{school.name}</TableCell>
                  <TableCell className="text-foreground/80">Grades {school.grades}</TableCell>
                  <TableCell className="text-foreground/80 hidden sm:table-cell">{school.enrollment}</TableCell>
                  <TableCell className="text-foreground/80 hidden md:table-cell">{school.studentTeacherRatio}:1</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span className={
                      school.mathProficiency === null ? "text-muted-foreground" :
                      school.mathProficiency >= 40 ? "text-green-400" :
                      school.mathProficiency >= 30 ? "text-yellow-400" : "text-red-400"
                    }>
                      {school.mathProficiency === null ? "N/A" : `${school.mathProficiency}%`}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span className={
                      school.readingProficiency === null ? "text-muted-foreground" :
                      school.readingProficiency >= 40 ? "text-green-400" :
                      school.readingProficiency >= 30 ? "text-yellow-400" : "text-red-400"
                    }>
                      {school.readingProficiency === null ? "N/A" : `${school.readingProficiency}%`}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 border-gray-700 bg-gray-800/50 hover:bg-purple-900/50 text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSchool(school);
                      }}
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredSchools.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No schools match your search criteria
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
