import { Card } from "@/components/ui/card";
import { ParsedReport } from "@shared/schema";

interface InputsTableProps {
  reports: ParsedReport[];
}

export default function InputsTable({ reports }: InputsTableProps) {
  if (reports.length === 0) {
    return (
      <Card className="p-5 bg-card/80 shadow-lg">
        <p className="text-center text-muted-foreground">No input data available</p>
      </Card>
    );
  }

  // Get all unique input keys across all reports
  const allInputKeys = new Set<string>();
  reports.forEach(report => {
    if (report.inputs) {
      Object.keys(report.inputs).forEach(key => {
        // Filter out invalid keys (HTML tags, very long keys, etc.)
        if (key &&
            typeof key === 'string' &&
            key.length < 30 &&
            !key.includes('<') &&
            !key.includes('>') &&
            !key.includes('script') &&
            !key.includes('function')) {
          allInputKeys.add(key);
        }
      });
    }
  });

  // Convert to array and sort alphabetically
  const inputKeys = Array.from(allInputKeys).sort();

  // Check if there are any inputs to display
  if (inputKeys.length === 0) {
    // Try to extract inputs from the report file names
    const fileNameInputs = new Map<string, string>();

    reports.forEach(report => {
      const fileName = report.fileName;
      // Extract potential parameters from filename (common format: SYMBOL_TIMEFRAME_PARAMETER)
      const parts = fileName.split(/[_\s.]+/);

      if (parts.length >= 2) {
        // First part is often the symbol
        fileNameInputs.set('Symbol', parts[0]);

        // Second part might be timeframe
        if (parts[1].match(/^[0-9]+(m|h|d|M|W)$/)) {
          fileNameInputs.set('Timeframe', parts[1]);
        }
      }
    });

    if (fileNameInputs.size > 0) {
      // Add these inputs to the reports
      reports.forEach(report => {
        if (!report.inputs) {
          report.inputs = {};
        }

        fileNameInputs.forEach((value, key) => {
          if (!report.inputs![key]) {
            report.inputs![key] = value;
          }
        });
      });

      // Update input keys
      fileNameInputs.forEach((_, key) => {
        allInputKeys.add(key);
      });

      // Update inputKeys
      const updatedInputKeys = Array.from(allInputKeys).sort();

      if (updatedInputKeys.length > 0) {
        // If we found inputs, update the inputKeys
        inputKeys.push(...updatedInputKeys.filter(key => !inputKeys.includes(key)));
      } else {
        return (
          <Card className="p-5 bg-card/80 shadow-lg">
            <p className="text-center text-muted-foreground">No input parameters found in the reports</p>
          </Card>
        );
      }
    } else {
      return (
        <Card className="p-5 bg-card/80 shadow-lg">
          <p className="text-center text-muted-foreground">No input parameters found in the reports</p>
        </Card>
      );
    }
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
    <Card className="p-5 bg-card/80 shadow-lg">
      <h3 className="text-lg font-medium mb-4 text-foreground/90">Input Parameters Comparison</h3>
      <div className="overflow-x-auto rounded-md border border-border/50">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="bg-secondary text-foreground p-3 text-left border border-border font-medium sticky left-0 z-10">Parameter</th>
              {reports.map(report => (
                <th key={report.fileName} className="bg-secondary text-foreground p-3 text-left border border-border font-medium">
                  {report.fileName.replace('.html', '')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {inputKeys.map((key, idx) => (
              <tr key={key} className={idx % 2 === 0 ? 'bg-card/50' : 'bg-card/80'}>
                <td className="p-2.5 border border-border/70 font-medium sticky left-0 bg-inherit z-10">{key}</td>
                {reports.map(report => {
                  const value = report.inputs?.[key];
                  const isHighlighted = shouldHighlight(key, value);

                  return (
                    <td
                      key={`${report.fileName}-${key}`}
                      className={`p-2.5 border border-border/70 font-mono text-sm ${isHighlighted ? 'bg-primary/20 font-medium' : ''}`}
                    >
                      {value !== undefined ? value : '-'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
