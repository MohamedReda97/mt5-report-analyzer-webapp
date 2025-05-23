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
    // First, try to extract inputs directly from the HTML
    // This is a more direct approach that doesn't rely on table structure
    const htmlText = $.html();

    // Look for input parameters in the HTML
    const inputRegex = /([A-Za-z0-9_]+)\s*=\s*([^,;\n<>]+)/g;
    let match;
    while ((match = inputRegex.exec(htmlText)) !== null) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (key && value && key.length < 30 && !key.includes('<') && !key.includes('>')) {
        inputs[key] = value;
      }
    }

    // Check if there are any tables in the document
    const tables = $("table");
    if (tables.length === 0) {
      console.error('No tables found in the HTML document');
      return { metrics: { error: 'No tables found in the HTML document' }, inputs };
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

    // Faster approach: Extract metrics directly using text search
    const tableText = $(metricsTable).text();

    // Process metrics dictionary
    Object.entries(metricsDict).forEach(([key, matchPhrase]) => {
      const phraseIndex = tableText.indexOf(matchPhrase);
      if (phraseIndex !== -1) {
        // Find the value after the phrase
        const afterPhrase = tableText.substring(phraseIndex + matchPhrase.length, phraseIndex + matchPhrase.length + 50);
        // Extract the first number or percentage
        const valueMatch = afterPhrase.match(/[-+]?[0-9]*\.?[0-9]+%?/);
        if (valueMatch) {
          results[key] = valueMatch[0];
        }
      }
    });

    // If we found metrics this way, continue
    if (Object.keys(results).length > 0) {
      // Use a more targeted selector for rows only if we need more detailed extraction
      const rows = metricsTable.find("tr");

      // Extract inputs from rows if we haven't found enough
      if (Object.keys(inputs).length < 3) {
        rows.each((_, row) => {
          const rowText = $(row).text();
          if (rowText.includes("=")) {
            const inputMatches = rowText.match(/([A-Za-z0-9_]+)\s*=\s*([^=]+)(?=\s+[A-Za-z0-9_]+=|$)/g);
            if (inputMatches) {
              inputMatches.forEach(match => {
                const parts = match.split('=').map(part => part.trim());
                if (parts.length === 2) {
                  const key = parts[0].trim();
                  const value = parts[1].trim();
                  inputs[key] = value;
                }
              });
            }
          }
        });
      }

      return { metrics: results, inputs };
    }

    // If the fast approach didn't work, fall back to the original method
    const rows = metricsTable.find("tr[align='right']");

    if (rows.length === 0) {
      // Try a more general approach if the specific selector doesn't work
      const allRows = metricsTable.find("tr");
      if (allRows.length === 0) {
        console.error('No rows found in the metrics table');
        return { metrics: { error: 'No rows found in the metrics table' }, inputs };
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
        return { metrics: results, inputs };
      }

      console.error('Could not extract metrics using alternative method');
      return { metrics: { error: 'Could not extract metrics' }, inputs };
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
    const maxContentLength = 2000000; // 2MB limit - reduced for memory constraints
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

    // Pre-process the HTML to make it more efficient to parse
    // Remove comments, scripts, styles, and unnecessary whitespace
    truncatedContent = truncatedContent
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/\s+/g, ' ')
      .replace(/>\s+</g, '><');

    // For very large content, try a more memory-efficient approach first
    if (truncatedContent.length > 1000000) { // 1MB
      // Extract metrics and inputs directly using regex
      const metrics = {};
      const inputs = {};

      // Define the metrics dictionary
      const metricsDict = {
        "Net Profit": "Total Net Profit",
        "Max DD": "Equity Drawdown Maximal",
        "Win Rate": "Profit Trades",
        "Profit Factor": "Profit Factor",
        "Recovery Factor": "Recovery Factor",
        "Sharpe Ratio": "Sharpe Ratio",
        "Z-Score": "Z-Score",
        "EPO": "Expected Payoff",
        "Trades": "Total Trades",
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
        "Long Trades (won %)": "Long Trades"
      };

      // Extract metrics using regex
      Object.entries(metricsDict).forEach(([key, matchPhrase]) => {
        const regex = new RegExp(matchPhrase + '[^\\d-]*([\\d.-]+%?)', 'i');
        const match = truncatedContent.match(regex);
        if (match && match[1]) {
          metrics[key] = match[1].trim();
        }
      });

      // Extract inputs using regex
      const inputRegex = /([A-Za-z0-9_]+)\s*=\s*([^,;\n<>]+)/g;
      let match;
      while ((match = inputRegex.exec(truncatedContent)) !== null) {
        const key = match[1].trim();
        const value = match[2].trim();
        if (key && value && key.length < 30 && !key.includes('<') && !key.includes('>')) {
          inputs[key] = value;
        }
      }

      // If we found enough metrics, return them without using Cheerio
      if (Object.keys(metrics).length >= 5) {
        if (truncationWarning) {
          metrics.warning = truncationWarning;
        }

        return {
          fileName: fileName,
          metrics,
          inputs,
          deals: [] // Skip deals for very large files to save memory
        };
      }
    }

    // If the regex approach didn't work well enough, fall back to Cheerio
    // but with minimal options to save memory
    const $ = cheerio.load(truncatedContent, {
      normalizeWhitespace: true,
      decodeEntities: false, // Save memory
      xmlMode: false,
      lowerCaseTags: true,   // Save memory
      lowerCaseAttributeNames: true // Save memory
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

    // Extract metrics and inputs - use a timeout to prevent hanging
    let extractionResult;
    const extractionPromise = new Promise((resolve) => {
      extractionResult = extractMetrics($, metricsDict);
      resolve();
    });

    // Set a timeout for extraction
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 5000); // 5 second timeout for extraction
    });

    // Wait for extraction or timeout
    await Promise.race([extractionPromise, timeoutPromise]);

    // If extraction didn't complete, use a simpler approach
    if (!extractionResult) {
      extractionResult = {
        metrics: { error: "Extraction timed out, using simplified approach" },
        inputs: {}
      };

      // Try a simplified approach - direct text search
      const htmlText = $.html();
      Object.entries(metricsDict).forEach(([key, matchPhrase]) => {
        const phraseIndex = htmlText.indexOf(matchPhrase);
        if (phraseIndex !== -1) {
          // Find the value after the phrase
          const afterPhrase = htmlText.substring(phraseIndex + matchPhrase.length, phraseIndex + matchPhrase.length + 50);
          // Extract the first number or percentage
          const valueMatch = afterPhrase.match(/[-+]?[0-9]*\.?[0-9]+%?/);
          if (valueMatch) {
            extractionResult.metrics[key] = valueMatch[0];
          }
        }
      });

      // Extract inputs with a simple regex
      const inputMatches = htmlText.match(/([A-Za-z0-9_]+)\s*=\s*([^,;\n<>]+)/g);
      if (inputMatches) {
        inputMatches.forEach(match => {
          const parts = match.split('=').map(part => part.trim());
          if (parts.length === 2) {
            const key = parts[0].trim();
            const value = parts[1].trim();
            if (key && value && key.length < 30 && !key.includes('<') && !key.includes('>')) {
              extractionResult.inputs[key] = value;
            }
          }
        });
      }
    }

    const { metrics, inputs } = extractionResult;

    // Add truncation warning if needed
    if (truncationWarning) {
      metrics.warning = truncationWarning;
    }

    // Extract deals - only if we have valid metrics
    // This saves processing time for invalid files
    let deals = [];
    if (Object.keys(metrics).length > 2) { // More than just error and warning fields
      // Set a timeout for deals extraction
      const dealsPromise = new Promise((resolve) => {
        deals = extractDeals($);
        resolve();
      });

      // Set a timeout for extraction
      const dealsTimeoutPromise = new Promise((resolve) => {
        setTimeout(() => {
          resolve();
        }, 3000); // 3 second timeout for deals extraction
      });

      // Wait for extraction or timeout
      await Promise.race([dealsPromise, dealsTimeoutPromise]);
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

      // Check if the payload is too large
      const totalSize = files.reduce((size, file) => size + (file.content ? file.content.length : 0), 0);
      if (totalSize > 5000000) { // 5MB limit - reduced for memory constraints
        return res.status(413).json({
          message: 'Request payload too large. Try uploading smaller files or fewer files at once.',
          error: 'Payload too large'
        });
      }

      // Set a timeout to ensure the function doesn't run too long
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Processing timed out')), 20000); // 20 second timeout
      });

      // Process one file at a time for better reliability
      const parsedReports = [];

      // Limit to processing at most 3 files at once to save memory
      const maxFiles = Math.min(files.length, 3);

      for (let i = 0; i < maxFiles; i++) {
        const file = files[i];

        try {
          // Free up memory before processing each file
          if (global.gc) {
            global.gc();
          }

          // Parse the report with a timeout
          const parsePromise = new Promise(async (resolve) => {
            try {
              // Clean up the content to save memory
              let cleanedContent = file.content;

              // For large files, remove unnecessary parts before parsing
              if (cleanedContent.length > 500000) {
                cleanedContent = cleanedContent
                  .replace(/<!--[\s\S]*?-->/g, '')
                  .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                  .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
                  .replace(/\s+/g, ' ')
                  .replace(/>\s+</g, '><');
              }

              const report = await parseReportContent(cleanedContent, file.name);
              report.color = getRandomColor();

              // Clean up to save memory
              cleanedContent = null;

              resolve(report);
            } catch (err) {
              resolve({
                fileName: file.name,
                color: getRandomColor(),
                metrics: { error: `Failed to parse: ${err.message}` },
                inputs: {},
                deals: []
              });
            }
          });

          // Set a per-file timeout
          const fileTimeoutPromise = new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                fileName: file.name,
                color: getRandomColor(),
                metrics: { error: 'File processing timed out' },
                inputs: {},
                deals: []
              });
            }, 8000); // 8 second timeout per file
          });

          // Race against timeout for this file
          const report = await Promise.race([parsePromise, fileTimeoutPromise]);
          parsedReports.push(report);

          // If we have more files than we can process, add a message
          if (files.length > maxFiles && i === maxFiles - 1) {
            parsedReports.push({
              fileName: "Note",
              color: "#cccccc",
              metrics: {
                message: `Only processed ${maxFiles} of ${files.length} files to stay within memory limits. Please process remaining files separately.`
              },
              inputs: {},
              deals: []
            });
          }

        } catch (fileError) {
          console.error(`Error parsing file ${file.name}:`, fileError);
          // Add a placeholder for the failed file
          parsedReports.push({
            fileName: file.name,
            color: getRandomColor(),
            metrics: { error: `Failed to parse: ${fileError.message}` },
            inputs: {},
            deals: []
          });
        }
      }

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
