const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const chardet = require("chardet");

// Function to sanitize and clean numeric values
function sanitizeNumber(value) {
	if (typeof value === "string") {
		return parseFloat(value.replace(/\s/g, "").replace(",", "."));
	}
	return value;
}

function maxMetrics(vals) {
	console.dir(vals);
	// Initialize max_counts with each file_name having a count of 0
	const maxCounts = {};
	vals.forEach((item) => {
		maxCounts[item.fileName] = 0;
		item.metrics["Max DD"] *= -1;
		item.metrics["Z-Score"] *= -1;
	});
	// List of metrics to be compared
	const metrics = ["Net Profit", "Max DD", "Profit Factor", "EPO", "Recovery Factor", "Z-Score", "Sharpe Ratio", "Trades", "Win Rate", "LRC", "GHPR", "LP", "LL", "AvgP", "AvgL", "AvgPn", "AvgLn"];

	// Loop over each metric to find the file with the maximum value for that metric
	metrics.forEach((metric) => {
		let maxValue = -Infinity; // Initialize to a very small number
		let maxFile = null;

		// Find the maximum value for the current metric
		vals.forEach((val) => {
			const value = parseFloat(val.metrics[metric]); // Convert value to float for comparison
			if (value > maxValue) {
				maxValue = value;
				maxFile = val.fileName;
			}
		});

		// Increment the count of maxed attributes for the file with the highest metric value
		if (maxFile) {
			maxCounts[maxFile] += 1;
			// Apply double increment for specific metrics as in the Python function
			if (["Net Profit", "Profit Factor", "EPO", "Win Rate"].includes(metric)) {
				maxCounts[maxFile] += 1;
			}
		}
	});

	return maxCounts;
}

function extractNumber(input) {
	const match = input.match(/-?\d+\.\d+/);
	return match ? parseFloat(match[0]) : 0;
}

// Function to parse metrics from an HTML file
function extractMetrics($, metricsDict) {
	const results = {};
	let inputs = {};
	const table = $("table").first(); // Extracting the first table (similar to Python)
	const rows = table.find("tr[align='right']");
	let isInputsSection = false;
	let currentInputName = null;
	let inputLines = [];

	rows.each((_, row) => {
		const cells = $(row).find("td");
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
						metricValue = extractNumber(metricValue);
					}

					if (key === "Max DD" || key === "GHPR") {
						metricValue = sanitizeNumber(metricValue.match(/^[\d\s.,]+/)[0]);
					}

					if (key === "Net Profit") {
						metricValue = sanitizeNumber(metricValue);
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
	});
	return { metrics: results, inputs };
}

// Function to extract deals from an HTML file
function extractDeals($) {
	const tables = $("table");
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

	// Find index of the header row
	const headerIndex = data.findIndex((row) => JSON.stringify(row) === JSON.stringify(["Time", "Deal", "Symbol", "Type", "Direction", "Volume", "Price", "Order", "Commission", "Swap", "Profit", "Balance", "Comment"]));
	// Create the DataFrame equivalent using the header row if found
	let df = [];
	if (headerIndex !== -1) {
		const headers = data[headerIndex];
		for (let i = headerIndex; i < data.length; i++) {
			const rowData = {};
			headers.forEach((header, index) => {
				rowData[header] = data[i][index] || null;
			});
			df.push(rowData);
		}
	} else {
		df = data.slice(headerIndex);
	}

	df;
	return df;
}

// Main function to parse reports
function parseReports(filePaths) {
	let reportData = [];

	filePaths.forEach((filePath) => {
		try {
			// Detect encoding and read file
			const encoding = chardet.detectFileSync(filePath);

			const fileContent = fs.readFileSync(filePath, { encoding });

			// Load the HTML into Cheerio
			const $ = cheerio.load(fileContent);

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
				EPO: "Expected Payoff",
				Trades: "Total Trades",
				//-----------------------------------
				GHPR: "GHPR",
				LRC: "LR Correlation",
				LRE: "LR Standard Error",
				LP: "Largest profit trade",
				LL: "Largest loss trade",
				AvgP: "Average profit trade",
				AvgL: "Average loss trade",
				AvgPn: "Average consecutive wins",
				AvgLn: "Average consecutive losses",
                "Short Trades (won %)": "Short Trades",
                "Long Trades (won %)": "Long Trades",
                "Maximal position holding time": "Maximal position holding time",
                "Average position holding time": "Average position holding time",
			};

			const { metrics, inputs } = extractMetrics($, metricsDict);
			const deals = extractDeals($);

			reportData.push({
				fileName: path.basename(filePath).replace(".html", ""),
				metrics,
				inputs,
				deals,
			});
		} catch (error) {
			console.error(`Error processing file ${filePath}: ${error}`);
		}
	});

	const scores = maxMetrics(reportData);
	

	// Add scores to metrics
	reportData.forEach((report) => {
		report.metrics["Score"] = scores[report.fileName];
	});

	reportData[0].deals;
	return reportData;
}

module.exports = { parseReports, maxMetrics };
