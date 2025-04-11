// Enable auto-reload
require("electron-reload")(__dirname, {
	electron: require(`${__dirname}/node_modules/electron`),
});

const { app, BrowserWindow } = require("electron");
const path = require("path");
const { ipcMain } = require("electron");

// Declare a global window object
let mainWindow;

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 800,
		height: 600,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
			enableRemoteModule: true,
		},
	});

	// Load the starter page (report selection page)
	mainWindow.loadFile("src/starter_page.html");

	mainWindow.on("closed", function () {
		mainWindow = null;
	});
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

app.on("activate", () => {
	if (mainWindow === null) {
		createWindow();
	}
});

// Listen for the 'load-comparison-report' event
ipcMain.on("load-comparison-report", (event, reportPath) => {
	`Loading report: ${reportPath}`;

	const fullPath = `file://${path.join(reportPath)}`;
	// Load the generated report file in the Electron window
	mainWindow.loadURL(fullPath);
});
