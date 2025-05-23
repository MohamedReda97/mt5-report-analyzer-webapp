import * as cheerio from 'cheerio';

// Function to sanitize and clean numeric values
function sanitizeNumber(value) {
  if (typeof value === "string") {
    return parseFloat(value.replace(/\s/g, "").replace(",", "."));
  }
  return value;
}

function extractNumber(input) {
  const match = input.match(/-?\d+\.\d+/);
  return match ? parseFloat(match[0]) : 0;
}

// Function to extract metrics from an HTML file with performance optimizations
function extractMetrics($, metricsDict) {
  const results = {};
  let inputs = {};

  try {
    // Check if there are any tables in the document
    const tables = $("table");
    if (tables.length === 0) {
      console.error('No tables found in the HTML document');
      return { metrics: { error: 'No tables found in the HTML document' }, inputs: {} };
    }

    // Find the metrics table - usually the first table
    let metricsTable = tables.first();

    // If the first table doesn't look like a metrics table, try to find it
    if (!$(metricsTable).text().includes("Total Net Profit") && !$(metricsTable).text().includes("Profit Factor")) {
      for (let i = 0; i < tables.length; i++) {
        const tableText = $(tables[i]).text();
        if (tableText.includes("Total Net Profit") || tableText.includes("Profit Factor")) {
          metricsTable = tables[i];
          break;
        }
      }
    }

    // Use a more targeted selector for rows
    const rows = metricsTable.find("tr[align='right']");

    if (rows.length === 0) {
      // Try a more general approach if the specific selector doesn't work
      const allRows = metricsTable.find("tr");
      if (allRows.length === 0) {
        console.error('No rows found in the metrics table');
        return { metrics: { error: 'No rows found in the metrics table' }, inputs: {} };
      }

      // Process all rows to find metrics
      allRows.each((_, row) => {
        const cells = $(row).find("td");
        if (cells.length >= 2) {
          const firstCell = $(cells[0]).text().trim();
          const secondCell = $(cells[1]).text().trim();

          // Check for metrics in this row
          Object.entries(metricsDict).forEach(([key, matchPhrase]) => {
            if (firstCell.includes(matchPhrase)) {
              results[key] = secondCell;
            }
          });
        }
      });

      // If we found metrics this way, return them
      if (Object.keys(results).length > 0) {
        return { metrics: results, inputs: {} };
      }

      console.error('Could not extract metrics using alternative method');
      return { metrics: { error: 'Could not extract metrics' }, inputs: {} };
    }

    let isInputsSection = false;
    let inputLines = [];

    rows.each((_, row) => {
      try {
        const cells = $(row).find("td");
        if (cells.length === 0) {
          return;
        }

        const firstCellText = $(cells[0]).text().trim();

        if (firstCellText.includes("Inputs:")) {
          isInputsSection = true;
          inputLines = [];
          // Extract the first input from the "Inputs:" row
          if (cells.length >= 2) {
            const firstInputText = $(cells[1]).text().trim();
            const parts = firstInputText.split("=");
            if (parts.length === 2) {
              const key = parts[0].trim();
              const value = parts[1].trim();
              inputs[key] = value;
            }
          }
          return;
        }

        if (isInputsSection && firstCellText.includes("Company:")) {
          isInputsSection = false;
          // Process input lines
          inputs = inputLines.reduce((acc, line) => {
            const parts = line.split("=");
            if (parts.length === 2) {
              const key = parts[0].trim();
              const value = parts[1].trim();
              acc[key] = value;
            }
            return acc;
          }, inputs);
          return; // Stop processing inputs when "Company:" is reached
        }

        if (isInputsSection) {
          // Get all cell text and join with spaces
          const line = cells.map((_, cell) => $(cell).text().trim()).join(" ");

          // Try to extract input parameters directly
          const inputMatches = line.match(/([A-Za-z0-9_]+)\s*=\s*([^=]+)(?=\s+[A-Za-z0-9_]+=|$)/g);
          if (inputMatches) {
            inputMatches.forEach(match => {
              const parts = match.split('=').map(part => part.trim());
              if (parts.length === 2) {
                const key = parts[0].trim();
                const value = parts[1].trim();
                inputs[key] = value;
              }
            });
          } else {
            // If no direct matches, add the whole line for processing later
            inputLines.push(line);
          }
          return; // Skip the rest of the loop for inputs
        }

        cells.each((index, cell) => {
          const cellText = $(cell).text().trim().replace(":", "");

          for (let [key, matchPhrase] of Object.entries(metricsDict)) {
            if (cellText.includes(matchPhrase)) {
              const nextCell = cells[index + 1];
              const bold = $(nextCell).find("b");
              let metricValue = bold.length > 0 ? bold.text().trim() : $(nextCell).text().trim();

              if (key == "Z-Score") {
                metricValue = String(extractNumber(metricValue));
              }

              if (key === "Max DD" || key === "GHPR") {
                const match = metricValue.match(/^[\d\s.,]+/);
                metricValue = match ? String(sanitizeNumber(match[0])) : metricValue;
              }

              if (key === "Net Profit") {
                metricValue = String(sanitizeNumber(metricValue));
              }

              if (key === "Win Rate") {
                const match = metricValue.match(/\(([\d.]+%)\)/);
                metricValue = match ? match[1].replace("%", "") : metricValue;
              }

              if (key === "Short Trades (won %)" || key === "Long Trades (won %)") {
                const parts = metricValue.split(" ");
                const count = parts[0];
                const match = metricValue.match(/\(([\d.]+%)\)/);
                const percentage = match ? match[1].replace("%", "") : "0";
                results[`${key} Count`] = count;
                results[`${key} Percentage`] = percentage;
              } else {
                results[key] = metricValue;
              }
            }
          }
        });
      } catch (cellError) {
        console.error('Error processing row:', cellError);
      }
    });

    return { metrics: results, inputs };
  } catch (error) {
    console.error('Error extracting metrics:', error);
    return { metrics: { error: `Error extracting metrics: ${error.message}` }, inputs: {} };
  }
}

// Function to extract deals from an HTML file with performance optimizations
function extractDeals($) {
  try {
    const tables = $("table");

    if (tables.length < 2) {
      console.log('Not enough tables found for deals extraction');
      return [];
    }

    // Find the deals table - usually the second table
    let dealsTable = tables[1];

    // If the second table doesn't look like a deals table, try to find it by looking for specific headers
    if (!$(dealsTable).find("tr").text().includes("Deal") || !$(dealsTable).find("tr").text().includes("Symbol")) {
      for (let i = 0; i < tables.length; i++) {
        const tableText = $(tables[i]).text();
        if (tableText.includes("Deal") && tableText.includes("Symbol") && tableText.includes("Direction")) {
          dealsTable = tables[i];
          break;
        }
      }
    }

    // Extract header row first to avoid processing all rows if not needed
    const headerRow = $(dealsTable).find("tr").filter((_, row) => {
      const rowText = $(row).text();
      return rowText.includes("Time") && rowText.includes("Deal") && rowText.includes("Symbol") &&
             rowText.includes("Direction") && rowText.includes("Profit");
    }).first();

    if (headerRow.length === 0) {
      console.log('Could not find header row in deals table');
      return [];
    }

    // Extract headers
    const headers = [];
    headerRow.find("td").each((_, cell) => {
      headers.push($(cell).text().trim());
    });

    // Check if we have the expected headers
    if (!headers.includes("Direction") || !headers.includes("Symbol") || !headers.includes("Profit")) {
      console.log('Missing required headers in deals table');
      return [];
    }

    // Process only rows after the header row (more efficient)
    const df = [];
    let foundHeader = false;

    // Use a more efficient approach to extract data
    $(dealsTable).find("tr").each((_, row) => {
      // Skip rows until we find the header
      if (!foundHeader) {
        const rowText = $(row).text();
        if (rowText.includes("Time") && rowText.includes("Deal") && rowText.includes("Symbol") &&
            rowText.includes("Direction") && rowText.includes("Profit")) {
          foundHeader = true;
        }
        return; // Skip this row
      }

      // Process data rows
      const cells = $(row).find("td");
      if (cells.length === headers.length) {
        const rowData = {};
        cells.each((index, cell) => {
          rowData[headers[index]] = $(cell).text().trim();
        });

        // Only include rows with valid Symbol and Direction values
        if (rowData.Symbol && rowData.Symbol.trim() !== '') {
          df.push(rowData);
        }
      }
    });

    return df;
  } catch (error) {
    console.error('Error extracting deals:', error);
    return [];
  }
}

// Function to parse a report from HTML content with optimizations for large files
function parseReportContent(htmlContent, fileName) {
  try {
    // Check if the content is too large and potentially truncate it
    // This helps with memory usage and parsing speed
    const maxContentLength = 5000000; // 5MB limit
    let truncatedContent = htmlContent;
    let truncationWarning = '';

    if (htmlContent.length > maxContentLength) {
      // Find the last complete table before the size limit
      const lastTableEndIndex = htmlContent.lastIndexOf('</table>', maxContentLength);
      if (lastTableEndIndex !== -1) {
        truncatedContent = htmlContent.substring(0, lastTableEndIndex + 8); // Include the closing </table> tag
        truncationWarning = 'Large file detected. Some data may be truncated for performance.';
      }
    }

    // Load the HTML into Cheerio with optimized options
    const $ = cheerio.load(truncatedContent, {
      normalizeWhitespace: true, // Normalize whitespace for better parsing
      decodeEntities: true,      // Decode HTML entities
      xmlMode: false,            // Not XML mode for better HTML parsing
    });

    // Metrics dictionary for matching
    const metricsDict = {
      // metrics to display on pie charts
      "Net Profit": "Total Net Profit",
      "Max DD": "Equity Drawdown Maximal",
      "Win Rate": "Profit Trades",
      "Profit Factor": "Profit Factor",
      "Recovery Factor": "Recovery Factor",
      "Sharpe Ratio": "Sharpe Ratio",
      "Z-Score": "Z-Score",
      "EPO": "Expected Payoff",
      "Trades": "Total Trades",
      //-----------------------------------
      "GHPR": "GHPR",
      "LRC": "LR Correlation",
      "LRE": "LR Standard Error",
      "LP": "Largest profit trade",
      "LL": "Largest loss trade",
      "AvgP": "Average profit trade",
      "AvgL": "Average loss trade",
      "AvgPn": "Average consecutive wins",
      "AvgLn": "Average consecutive losses",
      "Short Trades (won %)": "Short Trades",
      "Long Trades (won %)": "Long Trades",
      "Maximal position holding time": "Maximal position holding time",
      "Average position holding time": "Average position holding time",
    };

    // Extract metrics and inputs
    const { metrics, inputs } = extractMetrics($, metricsDict);

    // Add truncation warning if needed
    if (truncationWarning) {
      metrics.warning = truncationWarning;
    }

    // Extract deals - only if we have valid metrics
    // This saves processing time for invalid files
    let deals = [];
    if (Object.keys(metrics).length > 2) { // More than just error and warning fields
      deals = extractDeals($);
    }

    // Return parsed data
    return {
      fileName: fileName,
      metrics,
      inputs,
      deals,
    };
  } catch (error) {
    console.error(`Error processing report:`, error);
    return {
      fileName: fileName,
      metrics: { error: `Failed to parse: ${error.message}` },
      inputs: {},
      deals: []
    };
  }
}

// Generate a random color
function getRandomColor() {
  // Predefined list of colors that work well with dark theme
  const colors = [
    "#4287f5", // blue
    "#f54242", // red
    "#42f5a7", // green
    "#f542f2", // pink
    "#f5d442", // yellow
    "#42f5f5", // cyan
    "#f59642", // orange
    "#a742f5", // purple
    "#5af542", // lime
    "#f54775", // rose
    "#42c5f5", // sky blue
    "#f5a142", // amber
    "#4842f5", // indigo
    "#42f56c", // emerald
    "#f542a1", // fuchsia
  ];

  return colors[Math.floor(Math.random() * colors.length)];
}

// Calculate max metrics to determine scores
function calculateMaxMetrics(reports) {
  const maxCounts = {};

  reports.forEach((item) => {
    maxCounts[item.fileName] = 0;

    // Adjust metrics for comparison
    if (item.metrics["Max DD"]) item.metrics["Max DD"] *= -1;
    if (item.metrics["Z-Score"]) item.metrics["Z-Score"] *= -1;
  });

  // List of metrics to be compared
  const metrics = ["Net Profit", "Max DD", "Profit Factor", "EPO", "Recovery Factor", "Z-Score", "Sharpe Ratio", "Trades", "Win Rate", "LRC", "GHPR", "LP", "LL", "AvgP", "AvgL", "AvgPn", "AvgLn"];

  // Find the maximum value for each metric
  metrics.forEach((metric) => {
    let maxValue = -Infinity;
    let maxFile = null;

    reports.forEach((report) => {
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
  reports.forEach(report => {
    report.metrics["Score"] = maxCounts[report.fileName] || 0;
  });

  return reports;
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    try {
      // Get the raw HTML content from the request body
      const { files } = req.body;

      if (!files || files.length === 0) {
        return res.status(400).json({ message: 'No files provided' });
      }

      // Set a timeout to ensure the function doesn't run too long
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Processing timed out')), 50000); // 50 second timeout
      });

      // Parse files in parallel for better performance
      const parsePromise = Promise.all(
        files.map(async (file) => {
          try {
            // Parse the report
            const report = parseReportContent(file.content, file.name);

            // Add a random color
            report.color = getRandomColor();

            return report;
          } catch (fileError) {
            console.error(`Error parsing file ${file.name}:`, fileError);
            // Return a placeholder for the failed file
            return {
              fileName: file.name,
              color: getRandomColor(),
              metrics: { error: `Failed to parse: ${fileError.message}` },
              inputs: {},
              deals: []
            };
          }
        })
      );

      // Race against timeout
      const parsedReports = await Promise.race([parsePromise, timeoutPromise]);

      if (parsedReports.length === 0) {
        throw new Error('All files failed to parse');
      }

      // Calculate scores
      const reportsWithScores = calculateMaxMetrics(parsedReports);

      res.status(200).json(reportsWithScores);
    } catch (error) {
      console.error('Error parsing reports:', error);

      // Provide a more helpful error message based on the error type
      if (error.message === 'Processing timed out') {
        res.status(408).json({
          message: 'Processing timed out. Try uploading fewer or smaller files.',
          error: error.message
        });
      } else {
        res.status(500).json({
          message: 'Failed to parse reports. Please check file format and try again.',
          error: error.message
        });
      }
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
