// Main API entry point for Vercel
export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Return API information
  res.status(200).json({
    name: "MT5 Report Analyzer API",
    version: "1.0.0",
    endpoints: [
      "/api/reports",
      "/api/reports/upload",
      "/api/reports/parse",
      "/api/files/stats",
      "/api/files/cleanup"
    ]
  });
}
