import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { parseReport, extractMetrics, extractDeals } from "./reportHandler";
import { storage } from "./storage";

// Get directory paths for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set up multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(__dirname, "..", "uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      // Generate unique filename
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + '-' + file.originalname);
    }
  }),
  fileFilter: (req, file, cb) => {
    // Accept only HTML files
    if (file.mimetype === 'text/html' || file.originalname.endsWith('.html')) {
      cb(null, true);
    } else {
      cb(new Error('Only HTML files are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // API endpoint to upload a single report file
  app.post('/api/reports/upload', upload.single('report'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    // Return file info
    res.json({
      id: req.file.filename,
      name: req.file.originalname,
      path: req.file.path
    });
  });
  
  // API endpoint to parse multiple reports for comparison
  app.post('/api/reports/parse', upload.array('reports', 10), async (req, res) => {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }
    
    try {
      // Parse each file
      const parsedReports = await Promise.all(files.map(file => parseReport(file.path, file.originalname)));
      
      // Calculate scores
      calculateMaxMetrics(parsedReports);
      
      res.json(parsedReports);
    } catch (error) {
      console.error('Error parsing reports:', error);
      res.status(500).json({ message: 'Failed to parse reports' });
    }
  });
  
  // API endpoint to get a list of uploaded reports
  app.get('/api/reports', (req, res) => {
    const uploadsDir = path.join(__dirname, "..", "uploads");
    
    if (!fs.existsSync(uploadsDir)) {
      return res.json([]);
    }
    
    try {
      const files = fs.readdirSync(uploadsDir)
        .filter(file => file.endsWith('.html'))
        .map(file => ({
          id: file,
          name: file.substring(file.indexOf('-') + 1), // Remove the unique prefix
          path: path.join(uploadsDir, file)
        }));
      
      res.json(files);
    } catch (error) {
      console.error('Error reading reports directory:', error);
      res.status(500).json({ message: 'Failed to list reports' });
    }
  });
  
  // Calculate max metrics to determine scores
  function calculateMaxMetrics(reports: any[]) {
    const maxCounts: Record<string, number> = {};
    
    reports.forEach((item) => {
      maxCounts[item.fileName] = 0;
      
      // Adjust metrics for comparison
      if (item.metrics["Max DD"]) item.metrics["Max DD"] *= -1;
      if (item.metrics["Z-Score"]) item.metrics["Z-Score"] *= -1;
    });
    
    // List of metrics to be compared
    const metrics = ["Net Profit", "Max DD", "Profit Factor", "EPO", "Recovery Factor", "Z-Score", "Sharpe Ratio", "Trades", "Win Rate", "LRC", "GHPR", "LP", "LL", "AvgP", "AvgL", "AvgPn", "AvgLn"];
    
    // Loop over each metric to find the file with the maximum value for that metric
    metrics.forEach((metric) => {
      let maxValue = -Infinity;
      let maxFile = null;
      
      // Find the maximum value for the current metric
      reports.forEach((val) => {
        const value = parseFloat(val.metrics[metric] || 0);
        if (!isNaN(value) && value > maxValue) {
          maxValue = value;
          maxFile = val.fileName;
        }
      });
      
      // Increment the count of maxed attributes for the file with the highest metric value
      if (maxFile) {
        maxCounts[maxFile] += 1;
        // Apply double increment for specific metrics as in the original function
        if (["Net Profit", "Profit Factor", "EPO", "Win Rate"].includes(metric)) {
          maxCounts[maxFile] += 1;
        }
      }
    });
    
    // Add scores to report metrics
    reports.forEach(report => {
      report.metrics["Score"] = maxCounts[report.fileName] || 0;
    });
    
    return maxCounts;
  }

  const httpServer = createServer(app);
  return httpServer;
}
