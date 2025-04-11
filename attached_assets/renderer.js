const { ipcRenderer } = require("electron");
const fs = require("fs");
const path = require("path");
const { parseReports, maxMetrics } = require("./reportHandler");
const { log } = require("console");
// Import ag-grid
const { Grid } = require("ag-grid-community");

// Define paths for ratings and generated reports
const GENERATED_REPORTS_FOLDER = path.join(__dirname, "..", "generated_reports");
const MT5_REPORTS_PATH = "C:/Users/Administrator/Music/Mt5_Reports";
const RATINGS_FILE = path.join(GENERATED_REPORTS_FOLDER, "ratings.json");

// Load ratings from the ratings.json file
function loadRatings() {
	if (fs.existsSync(RATINGS_FILE)) {
		const ratingsData = JSON.parse(fs.readFileSync(RATINGS_FILE, "utf-8"));
		return ratingsData;
	}
	return {};
}

// Fetch available files for selection
function fetchReportFiles() {
	const fileList = document.getElementById("file-list");

	// Clear the file list before adding new ones
	fileList.innerHTML = "";

	// Read the directory containing report files
	fs.readdir(MT5_REPORTS_PATH, (err, files) => {
		if (err) {
			console.error("Error reading reports folder:", err);
			alert("Error loading report files. Please try again.");
			return;
		}

		// Filter HTML files and create checkboxes for each file
		files
			.filter((file) => file.endsWith(".html"))
			.forEach((file) => {
				const fileItem = document.createElement("div");
				fileItem.classList.add("file-item");

				const checkbox = document.createElement("input");
				checkbox.type = "checkbox";
				checkbox.id = file;
				checkbox.value = path.join(MT5_REPORTS_PATH, file);

				fileItem.appendChild(checkbox);

				const label = document.createElement("label");
				label.htmlFor = file;
				label.textContent = path.basename(file, ".html");

				fileItem.appendChild(label);
				fileList.appendChild(fileItem);
			});
	});
}

// Handle report generation
document.getElementById("generate-btn").addEventListener("click", () => {
	// Collect selected files
	const selectedFiles = [];
	document.querySelectorAll("input[type=checkbox]:checked").forEach((checkbox) => {
		selectedFiles.push(checkbox.value);
	});

	// Ensure at least one file is selected
	if (selectedFiles.length === 0) {
		alert("Please select at least one report.");
		return;
	}

	// Use the report handler to parse the selected files
	const parsedData = parseReports(selectedFiles);
	const maxCounts = maxMetrics(parsedData);

	// Generate a unique name for the new tab based on selected files
	const tabName = selectedFiles.map((file) => path.basename(file, ".html")).join(" | ");
	const tabId = `tab_${new Date().getTime()}`; // Unique tab ID to avoid conflicts
	// Assign consistent colors to parsedData before creating the tab
	parsedData.forEach((source) => {
		source.color = getRandomColor();
	});
	// Create and display the new tab in the navigation panel
	createGeneratedReportTab(tabId, tabName, parsedData, maxCounts);
});

// Function to create a new tab for the generated report
function createGeneratedReportTab(tabId, tabName, parsedData, maxCounts) {
	// Create tab button with close functionality
	const newTabButton = document.createElement("button");
	newTabButton.className = "tab";
	newTabButton.setAttribute("data-tab-id", tabId);
	newTabButton.innerHTML = `${tabName}<span class="close-tab-btn">&times;</span>`;

	// Add click handler for the tab
	newTabButton.addEventListener("click", function (event) {
		if (!event.target.matches(".close-tab-btn")) {
			openTab(event, tabId);
		}
	});

	// Add click handler for close button
	newTabButton.querySelector(".close-tab-btn").addEventListener("click", (event) => {
		event.stopPropagation();
		closeTab(tabId);
	});

	// Add tab to navigation
	document.getElementById("tab-navigation").appendChild(newTabButton);

	// Create content container
	const newTabContent = document.createElement("div");
	newTabContent.id = tabId;
	newTabContent.className = "tab-content";

	// Generate content
	generateReportContent(newTabContent, parsedData, maxCounts);

	// Add to tab content container
	document.getElementById("tab-content").appendChild(newTabContent);

	// Activate the new tab
	openTab(null, tabId);
}

// Function to close a tab and remove its content
function closeTab(tabId) {
	// Remove the tab button from navigation panel
	const tabButton = document.querySelector(`button[data-tab-id="${tabId}"]`);
	if (tabButton) {
		tabButton.remove();
	}

	// Remove the tab content
	const tabContent = document.getElementById(tabId);
	if (tabContent) {
		tabContent.remove();
	}
}

// Utility function to open a specific tab
function openTab(evt, tabId) {
	const allTabContent = document.getElementsByClassName("tab-content");
	Array.from(allTabContent).forEach((content) => {
		content.style.display = "none";
	});

	const allTabs = document.getElementsByClassName("tab");
	Array.from(allTabs).forEach((tab) => {
		tab.classList.remove("active");
	});

	const targetContent = document.getElementById(tabId);
	if (targetContent) {
		targetContent.style.display = "block";
	}

	if (evt) {
		evt.currentTarget.classList.add("active");
	} else {
		document.querySelector(`[data-tab-id="${tabId}"]`).classList.add("active");
	}
}

// Function to generate the content for the new report tab
function generateReportContent(tabContent, parsedData, maxCounts) {
	// Metrics Summary Section
	const metricsSummaryHeader = document.createElement("h2");
	metricsSummaryHeader.textContent = "Metrics Summary";
	metricsSummaryHeader.onclick = () => {
		metricsSection.classList.toggle("active");
	};

	const metricsSection = document.createElement("div");
	metricsSection.className = "metrics-section collapsible";

	// Add legend section
	const legendSection = document.createElement("div");
	legendSection.className = "legend-section";
	const legendState = {}; // Track visibility of each source
	parsedData.forEach((source) => {
		const legendItem = document.createElement("div");
		legendItem.className = "legend-item";
			legendItem.setAttribute('data-source', source.fileName); // Add data attribute

		const legendColor = document.createElement("div");
			legendColor.className = "legend-color";
			legendColor.style.backgroundColor = source.color;

		const legendLabel = document.createElement("span");
			legendLabel.textContent = path.basename(source.fileName, ".html");

		legendItem.appendChild(legendColor);
		legendItem.appendChild(legendLabel);
		legendSection.appendChild(legendItem);

		legendState[source.fileName] = true; // Initially all sources are visible

		legendItem.addEventListener('click', () => {
			legendState[source.fileName] = !legendState[source.fileName];
			updateMetrics(tabContent, parsedData, legendState);
		});
	});
	metricsSection.appendChild(legendSection);

	// Create grid for metrics
	const grid = document.createElement("div");
	grid.className = "grid";

	// Create pie charts for Metrics Summary
	const metricsToPlot = ["Net Profit", "Max DD", "Profit Factor", "EPO", "Recovery Factor", "Sharpe Ratio", "Trades", "Win Rate", "Z-Score", "AvgP", "AvgL", "Short Trades (won %) Count", "Short Trades (won %) Percentage", "Long Trades (won %) Count", "Long Trades (won %) Percentage", "Maximal position holding time", "Average position holding time", "Score"];
	metricsToPlot.forEach((metricKey) => {
		if (metricKey.includes("Short Trades (won %)")) {
			const metricCard = document.createElement("div");
			metricCard.className = "metric-card";
			const metricTitle = document.createElement("h3");
			if (metricKey.includes("Count")) {
				metricTitle.textContent = "Short Trades";
			} else {
				metricTitle.textContent = "Short Profit";
			}
			const chartCanvas = document.createElement("canvas");
			chartCanvas.id = `${metricKey}Chart_${tabContent.id}`;
			metricCard.appendChild(metricTitle);
			metricCard.appendChild(chartCanvas);
			grid.appendChild(metricCard);
			const filteredData = parsedData.filter(source => legendState[source.fileName]);
			const datasets = filteredData.map(source => ({
				label: metricKey,
				value: source.metrics[metricKey],
				backgroundColor: source.color,
			}));
			createPieChart(chartCanvas, datasets);
		} else if (metricKey.includes("Long Trades (won %)")) {
			const metricCard = document.createElement("div");
			metricCard.className = "metric-card";
			const metricTitle = document.createElement("h3");
			if (metricKey.includes("Count")) {
				metricTitle.textContent = "Long Trades";
			} else {
				metricTitle.textContent = "Long Profit";
			}
			const chartCanvas = document.createElement("canvas");
			chartCanvas.id = `${metricKey}Chart_${tabContent.id}`;
			metricCard.appendChild(metricTitle);
			metricCard.appendChild(chartCanvas);
			grid.appendChild(metricCard);
			const filteredData = parsedData.filter(source => legendState[source.fileName]);
			const datasets = filteredData.map(source => ({
				label: metricKey,
				value: source.metrics[metricKey],
				backgroundColor: source.color,
			}));
			createPieChart(chartCanvas, datasets);
		} else if (metricKey === "Maximal position holding time") {
			const metricCard = document.createElement("div");
			metricCard.className = "metric-card";
			const metricTitle = document.createElement("h3");
			metricTitle.textContent = "Max hold time";
			const chartCanvas = document.createElement("canvas");
			chartCanvas.id = `${metricKey}Chart_${tabContent.id}`;
			metricCard.appendChild(metricTitle);
			metricCard.appendChild(chartCanvas);
			grid.appendChild(metricCard);
			const filteredData = parsedData.filter(source => legendState[source.fileName]);
			const datasets = filteredData.map(source => ({
				label: metricKey,
				value: source.metrics[metricKey],
				backgroundColor: source.color,
			}));
			createPieChart(chartCanvas, datasets);
		} else if (metricKey === "Average position holding time") {
			const metricCard = document.createElement("div");
			metricCard.className = "metric-card";
			const metricTitle = document.createElement("h3");
			metricTitle.textContent = "Avg hold time";
			const chartCanvas = document.createElement("canvas");
			chartCanvas.id = `${metricKey}Chart_${tabContent.id}`;
			metricCard.appendChild(metricTitle);
			metricCard.appendChild(chartCanvas);
			grid.appendChild(metricCard);
			const filteredData = parsedData.filter(source => legendState[source.fileName]);
			const datasets = filteredData.map(source => ({
				label: metricKey,
				value: source.metrics[metricKey],
				backgroundColor: source.color,
			}));
			createPieChart(chartCanvas, datasets);
		} else if (metricKey === "AvgP") {
			const metricCard = document.createElement("div");
			metricCard.className = "metric-card";
			const metricTitle = document.createElement("h3");
			metricTitle.textContent = "Avg Profit";
			const chartCanvas = document.createElement("canvas");
			chartCanvas.id = `${metricKey}Chart_${tabContent.id}`;
			metricCard.appendChild(metricTitle);
			metricCard.appendChild(chartCanvas);
			grid.appendChild(metricCard);
			const filteredData = parsedData.filter(source => legendState[source.fileName]);
			const datasets = filteredData.map(source => ({
				label: metricKey,
				value: source.metrics[metricKey],
				backgroundColor: source.color,
			}));
			createPieChart(chartCanvas, datasets);
		} else if (metricKey === "AvgL") {
			const metricCard = document.createElement("div");
			metricCard.className = "metric-card";
			const metricTitle = document.createElement("h3");
			metricTitle.textContent = "Avg Loss";
			const chartCanvas = document.createElement("canvas");
			chartCanvas.id = `${metricKey}Chart_${tabContent.id}`;
			metricCard.appendChild(metricTitle);
			metricCard.appendChild(chartCanvas);
			grid.appendChild(metricCard);
			const filteredData = parsedData.filter(source => legendState[source.fileName]);
			const datasets = filteredData.map(source => ({
				label: metricKey,
				value: source.metrics[metricKey],
				backgroundColor: source.color,
			}));
			createPieChart(chartCanvas, datasets);
		} else {
			const metricCard = document.createElement("div");
			metricCard.className = "metric-card";
			const metricTitle = document.createElement("h3");
			metricTitle.textContent = metricKey;
			const chartCanvas = document.createElement("canvas");
			chartCanvas.id = `${metricKey}Chart_${tabContent.id}`;
			metricCard.appendChild(metricTitle);
			metricCard.appendChild(chartCanvas);
			grid.appendChild(metricCard);
			const filteredData = parsedData.filter(source => legendState[source.fileName]);
			const datasets = filteredData.map(source => ({
				label: metricKey,
				value: source.metrics[metricKey],
				backgroundColor: source.color,
			}));
			createPieChart(chartCanvas, datasets);
		}
	});

	// Add Balance Plot Section
	const balancePlotHeader = document.createElement("h2");
	balancePlotHeader.textContent = "Balance Chart";
	balancePlotHeader.onclick = () => {
		balanceSection.classList.toggle("active");
	};

	const balanceSection = document.createElement("div");
	balanceSection.className = "chart-container balance-chart-card collapsible";

	const balanceCanvas = document.createElement("canvas");
	balanceCanvas.id = `balanceChart_${tabContent.id}`;
	balanceSection.appendChild(balanceCanvas);

	// Create balance chart
	new Chart(balanceCanvas, {
		type: "line",
		data: {
			datasets: parsedData.map((source) => ({
				label: source.fileName,
				data: source.deals.slice(1).map((deal) => ({
					x: parseInt(deal.Deal),
					y: typeof deal.Balance === "string" ? parseFloat(deal.Balance.replace(/\s/g, "")) : parseFloat(deal.Balance),
				})),
				borderColor: source.color,
				backgroundColor: "rgba(0,0,0,0)",
				borderWidth: 2,
				tension: 0.4,
			})),
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			scales: {
				x: {
					type: "linear",
					title: {
						display: false,
						text: "Deal Number",
					},
					grid: {
						color: "rgba(255, 255, 255, 0.1)",
					},
				},
				y: {
					title: {
						display: false,
						text: "Balance",
					},
					grid: {
						color: "rgba(255, 255, 255, 0.1)",
					},
				},
			},
			plugins: {
				tooltip: {
					mode: "index",
					intersect: false,
				},
				zoom: {
					pan: {
						enabled: true,
						mode: "x",
					},
					zoom: {
						wheel: {
							enabled: true,
						},
						pinch: {
							enabled: true,
						},
						mode: "x",
					},
				},
			},
		},
	});

	metricsSection.appendChild(grid);
	tabContent.appendChild(metricsSummaryHeader);
	tabContent.appendChild(metricsSection);

	tabContent.appendChild(balancePlotHeader);
	tabContent.appendChild(balanceSection);

    // Add Inputs Table Section
    createInputsTableSection(tabContent, parsedData);

	// Add Deals Table Section
	parsedData.forEach((source) => {
		createDealsTableSection(tabContent, source);
	});
}

function createInputsTableSection(tabContent, parsedData) {
    const inputsTableSectionHeader = document.createElement("h2");
    inputsTableSectionHeader.textContent = "Inputs Comparison";
    inputsTableSectionHeader.onclick = () => {
        inputsTableSection.classList.toggle("active");
    };

    const inputsTableSection = document.createElement("div");
    inputsTableSection.className = "inputs-table-section collapsible";

    const table = document.createElement("table");
    table.className = "inputs-table";
    const headerRow = document.createElement("tr");
    const headerCell = document.createElement("th");
    headerCell.textContent = "Input";
    headerRow.appendChild(headerCell);

    parsedData.forEach(source => {
        const headerCell = document.createElement("th");
        headerCell.textContent = path.basename(source.fileName, ".html");
        headerRow.appendChild(headerCell);
    });
    table.appendChild(headerRow);

    // Get all unique input keys
    const allInputKeys = new Set();
    parsedData.forEach(source => {
        Object.keys(source.inputs).forEach(key => allInputKeys.add(key));
    });

    allInputKeys.forEach(inputKey => {
        const dataRow = document.createElement("tr");
        const inputNameCell = document.createElement("td");
        inputNameCell.textContent = inputKey;
        dataRow.appendChild(inputNameCell);

        // Get the first value to compare with the rest
        let firstValue = null;
        parsedData.forEach((source, index) => {
            const inputValue = source.inputs[inputKey] || "";
            const inputCell = document.createElement("td");
            inputCell.textContent = inputValue;
            if (index === 0) {
                firstValue = inputValue;
            } else if (inputValue !== firstValue) {
                inputCell.classList.add("highlight-difference");
            }
            dataRow.appendChild(inputCell);
        });
        table.appendChild(dataRow);
    });

    inputsTableSection.appendChild(table);
    tabContent.appendChild(inputsTableSectionHeader);
    tabContent.appendChild(inputsTableSection);
}

function createDealsTableSection(tabContent, source) {
	const dealsTableSectionHeader = document.createElement("h2");
	dealsTableSectionHeader.textContent = `${path.basename(source.fileName, ".html")} Deals`;
	dealsTableSectionHeader.onclick = () => {
		dealsTableSection.classList.toggle("active");
	};

	const dealsTableSection = document.createElement("div");
	dealsTableSection.className = "deals-table-section collapsible";

    const tableContainer = document.createElement("div");
    tableContainer.className = "ag-theme-alpine-dark";
    dealsTableSection.appendChild(tableContainer);

    const columnDefs = Object.keys(source.deals[0] || {})
        .filter(key => !["Direction", "Order", "Commission", "Swap"].includes(key))
        .map(key => {
            const colDef = {
                headerName: key,
                field: key,
                sortable: true,
                filter: true,
                resizable: true,
                autoSize: true, // Enable auto-size for columns
                cellClass: 'no-text-selection' // Apply the class to disable text selection
            };
            if (key === "Profit") {
                colDef.cellRenderer = (params) => {
                    const value = parseFloat(params.value);
                    if (isNaN(value)) {
                        return params.value;
                    }
                    const color = value >= 0 ? 'green' : 'red';
                    return `<span style="color: ${color};">${params.value}</span>`;
                };
                colDef.filter = 'agNumberColumnFilter'; // Enable number filter for profit
            }
            return colDef;
        });

    const gridOptions = {
        columnDefs: columnDefs,
        rowData: source.deals.filter(deal => deal.Direction === "out"),
        defaultColDef: {
            flex: 1,
            minWidth: 100,
            filter: true,
        },
        enableRangeSelection: true,
        enableCellTextSelection: true,
        suppressContextMenu: true,
        rowSelection: 'multiple', // Enable row selection
        onSelectionChanged: (event) => {
            updateSelectionSummary(event, dealsTableSection);
        },
    };

    new Grid(tableContainer, gridOptions);

    // Create summary container
    const summaryContainer = document.createElement('div');
    summaryContainer.className = 'selection-summary';
    dealsTableSection.appendChild(summaryContainer);

	tabContent.appendChild(dealsTableSectionHeader);
	tabContent.appendChild(dealsTableSection);
}

function updateSelectionSummary(event, dealsTableSection) {
    const selectedRows = event.api.getSelectedRows();
    let totalProfit = 0;
    selectedRows.forEach(row => {
        const profit = parseFloat(row.Profit);
        if (!isNaN(profit)) {
            totalProfit += profit;
        }
    });

    const summaryContainer = dealsTableSection.querySelector('.selection-summary');
    summaryContainer.innerHTML = `
        Selected Rows: ${selectedRows.length} | Total Profit: ${totalProfit.toFixed(2)}
    `;
}

// Utility function to create a pie chart
function createPieChart(ctx, datasets) {
	new Chart(ctx, {
		type: "bar",
		data: {
			labels: datasets.map((d) => ''),
			datasets: [
				{
					data: datasets.map((d) => {
						if (typeof d.value === 'string' && (d.label.includes("Maximal position holding time") || d.label.includes("Average position holding time"))) {
							const [hours, minutes, seconds] = d.value.split(':').map(Number);
							return hours + minutes / 60 + seconds / 3600;
						}
						return d.value;
					}),
					backgroundColor: datasets.map((d) => d.backgroundColor),
				},
			],
		},
		options: {
			indexAxis: 'y',
			plugins: {
				tooltip: {
					callbacks: {
						label: (tooltipItem) => {
							const value = datasets[tooltipItem.dataIndex].value;
							if (typeof value === 'string' && (datasets[tooltipItem.dataIndex].label.includes("Maximal position holding time") || datasets[tooltipItem.dataIndex].label.includes("Average position holding time"))) {
								return value;
							}
							return tooltipItem.raw;
						},
					},
				},
				datalabels: {
					display: 'auto',
					color: "#fff",
					formatter: (value) => {
						if (typeof value === 'number' && (datasets[0].label.includes("Maximal position holding time") || datasets[0].label.includes("Average position holding time"))) {
							const hours = Math.floor(value);
							const minutes = Math.floor((value - hours) * 60);
							const seconds = Math.floor(((value - hours) * 60 - minutes) * 60);
							return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
						}
						return value;
					},
					font: { weight: "bold", size: 14 },
					anchor: 'end',
					align: 'right',
					offset: 5,
				},
				legend: {
					display: false,
				},
			},
		},
	});
}

// Utility function to generate a random color for the chart
const getRandomColor = (() => {
	const colors = ["#FF2E63", "#0D92F4", "#bc5090", "#4caf50", "#257180", "#FD8B51"];

	let colorIndex = 0;

	return () => {
		const color = colors[colorIndex];
		// (`Assigning color ${color} at index ${colorIndex}`);
		colorIndex = (colorIndex + 1) % colors.length;
		return color;
	};
})();

function updateMetrics(tabContent, parsedData, legendState) {
	const grid = tabContent.querySelector('.grid');
	grid.innerHTML = ''; // Clear existing charts

	const metricsToPlot = ["Net Profit", "Max DD", "Profit Factor", "EPO", "Recovery Factor", "Sharpe Ratio", "Trades", "Win Rate", "Z-Score", "AvgP", "AvgL", "Short Trades (won %) Count", "Short Trades (won %) Percentage", "Long Trades (won %) Count", "Long Trades (won %) Percentage", "Maximal position holding time", "Average position holding time", "Score"];
	metricsToPlot.forEach((metricKey) => {
        if (metricKey.includes("Short Trades (won %)")) {
            const metricCard = document.createElement("div");
            metricCard.className = "metric-card";
            const metricTitle = document.createElement("h3");
            let currentMetricKey = metricKey;
            if (metricKey.includes("Count")) {
                metricTitle.textContent = "Short Trades";
                currentMetricKey = "Short Trades (won %) Count";
            } else {
                metricTitle.textContent = "Short Profit";
                currentMetricKey = "Short Trades (won %) Percentage";
            }
            const chartCanvas = document.createElement("canvas");
            chartCanvas.id = `${metricKey}Chart_${tabContent.id}`;
            metricCard.appendChild(metricTitle);
            metricCard.appendChild(chartCanvas);
            grid.appendChild(metricCard);
            const filteredData = parsedData.filter(source => legendState[source.fileName]);
            const datasets = filteredData.map(source => ({
                label: metricKey,
                value: source.metrics[currentMetricKey],
                backgroundColor: source.color,
            }));
            createPieChart(chartCanvas, datasets);
        } else if (metricKey.includes("Long Trades (won %)")) {
            const metricCard = document.createElement("div");
            metricCard.className = "metric-card";
            const metricTitle = document.createElement("h3");
            let currentMetricKey = metricKey;
            if (metricKey.includes("Count")) {
                metricTitle.textContent = "Long Trades";
                currentMetricKey = "Long Trades (won %) Count";
            } else {
                metricTitle.textContent = "Long Profit";
                currentMetricKey = "Long Trades (won %) Percentage";
            }
            const chartCanvas = document.createElement("canvas");
            chartCanvas.id = `${metricKey}Chart_${tabContent.id}`;
            metricCard.appendChild(metricTitle);
            metricCard.appendChild(chartCanvas);
            grid.appendChild(metricCard);
            const filteredData = parsedData.filter(source => legendState[source.fileName]);
            const datasets = filteredData.map(source => ({
                label: metricKey,
                value: source.metrics[currentMetricKey],
                backgroundColor: source.color,
            }));
            createPieChart(chartCanvas, datasets);
        } else {
            const metricCard = document.createElement("div");
            metricCard.className = "metric-card";
            const metricTitle = document.createElement("h3");
            if (metricKey === "AvgP") {
                metricTitle.textContent = "Avg Profit";
            } else if (metricKey === "AvgL") {
                metricTitle.textContent = "Avg Loss";
            } else if (metricKey === "Maximal position holding time") {
                metricTitle.textContent = "Max hold time";
            } else if (metricKey === "Average position holding time") {
                metricTitle.textContent = "Avg hold time";
            } else {
                metricTitle.textContent = metricKey;
            }
            const chartCanvas = document.createElement("canvas");
            chartCanvas.id = `${metricKey}Chart_${tabContent.id}`;
            metricCard.appendChild(metricTitle);
            metricCard.appendChild(chartCanvas);
            grid.appendChild(metricCard);
            const filteredData = parsedData.filter(source => legendState[source.fileName]);
            const datasets = filteredData.map(source => ({
                label: metricKey,
                value: source.metrics[metricKey],
                backgroundColor: source.color,
            }));
            createPieChart(chartCanvas, datasets);
        }
	});
}
