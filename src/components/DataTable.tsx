
import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Column {
  key: string;
  label: string;
}

interface DataTableProps {
  title: string;
  description?: string;
  columns: Column[];
  rowCount?: number;
}

const DataTable = ({ 
  title, 
  description, 
  columns, 
  rowCount = 5 
}: DataTableProps) => {
  const [data, setData] = useState<Record<string, string | number>[]>([]);

  useEffect(() => {
    // Generate placeholder data
    const placeholderData = Array.from({ length: rowCount }, (_, index) => {
      const rowData: Record<string, string | number> = { id: index + 1 };
      
      columns.forEach(column => {
        if (column.key === 'id') return;
        
        if (column.key.includes('date')) {
          // Generate random date within the last year
          const date = new Date();
          date.setDate(date.getDate() - Math.floor(Math.random() * 365));
          rowData[column.key] = date.toLocaleDateString();
        } else if (column.key.includes('name')) {
          const names = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
          rowData[column.key] = names[Math.floor(Math.random() * names.length)];
        } else if (column.key.includes('status')) {
          const statuses = ['Pending', 'Approved', 'Rejected', 'In Progress'];
          rowData[column.key] = statuses[Math.floor(Math.random() * statuses.length)];
        } else if (column.key.includes('type')) {
          const types = ['Residential', 'Commercial', 'Industrial', 'Educational'];
          rowData[column.key] = types[Math.floor(Math.random() * types.length)];
        } else if (column.key.includes('neighborhood')) {
          const neighborhoods = ['Downtown', 'West Side', 'East Side', 'North End', 'Point of Pines'];
          rowData[column.key] = neighborhoods[Math.floor(Math.random() * neighborhoods.length)];
        } else {
          // Generate a random number for other fields
          rowData[column.key] = Math.floor(Math.random() * 1000);
        }
      });
      
      return rowData;
    });
    
    setData(placeholderData);
  }, [columns, rowCount]);

  return (
    <div className="glass-card rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gray-800">
        <h3 className="text-lg font-medium text-light-text">{title}</h3>
        {description && <p className="text-sm text-gray-400 mt-1">{description}</p>}
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key}>{column.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.id as number}>
                {columns.map((column) => (
                  <TableCell key={column.key}>
                    {row[column.key]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default DataTable;
