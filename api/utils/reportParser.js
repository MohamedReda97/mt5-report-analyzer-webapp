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

// Function to extract metrics from an HTML file
export function extractMetrics($, metricsDict) {
  const results = {};
  let inputs = {};

  try {
    // Check if there are any tables in the document
    const tables = $("table");
    if (tables.length === 0) {
      console.error('No tables found in the HTML document');
      return { metrics: { error: 'No tables found in the HTML document' }, inputs: {} };
    }

    const table = tables.first();
    const rows = table.find("tr[align='right']");

    if (rows.length === 0) {
      console.error('No rows found in the first table');
      return { metrics: { error: 'No rows found in the first table' }, inputs: {} };
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
          const line = cells.map((_, cell) => $(cell).text().trim()).join(" ");
          inputLines.push(line);
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

// Function to extract deals from an HTML file
export function extractDeals($) {
  try {
    const tables = $("table");

    if (tables.length < 2) {
      console.log('Not enough tables found for deals extraction');
      return [];
    }

    const data = [];

    // Extract data from the second table (index 1)
    $(tables[1])
      .find("tr")
      .each((i, row) => {
        const cols = [];
        $(row)
          .find("td")
          .each((j, col) => {
            cols.push($(col).text().trim());
          });
        if (cols.length > 0) {
          data.push(cols);
        }
      });

    if (data.length === 0) {
      console.log('No data rows found in the deals table');
      return [];
    }

    // Find index of the header row
    const headerIndex = data.findIndex((row) =>
      JSON.stringify(row) === JSON.stringify(["Time", "Deal", "Symbol", "Type", "Direction", "Volume", "Price", "Order", "Commission", "Swap", "Profit", "Balance", "Comment"])
    );

    // Create the DataFrame equivalent using the header row if found
    let df = [];
    if (headerIndex !== -1) {
      const headers = data[headerIndex];
      for (let i = headerIndex + 1; i < data.length; i++) {
        const rowData = {};
        headers.forEach((header, index) => {
          rowData[header] = data[i][index] || null;
        });
        df.push(rowData);
      }
    } else {
      df = data.slice(headerIndex);
    }

    return df;
  } catch (error) {
    console.error('Error extracting deals:', error);
    return [];
  }
}

// Function to parse a report from HTML content
export function parseReportContent(htmlContent, fileName) {
  try {
    // Load the HTML into Cheerio
    const $ = cheerio.load(htmlContent);

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

    // Extract deals
    const deals = extractDeals($);

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

// Calculate max metrics to determine scores
export function calculateMaxMetrics(reports) {
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
