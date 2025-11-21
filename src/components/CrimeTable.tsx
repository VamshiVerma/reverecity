
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const CrimeTable = () => {
  const [activeTab, setActiveTab] = useState("violent");

  const violentCrimeData = [
    { type: "Assault", rate: 2.219 },
    { type: "Robbery", rate: 0.4346 },
    { type: "Rape", rate: 0.4784 },
    { type: "Murder", rate: 0.0324 },
    { type: "Total Violent Crime", rate: 3.165, grade: "C+" }
  ];

  const propertyCrimeData = [
    { type: "Theft", rate: 6.353 },
    { type: "Vehicle Theft", rate: 1.528 },
    { type: "Burglary", rate: 1.142 },
    { type: "Arson", rate: 0.0593 },
    { type: "Total Property Crime", rate: 9.082, grade: "B+" }
  ];

  const otherCrimeData = [
    { type: "Kidnapping", rate: 0.0818 },
    { type: "Drug Crimes", rate: 1.496 },
    { type: "Vandalism", rate: 7.160 },
    { type: "Identity Theft", rate: 0.3322 },
    { type: "Animal Cruelty", rate: 0.0259 },
    { type: "Total \"Other\" Rate", rate: 9.096, grade: "C" }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>02151 Crime Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-muted-foreground">
          The tables below show which crimes are used to calculate the Crime Grades. All crime rates are shown as the number of crimes per 1,000 02151 residents in a standard year.
        </p>

        <Tabs defaultValue="violent" className="w-full">
          <TabsList className="grid grid-cols-3 mb-8">
            <TabsTrigger value="violent" onClick={() => setActiveTab("violent")}>
              Violent Crime
            </TabsTrigger>
            <TabsTrigger value="property" onClick={() => setActiveTab("property")}>
              Property Crime
            </TabsTrigger>
            <TabsTrigger value="other" onClick={() => setActiveTab("other")}>
              Other Crime
            </TabsTrigger>
          </TabsList>

          <TabsContent value="violent">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60%]">Crime Type</TableHead>
                    <TableHead>Crime Rate (per 1,000)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {violentCrimeData.map((crime, index) => (
                    <TableRow key={index} className={crime.grade ? "font-medium bg-muted/50" : ""}>
                      <TableCell>{crime.type}</TableCell>
                      <TableCell>
                        {crime.rate.toFixed(4)}
                        {crime.grade && ` (${crime.grade})`}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="property">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60%]">Crime Type</TableHead>
                    <TableHead>Crime Rate (per 1,000)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {propertyCrimeData.map((crime, index) => (
                    <TableRow key={index} className={crime.grade ? "font-medium bg-muted/50" : ""}>
                      <TableCell>{crime.type}</TableCell>
                      <TableCell>
                        {crime.rate.toFixed(4)}
                        {crime.grade && ` (${crime.grade})`}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="other">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60%]">Crime Type</TableHead>
                    <TableHead>Crime Rate (per 1,000)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {otherCrimeData.map((crime, index) => (
                    <TableRow key={index} className={crime.grade ? "font-medium bg-muted/50" : ""}>
                      <TableCell>{crime.type}</TableCell>
                      <TableCell>
                        {crime.rate.toFixed(4)}
                        {crime.grade && ` (${crime.grade})`}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default CrimeTable;
