import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ParsedReport } from "@shared/schema";
import { AgGridReact } from "ag-grid-react";
import { ClientSideRowModelModule } from "ag-grid-community";

interface DealsTableProps {
  reports: ParsedReport[];
  tabId: string;
}

export default function DealsTable({ reports, tabId }: DealsTableProps) {
  const [activeReportIndex, setActiveReportIndex] = useState(0);
  
  // Define columns for the grid
  const columnDefs = [
    { field: 'Time', filter: true, sortable: true },
    { field: 'Deal', filter: true, sortable: true },
    { field: 'Symbol', filter: true, sortable: true },
    { field: 'Type', filter: true, sortable: true },
    { field: 'Direction', filter: true, sortable: true },
    { field: 'Volume', filter: true, sortable: true },
    { field: 'Price', filter: true, sortable: true },
    { 
      field: 'Profit', 
      filter: true, 
      sortable: true,
      cellClassRules: {
        'text-red-500': (params: any) => parseFloat(params.value) < 0,
        'text-green-500': (params: any) => parseFloat(params.value) >= 0
      }
    },
    { field: 'Balance', filter: true, sortable: true }
  ];
  
  // Grid default column settings
  const defaultColDef = {
    flex: 1,
    minWidth: 100,
    filter: true,
    resizable: true
  };
  
  // Get current deals data
  const currentDeals = reports.length > 0 && activeReportIndex < reports.length
    ? (reports[activeReportIndex].deals || [])
    : [];
  
  if (reports.length === 0) {
    return (
      <Card className="p-4 bg-muted">
        <p className="text-center text-muted-foreground">No report data available</p>
      </Card>
    );
  }
  
  return (
    <Card className="p-4 bg-muted">
      {/* Report tabs */}
      <div className="flex mb-4 overflow-x-auto">
        {reports.map((report, index) => (
          <Button
            key={report.fileName}
            variant={activeReportIndex === index ? "default" : "outline"}
            className="mr-2 whitespace-nowrap"
            onClick={() => setActiveReportIndex(index)}
          >
            {report.fileName.replace('.html', '')}
          </Button>
        ))}
      </div>
      
      {/* Grid container */}
      <div
        className="ag-theme-alpine-dark w-full h-[500px]"
      >
        <AgGridReact
          rowData={currentDeals}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          pagination={true}
          paginationPageSize={10}
          domLayout={'autoHeight'}
          modules={[ClientSideRowModelModule]}
        />
      </div>
    </Card>
  );
}
