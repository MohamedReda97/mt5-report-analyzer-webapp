// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";
import multer from "multer";
import fs4 from "fs";
import path5 from "path";
import { fileURLToPath as fileURLToPath2 } from "url";

// server/reportHandler.ts
import fs from "fs";
import path from "path";
import * as cheerio from "cheerio";
import * as chardet from "chardet";
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
async function parseReport(filePath, originalName) {
  try {
    console.log(`Starting to parse report: ${originalName} at path: ${filePath}`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }
    const stats = fs.statSync(filePath);
    console.log(`File size: ${stats.size} bytes`);
    if (stats.size === 0) {
      throw new Error(`File is empty: ${filePath}`);
    }
    let encoding;
    try {
      encoding = chardet.detectFileSync(filePath);
      console.log(`Detected encoding: ${encoding}`);
    } catch (encodingError) {
      console.error(`Error detecting encoding: ${encodingError.message}`);
      encoding = "utf8";
    }
    let fileContent;
    try {
      fileContent = fs.readFileSync(filePath, { encoding: encoding || "utf8" });
    } catch (readError) {
      console.error(`Error reading file with encoding ${encoding}: ${readError.message}`);
      fileContent = fs.readFileSync(filePath, { encoding: "utf8" });
    }
    const $ = cheerio.load(fileContent);
    console.log(`Successfully loaded HTML content into Cheerio`);
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
      "Average position holding time": "Average position holding time"
    };
    const { metrics, inputs } = extractMetrics($, metricsDict);
    const deals = extractDeals($);
    return {
      fileName: path.basename(originalName),
      metrics,
      inputs,
      deals
    };
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    throw error;
  }
}
function extractMetrics($, metricsDict) {
  const results = {};
  let inputs = {};
  try {
    const tables = $("table");
    if (tables.length === 0) {
      console.error("No tables found in the HTML document");
      return { metrics: { error: "No tables found in the HTML document" }, inputs: {} };
    }
    console.log(`Found ${tables.length} tables in the document`);
    const table = tables.first();
    const rows = table.find("tr[align='right']");
    if (rows.length === 0) {
      console.error("No rows found in the first table");
      return { metrics: { error: "No rows found in the first table" }, inputs: {} };
    }
    console.log(`Found ${rows.length} rows in the first table`);
    let isInputsSection = false;
    let inputLines = [];
    rows.each((_, row) => {
      try {
        const cells = $(row).find("td");
        if (cells.length === 0) {
          console.log("Row has no cells, skipping");
          return;
        }
        const firstCellText = $(cells[0]).text().trim();
        if (firstCellText.includes("Inputs:")) {
          isInputsSection = true;
          inputLines = [];
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
          inputs = inputLines.reduce((acc, line) => {
            const parts = line.split("=");
            if (parts.length === 2) {
              const key = parts[0].trim();
              const value = parts[1].trim();
              acc[key] = value;
            }
            return acc;
          }, inputs);
          return;
        }
        if (isInputsSection) {
          const line = cells.map((_2, cell) => $(cell).text().trim()).get().join(" ");
          inputLines.push(line);
          return;
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
        console.error("Error processing row:", cellError);
      }
    });
    return { metrics: results, inputs };
  } catch (error) {
    console.error("Error extracting metrics:", error);
    return { metrics: { error: `Error extracting metrics: ${error.message}` }, inputs: {} };
  }
}
function extractDeals($) {
  try {
    const tables = $("table");
    if (tables.length < 2) {
      console.log("Not enough tables found for deals extraction");
      return [];
    }
    const data = [];
    $(tables[1]).find("tr").each((i, row) => {
      const cols = [];
      $(row).find("td").each((j, col) => {
        cols.push($(col).text().trim());
      });
      if (cols.length > 0) {
        data.push(cols);
      }
    });
    if (data.length === 0) {
      console.log("No data rows found in the deals table");
      return [];
    }
    console.log(`Found ${data.length} data rows in the deals table`);
    const headerIndex = data.findIndex(
      (row) => JSON.stringify(row) === JSON.stringify(["Time", "Deal", "Symbol", "Type", "Direction", "Volume", "Price", "Order", "Commission", "Swap", "Profit", "Balance", "Comment"])
    );
    console.log(`Header row index: ${headerIndex}`);
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
    console.log(`Extracted ${df.length} deals`);
    return df;
  } catch (error) {
    console.error("Error extracting deals:", error);
    return [];
  }
}

// server/fileCleanup.ts
import fs3 from "fs";
import path4 from "path";
import { fileURLToPath } from "url";

// server/vite.ts
import express from "express";
import fs2 from "fs";
import path3 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path2 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path2.resolve(import.meta.dirname, "client", "src"),
      "@shared": path2.resolve(import.meta.dirname, "shared"),
      "@assets": path2.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path2.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path2.resolve(import.meta.dirname, "server/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path3.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path3.resolve(import.meta.dirname, "public");
  if (!fs2.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path3.resolve(distPath, "index.html"));
  });
}

// server/fileCleanup.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path4.dirname(__filename);
var defaultCleanupConfig = {
  maxAgeInDays: 30,
  maxFiles: 100,
  cleanupOnStartup: true,
  enableScheduledCleanup: true,
  cleanupIntervalHours: 24
};
function getUploadsDir() {
  return path4.join(__dirname, "..", "uploads");
}
function listFiles() {
  const uploadsDir2 = getUploadsDir();
  if (!fs3.existsSync(uploadsDir2)) {
    return [];
  }
  try {
    return fs3.readdirSync(uploadsDir2).filter((file) => file.endsWith(".html")).map((file) => {
      const filePath = path4.join(uploadsDir2, file);
      const stats = fs3.statSync(filePath);
      return {
        name: file,
        path: filePath,
        createdAt: stats.birthtime,
        size: stats.size
      };
    });
  } catch (error) {
    console.error("Error listing files:", error);
    return [];
  }
}
function deleteFile(filePath) {
  try {
    fs3.unlinkSync(filePath);
    return true;
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error);
    return false;
  }
}
function deleteOldFiles(maxAgeInDays) {
  const files = listFiles();
  const now = /* @__PURE__ */ new Date();
  const maxAgeMs = maxAgeInDays * 24 * 60 * 60 * 1e3;
  let deletedCount = 0;
  files.forEach((file) => {
    const fileAge = now.getTime() - file.createdAt.getTime();
    if (fileAge > maxAgeMs) {
      if (deleteFile(file.path)) {
        deletedCount++;
      }
    }
  });
  return deletedCount;
}
function limitFileCount(maxFiles) {
  const files = listFiles();
  if (files.length <= maxFiles) {
    return 0;
  }
  files.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const filesToDelete = files.slice(0, files.length - maxFiles);
  let deletedCount = 0;
  filesToDelete.forEach((file) => {
    if (deleteFile(file.path)) {
      deletedCount++;
    }
  });
  return deletedCount;
}
function performCleanup(config = defaultCleanupConfig) {
  const oldFilesDeleted = deleteOldFiles(config.maxAgeInDays);
  const excessFilesDeleted = limitFileCount(config.maxFiles);
  const remainingFiles = listFiles();
  const totalSizeRemaining = remainingFiles.reduce((total, file) => total + file.size, 0);
  log(`Cleanup completed: ${oldFilesDeleted} old files and ${excessFilesDeleted} excess files deleted. ${remainingFiles.length} files remaining (${(totalSizeRemaining / 1024 / 1024).toFixed(2)} MB)`, "file-cleanup");
  return {
    oldFilesDeleted,
    excessFilesDeleted,
    totalFilesRemaining: remainingFiles.length,
    totalSizeRemaining
  };
}
function setupScheduledCleanup(config = defaultCleanupConfig) {
  if (!config.enableScheduledCleanup) {
    return null;
  }
  const intervalMs = config.cleanupIntervalHours * 60 * 60 * 1e3;
  log(`Scheduled file cleanup enabled. Will run every ${config.cleanupIntervalHours} hours`, "file-cleanup");
  return setInterval(() => {
    log("Running scheduled file cleanup", "file-cleanup");
    performCleanup(config);
  }, intervalMs);
}

// server/routes.ts
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = path5.dirname(__filename2);
var upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadsDir2 = path5.join(__dirname2, "..", "uploads");
      if (!fs4.existsSync(uploadsDir2)) {
        fs4.mkdirSync(uploadsDir2, { recursive: true });
      }
      cb(null, uploadsDir2);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + "-" + file.originalname);
    }
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "text/html" || file.originalname.endsWith(".html")) {
      cb(null, true);
    } else {
      cb(new Error("Only HTML files are allowed"));
    }
  }
});
async function registerRoutes(app2) {
  app2.post("/api/reports/upload", upload.single("report"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    performCleanup(defaultCleanupConfig);
    log(`File uploaded: ${req.file.originalname}`, "file-upload");
    res.json({
      id: req.file.filename,
      name: req.file.originalname,
      path: req.file.path
    });
  });
  app2.post("/api/reports/parse", upload.array("reports", 10), async (req, res) => {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }
    try {
      const parsedReports = [];
      for (const file of files) {
        try {
          console.log(`Processing file: ${file.originalname}, path: ${file.path}`);
          if (!fs4.existsSync(file.path)) {
            console.error(`File does not exist: ${file.path}`);
            throw new Error(`File does not exist: ${file.path}`);
          }
          const report = await parseReport(file.path, file.originalname);
          parsedReports.push(report);
        } catch (fileError) {
          console.error(`Error parsing file ${file.originalname}:`, fileError);
          parsedReports.push({
            fileName: file.originalname,
            metrics: { error: `Failed to parse: ${fileError.message}` },
            inputs: {},
            deals: []
          });
        }
      }
      if (parsedReports.length === 0) {
        throw new Error("All files failed to parse");
      }
      calculateMaxMetrics(parsedReports);
      performCleanup(defaultCleanupConfig);
      log(`Processed ${files.length} files`, "file-upload");
      res.json(parsedReports);
    } catch (error) {
      console.error("Error parsing reports:", error);
      res.status(500).json({ message: `Failed to parse reports: ${error.message}` });
    }
  });
  app2.get("/api/reports", (req, res) => {
    const uploadsDir2 = path5.join(__dirname2, "..", "uploads");
    if (!fs4.existsSync(uploadsDir2)) {
      return res.json([]);
    }
    try {
      const files = fs4.readdirSync(uploadsDir2).filter((file) => file.endsWith(".html")).map((file) => ({
        id: file,
        name: file.substring(file.indexOf("-") + 1),
        // Remove the unique prefix
        path: path5.join(uploadsDir2, file)
      }));
      res.json(files);
    } catch (error) {
      console.error("Error reading reports directory:", error);
      res.status(500).json({ message: "Failed to list reports" });
    }
  });
  app2.get("/api/files/stats", (req, res) => {
    try {
      const files = listFiles();
      const totalSize = files.reduce((total, file) => total + file.size, 0);
      const oldestFile = files.length > 0 ? files.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0] : null;
      const newestFile = files.length > 0 ? files.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] : null;
      res.json({
        totalFiles: files.length,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
        oldestFile: oldestFile ? {
          name: oldestFile.name,
          createdAt: oldestFile.createdAt,
          age: Math.floor((Date.now() - oldestFile.createdAt.getTime()) / (1e3 * 60 * 60 * 24)) + " days"
        } : null,
        newestFile: newestFile ? {
          name: newestFile.name,
          createdAt: newestFile.createdAt
        } : null,
        cleanupConfig: defaultCleanupConfig
      });
    } catch (error) {
      console.error("Error getting file stats:", error);
      res.status(500).json({ message: "Failed to get file statistics" });
    }
  });
  app2.post("/api/files/cleanup", (req, res) => {
    try {
      const customConfig = req.body || {};
      const config = {
        ...defaultCleanupConfig,
        ...customConfig
      };
      const result = performCleanup(config);
      res.json({
        success: true,
        message: `Cleanup completed successfully. Deleted ${result.oldFilesDeleted + result.excessFilesDeleted} files.`,
        ...result
      });
    } catch (error) {
      console.error("Error during manual cleanup:", error);
      res.status(500).json({
        success: false,
        message: "Failed to perform cleanup",
        error: error.message
      });
    }
  });
  function calculateMaxMetrics(reports) {
    const maxCounts = {};
    reports.forEach((item) => {
      maxCounts[item.fileName] = 0;
      if (item.metrics["Max DD"]) item.metrics["Max DD"] *= -1;
      if (item.metrics["Z-Score"]) item.metrics["Z-Score"] *= -1;
    });
    const metrics = ["Net Profit", "Max DD", "Profit Factor", "EPO", "Recovery Factor", "Z-Score", "Sharpe Ratio", "Trades", "Win Rate", "LRC", "GHPR", "LP", "LL", "AvgP", "AvgL", "AvgPn", "AvgLn"];
    metrics.forEach((metric) => {
      let maxValue = -Infinity;
      let maxFile = null;
      reports.forEach((val) => {
        const value = parseFloat(val.metrics[metric] || 0);
        if (!isNaN(value) && value > maxValue) {
          maxValue = value;
          maxFile = val.fileName;
        }
      });
      if (maxFile) {
        maxCounts[maxFile] += 1;
        if (["Net Profit", "Profit Factor", "EPO", "Win Rate"].includes(metric)) {
          maxCounts[maxFile] += 1;
        }
      }
    });
    reports.forEach((report) => {
      report.metrics["Score"] = maxCounts[report.fileName] || 0;
    });
    return maxCounts;
  }
  const httpServer = createServer(app2);
  return httpServer;
}

// server/index.ts
import path6 from "path";
import fs5 from "fs";
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
var uploadsDir = path6.resolve("./uploads");
if (!fs5.existsSync(uploadsDir)) {
  fs5.mkdirSync(uploadsDir, { recursive: true });
  console.log(`Created uploads directory at ${uploadsDir}`);
}
if (defaultCleanupConfig.cleanupOnStartup) {
  log("Running startup file cleanup", "file-cleanup");
  performCleanup(defaultCleanupConfig);
}
var cleanupInterval = setupScheduledCleanup(defaultCleanupConfig);
app.use((req, res, next) => {
  const start = Date.now();
  const path7 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path7.startsWith("/api")) {
      let logLine = `${req.method} ${path7} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "localhost"
  }, () => {
    log(`serving on port ${port}`);
  });
})();
