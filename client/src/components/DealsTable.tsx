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
  const [filteredProfit, setFilteredProfit] = useState(0);
  
  // Define columns for the grid
  const columnDefs = [
    { field: 'Time', filter: true, sortable: true },
    { 
      field: 'Deal', 
      filter: true, 
      sortable: true,
      valueParser: (params: any) => Number(params.newValue),
      comparator: (valueA: number, valueB: number) => valueA - valueB
    },
    { field: 'Symbol', filter: true, sortable: true },
    { 
      field: 'Type', 
      filter: 'agSetColumnFilter',
      sortable: true
    },
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
      <div className="ag-theme-alpine-dark w-full h-[500px] overflow-auto">
        <AgGridReact
          rowData={currentDeals}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          pagination={false}
          domLayout="normal"
          modules={[ClientSideRowModelModule]}
          onFilterChanged={(params) => {
            const filteredRows = params.api.getModel().getRowCount();
            const profitSum = params.api.getModel().rowsToDisplay.reduce((sum, row) => {
              return sum + (parseFloat(row.data.Profit) || 0);
            }, 0);
            setFilteredProfit(profitSum);
          }}
        />
      </div>
      {filteredProfit !== 0 && (
        <div className="mt-2 text-right pr-4">
          Filtered Profit Sum: <span className={filteredProfit >= 0 ? 'text-green-500' : 'text-red-500'}>
            {filteredProfit.toFixed(2)}
          </span>
        </div>
      )}
    </Card>
  );
}
