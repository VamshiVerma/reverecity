
import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import SchoolCard, { School } from "@/components/education/SchoolCard";
import SchoolStats from "@/components/education/SchoolStats";
import GradeDistribution from "@/components/education/GradeDistribution";
import SchoolsTable from "@/components/education/SchoolsTable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, GraduationCap, Users, Book, BookOpen, Calculator, Percent } from "lucide-react";

export default function EducationPage() {
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Parse the school data
  const schools: School[] = [
    {
      name: "A.C. Whelan Elementary School",
      address: "107 Newhall Street Revere MA 02151",
      phone: "(781)388-7510",
      grades: "KG-5",
      enrollment: 684,
      studentTeacherRatio: 11.43,
      mathProficiency: null,
      readingProficiency: null,
    },
    {
      name: "Abraham Lincoln",
      address: "68 Tuckerman Street Revere MA 02151",
      phone: "(781)286-8270",
      grades: "PK-5",
      enrollment: 604,
      studentTeacherRatio: 11.54,
      mathProficiency: null,
      readingProficiency: null,
    },
    {
      name: "Beachmont Veterans Memorial School",
      address: "15 Everard Street Revere MA 02151",
      phone: "(781)286-8316",
      grades: "PK-5",
      enrollment: 327,
      studentTeacherRatio: 9.19,
      mathProficiency: 42,
      readingProficiency: 42,
    },
    {
      name: "CityLab Innovation High School",
      address: "15 Everard Street Revere MA 02151",
      phone: "(781)485-2715",
      grades: "9-12",
      enrollment: 109,
      studentTeacherRatio: 7.93,
      mathProficiency: null,
      readingProficiency: null,
    },
    {
      name: "Garfield Elementary School",
      address: "176 Garfield Avenue Revere MA 02151",
      phone: "(781)286-8296",
      grades: "PK-5",
      enrollment: 690,
      studentTeacherRatio: 10.60,
      mathProficiency: 36,
      readingProficiency: 32,
    },
    {
      name: "Garfield Middle School",
      address: "176 Garfield Avenue Revere MA 02151",
      phone: "(781)286-8298",
      grades: "6-8",
      enrollment: 566,
      studentTeacherRatio: 11.79,
      mathProficiency: null,
      readingProficiency: null,
    },
    {
      name: "Paul Revere",
      address: "395 Revere Street Revere MA 02151",
      phone: "(781)286-8278",
      grades: "KG-5",
      enrollment: 467,
      studentTeacherRatio: 10.53,
      mathProficiency: null,
      readingProficiency: null,
    },
    {
      name: "Revere High",
      address: "101 School Street Revere MA 02151",
      phone: "(781)286-8222",
      grades: "9-12",
      enrollment: 2098,
      studentTeacherRatio: 13.42,
      mathProficiency: 39,
      readingProficiency: 50,
    },
    {
      name: "Rumney Marsh Academy",
      address: "140 American Legion Highway Revere MA 02151",
      phone: "(781)388-3500",
      grades: "6-8",
      enrollment: 579,
      studentTeacherRatio: 10.20,
      mathProficiency: null,
      readingProficiency: null,
    },
    {
      name: "Staff Sargent James J. Hill Elementary School",
      address: "51 Park Avenue Revere MA 02151",
      phone: "(781)286-8284",
      grades: "KG-5",
      enrollment: 652,
      studentTeacherRatio: 10.81,
      mathProficiency: null,
      readingProficiency: null,
    },
    {
      name: "Susan B. Anthony Middle School",
      address: "107 Newhall Street Revere MA 02151",
      phone: "(781)388-7520",
      grades: "6-8",
      enrollment: 568,
      studentTeacherRatio: 10.55,
      mathProficiency: 22,
      readingProficiency: 31,
    },
  ];

  const handleSelectSchool = (school: School) => {
    setSelectedSchool(school);
    setIsDetailOpen(true);
  };

  // District level data from the additional information
  const districtData = {
    name: "Revere Public Schools",
    address: "101 School Street, Revere, MA 2151",
    phone: "(781) 286-8226",
    website: "Website",
    totalStudents: 7444,
    totalSchools: 11,
    studentTeacherRatio: "12:1",
    minorityEnrollment: "70%",
    preschools: 3,
    elementarySchools: 6,
    middleSchools: 3,
    highSchools: 2,
    demographics: {
      white: "29.0%",
      black: "3.4%",
      asian: "3.8%",
      hispanic: "61.9%",
      nativeAmerican: "0.3%",
      pacificIslander: "0.0%",
      multiRace: "1.4%",
    },
    genderBreakdown: {
      female: "49%",
      male: "51%",
    },
    teachers: {
      certified: "100.0%",
      counselors: 19,
    },
    testScores: {
      elementary: {
        reading: "30%",
        math: "31%",
      },
      middle: {
        reading: "30%",
        math: "25%",
      },
      high: {
        reading: "50%",
        math: "39%",
      },
      collegeReadiness: "27.1",
    },
    finances: {
      totalRevenue: "$150,133,000",
      revenuePerStudent: "$20,950",
      totalExpenses: "$123,554,000",
      expensesPerStudent: "$16,598",
      revenueSource: {
        state: "60.3%",
        local: "32.0%",
        federal: "7.8%",
      },
      spending: {
        instruction: "$80.7 million",
        supportServices: "$39.3 million",
        other: "$3.6 million",
      },
    },
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6 animate-fade-in">
        {/* Education Overview Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Education in Revere</h1>
          <div className="flex flex-col md:flex-row items-start justify-between mb-6">
            <p className="text-gray-300 max-w-2xl">
              Revere Public Schools serves {districtData.totalStudents.toLocaleString()} students across {districtData.totalSchools} schools, 
              with a {districtData.studentTeacherRatio} student-teacher ratio. The district has a diverse student body with {districtData.minorityEnrollment} minority enrollment.
            </p>
            <div className="mt-4 md:mt-0 flex items-center gap-2 text-sm bg-gray-800/50 px-4 py-2 rounded-lg border border-gray-700">
              <BookOpen className="h-4 w-4 text-highlight" />
              <span className="font-medium text-white">{districtData.name}</span>
              <span className="text-gray-400">|</span>
              <span className="text-gray-300">{districtData.phone}</span>
            </div>
          </div>
          
          {/* Statistics Cards */}
          <SchoolStats schools={schools} />
        </div>
        
        {/* Tabs for Different Views */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full max-w-md mx-auto grid grid-cols-2 mb-4 bg-gray-800/50 border border-gray-700">
            <TabsTrigger value="overview" className="text-gray-300 data-[state=active]:text-highlight">
              Overview
            </TabsTrigger>
            <TabsTrigger value="directory" className="text-gray-300 data-[state=active]:text-highlight">
              Directory
            </TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-4">
            {/* District Overview */}
            <Card className="bg-card border-gray-800">
              <CardHeader className="pb-2 bg-gradient-to-r from-purple-900/70 to-indigo-900/70">
                <CardTitle className="text-xl font-bold text-white">District Overview</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 pb-3 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Schools by Level</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700 text-center">
                        <div className="text-lg font-bold text-white">{districtData.preschools}</div>
                        <div className="text-xs text-gray-400">Preschools</div>
                      </div>
                      <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700 text-center">
                        <div className="text-lg font-bold text-white">{districtData.elementarySchools}</div>
                        <div className="text-xs text-gray-400">Elementary</div>
                      </div>
                      <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700 text-center">
                        <div className="text-lg font-bold text-white">{districtData.middleSchools}</div>
                        <div className="text-xs text-gray-400">Middle</div>
                      </div>
                      <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700 text-center">
                        <div className="text-lg font-bold text-white">{districtData.highSchools}</div>
                        <div className="text-xs text-gray-400">High</div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Student Demographics</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-300">Hispanic/Latino</span>
                        <span className="text-sm font-medium text-white">{districtData.demographics.hispanic}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-300">White</span>
                        <span className="text-sm font-medium text-white">{districtData.demographics.white}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-300">Asian</span>
                        <span className="text-sm font-medium text-white">{districtData.demographics.asian}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-300">Black</span>
                        <span className="text-sm font-medium text-white">{districtData.demographics.black}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-300">Multiracial</span>
                        <span className="text-sm font-medium text-white">{districtData.demographics.multiRace}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Teachers & Staff</h3>
                    <div className="space-y-3">
                      <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-300">Certified Teachers</span>
                          <span className="text-sm font-medium text-highlight">{districtData.teachers.certified}</span>
                        </div>
                      </div>
                      <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-300">Full-time Counselors</span>
                          <span className="text-sm font-medium text-highlight">{districtData.teachers.counselors}</span>
                        </div>
                      </div>
                      <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-300">Student-Teacher Ratio</span>
                          <span className="text-sm font-medium text-highlight">{districtData.studentTeacherRatio}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card className="h-full overflow-hidden bg-card border-gray-800">
                  <CardHeader className="pb-2 bg-gradient-to-r from-purple-900/70 to-indigo-900/70">
                    <CardTitle className="text-xl font-bold text-white">School Types Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex flex-col items-center p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                        <div className="bg-indigo-900/30 p-3 rounded-full mb-3">
                          <Building2 className="h-8 w-8 text-indigo-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white">{schools.filter(s => s.grades.includes('PK') || s.grades.includes('KG') || s.grades.includes('-5')).length}</h3>
                        <p className="text-sm text-gray-400">Elementary Schools</p>
                      </div>
                      <div className="flex flex-col items-center p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                        <div className="bg-blue-900/30 p-3 rounded-full mb-3">
                          <Users className="h-8 w-8 text-blue-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white">{schools.filter(s => s.grades.includes('6-8')).length}</h3>
                        <p className="text-sm text-gray-400">Middle Schools</p>
                      </div>
                      <div className="flex flex-col items-center p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                        <div className="bg-purple-900/30 p-3 rounded-full mb-3">
                          <GraduationCap className="h-8 w-8 text-purple-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white">{schools.filter(s => s.grades.includes('9-12')).length}</h3>
                        <p className="text-sm text-gray-400">High Schools</p>
                      </div>
                    </div>
                    
                    <GradeDistribution schools={schools} />
                  </CardContent>
                </Card>
              </div>
              <div className="lg:col-span-1">
                <Card className="h-full overflow-hidden bg-card border-gray-800">
                  <CardHeader className="pb-2 bg-gradient-to-r from-purple-900/70 to-indigo-900/70">
                    <CardTitle className="text-xl font-bold text-white">Featured Schools</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <ScrollArea className="h-[360px]">
                      <div className="space-y-4">
                        {schools
                          .filter(s => s.mathProficiency !== null || s.readingProficiency !== null)
                          .sort((a, b) => {
                            const aProf = (a.mathProficiency || 0) + (a.readingProficiency || 0);
                            const bProf = (b.mathProficiency || 0) + (b.readingProficiency || 0);
                            return bProf - aProf;
                          })
                          .slice(0, 3)
                          .map((school, idx) => (
                            <div 
                              key={idx} 
                              className="cursor-pointer hover:scale-[1.01] transition-all duration-300"
                              onClick={() => handleSelectSchool(school)}
                            >
                              <SchoolCard school={school} />
                            </div>
                          ))}
                        {schools.filter(s => s.mathProficiency !== null || s.readingProficiency !== null).length === 0 && (
                          <div className="flex flex-col items-center justify-center h-full text-center p-6">
                            <div className="text-4xl text-gray-600 mb-4">📊</div>
                            <h3 className="text-lg font-medium text-gray-300 mb-2">No Proficiency Data</h3>
                            <p className="text-sm text-gray-400">
                              None of the schools have reported proficiency metrics
                            </p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </div>
            
            {/* Test Scores Section */}
            <Card className="h-full overflow-hidden bg-card border-gray-800">
              <CardHeader className="pb-2 bg-gradient-to-r from-purple-900/70 to-indigo-900/70">
                <CardTitle className="text-xl font-bold text-white">District Test Scores</CardTitle>
                <CardDescription className="text-gray-300">
                  Proficiency in reading and mathematics by school level
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-white">Reading Proficiency</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex flex-col p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                        <div className="text-3xl font-bold text-highlight mb-1">{districtData.testScores.elementary.reading}</div>
                        <div className="text-xs text-gray-400">Elementary</div>
                      </div>
                      <div className="flex flex-col p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                        <div className="text-3xl font-bold text-highlight mb-1">{districtData.testScores.middle.reading}</div>
                        <div className="text-xs text-gray-400">Middle</div>
                      </div>
                      <div className="flex flex-col p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                        <div className="text-3xl font-bold text-highlight mb-1">{districtData.testScores.high.reading}</div>
                        <div className="text-xs text-gray-400">High</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-white">Math Proficiency</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex flex-col p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                        <div className="text-3xl font-bold text-highlight mb-1">{districtData.testScores.elementary.math}</div>
                        <div className="text-xs text-gray-400">Elementary</div>
                      </div>
                      <div className="flex flex-col p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                        <div className="text-3xl font-bold text-highlight mb-1">{districtData.testScores.middle.math}</div>
                        <div className="text-xs text-gray-400">Middle</div>
                      </div>
                      <div className="flex flex-col p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                        <div className="text-3xl font-bold text-highlight mb-1">{districtData.testScores.high.math}</div>
                        <div className="text-xs text-gray-400">High</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 pt-6 border-t border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-white">College Readiness Index</h3>
                      <p className="text-sm text-gray-400 mt-1">
                        Based on student performance on AP® exams and tests
                      </p>
                    </div>
                    <div className="text-4xl font-bold text-highlight">{districtData.testScores.collegeReadiness}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Finances Card */}
            <Card className="h-full overflow-hidden bg-card border-gray-800">
              <CardHeader className="pb-2 bg-gradient-to-r from-purple-900/70 to-indigo-900/70">
                <CardTitle className="text-xl font-bold text-white">District Finances</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-white mb-2">Revenue</h3>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Total Revenue:</span>
                      <span className="text-white font-medium">{districtData.finances.totalRevenue}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Per Student:</span>
                      <span className="text-white font-medium">{districtData.finances.revenuePerStudent}</span>
                    </div>
                    
                    <h4 className="text-md font-medium text-white mt-4">Revenue Sources</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-300">State</span>
                        <span className="text-sm font-medium text-white">{districtData.finances.revenueSource.state}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-300">Local</span>
                        <span className="text-sm font-medium text-white">{districtData.finances.revenueSource.local}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-300">Federal</span>
                        <span className="text-sm font-medium text-white">{districtData.finances.revenueSource.federal}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-white mb-2">Expenses</h3>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Total Expenses:</span>
                      <span className="text-white font-medium">{districtData.finances.totalExpenses}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Per Student:</span>
                      <span className="text-white font-medium">{districtData.finances.expensesPerStudent}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-white mb-2">Spending Categories</h3>
                    <div className="space-y-3">
                      <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-300">Instruction</span>
                          <span className="text-sm font-medium text-white">{districtData.finances.spending.instruction}</span>
                        </div>
                      </div>
                      <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-300">Support Services</span>
                          <span className="text-sm font-medium text-white">{districtData.finances.spending.supportServices}</span>
                        </div>
                      </div>
                      <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-300">Other Expenses</span>
                          <span className="text-sm font-medium text-white">{districtData.finances.spending.other}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Directory Tab */}
          <TabsContent value="directory" className="mt-4">
            <SchoolsTable schools={schools} onSelectSchool={handleSelectSchool} />
          </TabsContent>
        </Tabs>
      </div>
      
      {/* School Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-light-text">
              {selectedSchool?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {selectedSchool && <SchoolCard school={selectedSchool} />}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
