import { apiRequest } from "./queryClient";
import { ReportData, ParsedReport } from "@shared/schema";

// Upload a report file to the server
export async function uploadReportFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('report', file);
  
  try {
    const response = await fetch('/api/reports/upload', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.id;
  } catch (error) {
    console.error('Error uploading report:', error);
    throw error;
  }
}

// Generate a comparison report from selected file IDs
export async function generateComparisonReport(fileIds: string[]): Promise<ParsedReport[]> {
  try {
    const response = await apiRequest('POST', '/api/reports/compare', { fileIds });
    return await response.json();
  } catch (error) {
    console.error('Error generating comparison report:', error);
    throw error;
  }
}

// Calculate max metrics to determine scores
export function calculateMaxMetrics(parsedData: ParsedReport[]): Record<string, number> {
  // Initialize max_counts with each file_name having a count of 0
  const maxCounts: Record<string, number> = {};
  
  parsedData.forEach((item) => {
    maxCounts[item.fileName] = 0;
    
    // Adjust metrics for comparison (negative values)
    const metrics = { ...item.metrics };
    if (metrics["Max DD"]) metrics["Max DD"] = parseFloat(metrics["Max DD"].toString()) * -1;
    if (metrics["Z-Score"]) metrics["Z-Score"] = parseFloat(metrics["Z-Score"].toString()) * -1;
  });
  
  // List of metrics to be compared
  const metricsToCompare = [
    "Net Profit", "Max DD", "Profit Factor", "EPO", "Recovery Factor", 
    "Z-Score", "Sharpe Ratio", "Trades", "Win Rate", "LRC", "GHPR", 
    "LP", "LL", "AvgP", "AvgL", "AvgPn", "AvgLn"
  ];
  
  // Find the maximum value for each metric
  metricsToCompare.forEach((metric) => {
    let maxValue = -Infinity;
    let maxFile = null;
    
    parsedData.forEach((report) => {
      if (!report.metrics[metric]) return;
      
      const value = parseFloat(report.metrics[metric].toString());
      if (!isNaN(value) && value > maxValue) {
        maxValue = value;
        maxFile = report.fileName;
      }
    });
    
    // Increment the count for the file with the highest metric value
    if (maxFile) {
      maxCounts[maxFile] += 1;
      // Apply double increment for specific metrics
      if (["Net Profit", "Profit Factor", "EPO", "Win Rate"].includes(metric)) {
        maxCounts[maxFile] += 1;
      }
    }
  });
  
  // Add scores to report metrics
  parsedData.forEach(report => {
    report.metrics["Score"] = maxCounts[report.fileName] || 0;
  });
  
  return maxCounts;
}
