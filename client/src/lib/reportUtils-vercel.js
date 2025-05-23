import { apiRequest } from "./queryClient";
import { ReportData, ParsedReport } from "@shared/schema";

// Upload a report file to the server
export async function uploadReportFile(file) {
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

// Generate a comparison report from selected files with optimizations
export async function generateComparisonReport(selectedFiles) {
  try {
    // Check if we have too many files
    if (selectedFiles.length > 10) {
      throw new Error('Too many files selected. Please select 10 or fewer files for better performance.');
    }

    // Process files in batches if there are many
    const batchSize = 3;
    const results = [];

    // Process files in batches
    for (let i = 0; i < selectedFiles.length; i += batchSize) {
      const batch = selectedFiles.slice(i, i + batchSize);

      // Read files directly in the browser
      const fileContents = await Promise.all(
        batch.map(async (fileObj) => {
          return {
            name: fileObj.name,
            content: await readFileAsText(fileObj.file)
          };
        })
      );

      // Send the file contents to the server for parsing
      const response = await fetch('/api/reports/parse-direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ files: fileContents }),
        credentials: 'include',
      });

      if (!response.ok) {
        // Check for timeout error
        if (response.status === 408) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Processing timed out. Try with fewer or smaller files.');
        }

        const errorText = await response.text();
        console.error('Server response:', response.status, errorText);
        throw new Error(`Failed to parse reports: ${response.status} ${response.statusText}`);
      }

      // Add the results from this batch
      const batchResults = await response.json();
      results.push(...batchResults);
    }

    // Return all results
    return results;
  } catch (error) {
    console.error('Error generating comparison report:', error);
    throw error;
  }
}

// Helper function to read a file as text
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

// Calculate maximum metrics for scoring
export function calculateMaxMetrics(parsedData) {
  const maxCounts = {};

  parsedData.forEach((item) => {
    maxCounts[item.fileName] = 0;

    // Adjust metrics for comparison
    if (item.metrics["Max DD"]) item.metrics["Max DD"] *= -1;
    if (item.metrics["Z-Score"]) item.metrics["Z-Score"] *= -1;
  });

  // List of metrics to be compared
  const metricsToCompare = ["Net Profit", "Max DD", "Profit Factor", "EPO", "Recovery Factor", "Z-Score", "Sharpe Ratio", "Trades", "Win Rate", "LRC", "GHPR", "LP", "LL", "AvgP", "AvgL", "AvgPn", "AvgLn"];

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
