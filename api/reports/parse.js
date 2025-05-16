import { parseReportContent, calculateMaxMetrics } from '../utils/reportParser.js';
import { getRandomColor } from '../utils/helpers.js';
import formidable from 'formidable';

// This is needed for Vercel to handle file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

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
      // Parse the multipart form data
      const form = new formidable.IncomingForm();
      form.multiples = true;

      const { fields, files } = await new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) return reject(err);
          resolve({ fields, files });
        });
      });

      // Get the uploaded files
      const uploadedFiles = files.reports || [];
      const fileArray = Array.isArray(uploadedFiles) ? uploadedFiles : [uploadedFiles];

      if (fileArray.length === 0) {
        return res.status(400).json({ message: 'No files uploaded' });
      }

      // Parse each file
      const parsedReports = [];

      for (const file of fileArray) {
        try {
          // Read the file content using fs
          const fs = require('fs');
          const fileContent = fs.readFileSync(file.filepath, 'utf8');

          // Parse the report
          const report = parseReportContent(fileContent, file.originalname || 'Unknown File');

          // Add a random color
          report.color = getRandomColor();

          parsedReports.push(report);
        } catch (fileError) {
          console.error(`Error parsing file ${file.originalname || 'Unknown File'}:`, fileError);
          // Add a placeholder for the failed file
          parsedReports.push({
            fileName: file.originalname || 'Unknown File',
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

      // If we can't parse the files, return mock data as fallback
      const mockData = [
        {
          fileName: "Mock Report 1 (Fallback)",
          color: "#4287f5",
          metrics: {
            "Net Profit": 1000,
            "Max DD": -200,
            "Profit Factor": 2.5,
            "Win Rate": 65,
            "error": "Failed to parse uploaded files. Using mock data as fallback."
          }
        },
        {
          fileName: "Mock Report 2 (Fallback)",
          color: "#f54242",
          metrics: {
            "Net Profit": 1500,
            "Max DD": -300,
            "Profit Factor": 3.0,
            "Win Rate": 70,
            "error": "Failed to parse uploaded files. Using mock data as fallback."
          }
        }
      ];

      res.status(200).json(mockData);
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
