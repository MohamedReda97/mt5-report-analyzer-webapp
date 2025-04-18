import fs from "fs";
import path from "path";
import * as cheerio from "cheerio";
import * as chardet from "chardet";

// Function to sanitize and clean numeric values
function sanitizeNumber(value: string | number) {
  if (typeof value === "string") {
    return parseFloat(value.replace(/\s/g, "").replace(",", "."));
  }
  return value;
}

function extractNumber(input: string) {
  const match = input.match(/-?\d+\.\d+/);
  return match ? parseFloat(match[0]) : 0;
}

// Parse an HTML report file
export async function parseReport(filePath: string, originalName: string) {
  try {
    console.log(`Starting to parse report: ${originalName} at path: ${filePath}`);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }

    // Get file stats
    const stats = fs.statSync(filePath);
    console.log(`File size: ${stats.size} bytes`);

    if (stats.size === 0) {
      throw new Error(`File is empty: ${filePath}`);
    }

    // Detect encoding and read file with better error handling
    let encoding;
    try {
      encoding = chardet.detectFileSync(filePath);
      console.log(`Detected encoding: ${encoding}`);
    } catch (encodingError) {
      console.error(`Error detecting encoding: ${encodingError.message}`);
      encoding = 'utf8'; // Fallback to UTF-8
    }

    let fileContent;
    try {
      fileContent = fs.readFileSync(filePath, { encoding: encoding as BufferEncoding || 'utf8' });
    } catch (readError) {
      console.error(`Error reading file with encoding ${encoding}: ${readError.message}`);
      // Try with UTF-8 as fallback
      fileContent = fs.readFileSync(filePath, { encoding: 'utf8' });
    }

    // Load the HTML into Cheerio
    const $ = cheerio.load(fileContent);
    console.log(`Successfully loaded HTML content into Cheerio`);

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
      fileName: path.basename(originalName),
      metrics,
      inputs,
      deals,
    };
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    throw error;
  }
}

// Function to extract metrics from an HTML file
export function extractMetrics($: cheerio.CheerioAPI, metricsDict: Record<string, string>) {
  const results: Record<string, any> = {};
  let inputs: Record<string, any> = {};

  try {
    // Check if there are any tables in the document
    const tables = $("table");
    if (tables.length === 0) {
      console.error('No tables found in the HTML document');
      return { metrics: { error: 'No tables found in the HTML document' }, inputs: {} };
    }

    console.log(`Found ${tables.length} tables in the document`);

    const table = tables.first();
    const rows = table.find("tr[align='right']");

    if (rows.length === 0) {
      console.error('No rows found in the first table');
      return { metrics: { error: 'No rows found in the first table' }, inputs: {} };
    }

    console.log(`Found ${rows.length} rows in the first table`);

    let isInputsSection = false;
    let inputLines: string[] = [];

    rows.each((_, row) => {
      try {
        const cells = $(row).find("td");
        if (cells.length === 0) {
          console.log('Row has no cells, skipping');
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
          const line = cells.map((_, cell) => $(cell).text().trim()).get().join(" ");
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
export function extractDeals($: cheerio.CheerioAPI) {
  try {
    const tables = $("table");

    if (tables.length < 2) {
      console.log('Not enough tables found for deals extraction');
      return [];
    }

    const data: string[][] = [];

    // Extract data from the second table (index 1)
    $(tables[1])
      .find("tr")
      .each((i, row) => {
        const cols: string[] = [];
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

    console.log(`Found ${data.length} data rows in the deals table`);

    // Find index of the header row
    const headerIndex = data.findIndex((row) =>
      JSON.stringify(row) === JSON.stringify(["Time", "Deal", "Symbol", "Type", "Direction", "Volume", "Price", "Order", "Commission", "Swap", "Profit", "Balance", "Comment"])
    );

    console.log(`Header row index: ${headerIndex}`);

    // Create the DataFrame equivalent using the header row if found
    let df = [];
    if (headerIndex !== -1) {
      const headers = data[headerIndex];
      for (let i = headerIndex + 1; i < data.length; i++) {
        const rowData: Record<string, any> = {};
        headers.forEach((header, index) => {
          rowData[header] = data[i][index] || null;
        });
        df.push(rowData);
      }
    } else {
      df = data.slice(headerIndex);
    }

    console.log(`Extracted ${df.length} deals`);
    return df;
  } catch (error) {
    console.error('Error extracting deals:', error);
    return [];
  }
}
