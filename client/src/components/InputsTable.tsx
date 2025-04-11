import { Card } from "@/components/ui/card";
import { ParsedReport } from "@shared/schema";

interface InputsTableProps {
  reports: ParsedReport[];
}

export default function InputsTable({ reports }: InputsTableProps) {
  if (reports.length === 0) {
    return (
      <Card className="p-4 bg-muted">
        <p className="text-center text-muted-foreground">No input data available</p>
      </Card>
    );
  }
  
  // Get all unique input keys across all reports
  const allInputKeys = new Set<string>();
  reports.forEach(report => {
    if (report.inputs) {
      Object.keys(report.inputs).forEach(key => allInputKeys.add(key));
    }
  });
  
  // Convert to array and sort alphabetically
  const inputKeys = Array.from(allInputKeys).sort();
  
  // Check if there are any inputs to display
  if (inputKeys.length === 0) {
    return (
      <Card className="p-4 bg-muted">
        <p className="text-center text-muted-foreground">No input parameters found in the reports</p>
      </Card>
    );
  }
  
  // Function to determine if a cell should be highlighted
  const shouldHighlight = (key: string, value: any) => {
    // Check if this value is different from others
    const allValues = reports
      .filter(r => r.inputs && r.inputs[key] !== undefined)
      .map(r => r.inputs![key]);
    
    // If there's more than one unique value, highlight differences
    const uniqueValues = new Set(allValues);
    return uniqueValues.size > 1;
  };
  
  return (
    <Card className="p-4 bg-muted overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="bg-secondary text-foreground p-2 text-left border border-border">Parameter</th>
            {reports.map(report => (
              <th key={report.fileName} className="bg-secondary text-foreground p-2 text-left border border-border">
                {report.fileName.replace('.html', '')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {inputKeys.map(key => (
            <tr key={key}>
              <td className="p-2 border border-border">{key}</td>
              {reports.map(report => {
                const value = report.inputs?.[key];
                const isHighlighted = shouldHighlight(key, value);
                
                return (
                  <td 
                    key={`${report.fileName}-${key}`}
                    className={`p-2 border border-border ${isHighlighted ? 'bg-primary/20' : ''}`}
                  >
                    {value !== undefined ? value : '-'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
