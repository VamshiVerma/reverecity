
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/formatters";

const CrimeCostBreakdown = () => {
  const crimeCostData = [
    { crime: "Murder", totalCost: 4390000, perResident: 61 },
    { crime: "Rape/Sexual Assault", totalCost: 2090000, perResident: 29 },
    { crime: "Robbery", totalCost: 985779, perResident: 14 },
    { crime: "Assault", totalCost: 4600000, perResident: 64 },
    { crime: "Kidnapping", totalCost: 357612, perResident: 5 },
    { crime: "Vehicle Theft", totalCost: 1710000, perResident: 24 },
    { crime: "Burglary", totalCost: 746694, perResident: 10 },
    { crime: "Theft", totalCost: 2370000, perResident: 33 },
    { crime: "Arson", totalCost: 103329, perResident: 1 },
    { crime: "Vandalism", totalCost: 3690000, perResident: 51 },
    { crime: "Animal Cruelty", totalCost: 13802, perResident: 0 },
    { crime: "Drug Crimes", totalCost: 798041, perResident: 11 },
    { crime: "Identity Theft", totalCost: 185405, perResident: 3 },
    { crime: "Total Cost of Crime", totalCost: 22034373, perResident: 306 },
  ];

  const costBreakdown = [
    { category: "Criminal justice system costs", percentage: 57.7 },
    { category: "Direct costs to victims", percentage: 30.0 },
    { category: "Lost economic contribution from offenders", percentage: 12.3 }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="col-span-1 md:col-span-2">
        <CardHeader>
          <CardTitle>2025 Projected Cost by Type of Crime</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Crime</TableHead>
                  <TableHead>Cost to 02151</TableHead>
                  <TableHead className="text-right">Cost per 02151 Resident</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {crimeCostData.map((item, index) => (
                  <TableRow 
                    key={index} 
                    className={item.crime === "Total Cost of Crime" ? "font-medium bg-muted/50" : ""}
                  >
                    <TableCell>{item.crime}</TableCell>
                    <TableCell>{formatCurrency(item.totalCost)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.perResident)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cost of Crime Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {costBreakdown.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{item.category}</span>
                  <span className="font-medium">{item.percentage}%</span>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary" 
                    style={{ width: `${item.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
            
            <div className="pt-6 space-y-2">
              <p className="text-sm text-muted-foreground">Tangible costs total</p>
              <p className="text-lg font-bold">{formatCurrency(22034373)}</p>
              <p className="text-sm text-muted-foreground mt-2">Intangible costs</p>
              <p className="text-lg font-bold">{formatCurrency(40819970)}</p>
              <p className="text-xs text-muted-foreground">Pain and suffering for victims and families</p>
              <div className="border-t pt-4 mt-4">
                <p className="text-sm text-muted-foreground">Total estimated impact</p>
                <p className="text-xl font-bold">{formatCurrency(62854343)}</p>
                <p className="text-xs text-muted-foreground">({formatCurrency(872)} per resident)</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CrimeCostBreakdown;
