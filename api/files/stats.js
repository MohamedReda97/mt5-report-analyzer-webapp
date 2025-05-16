export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    try {
      // Mock response for Vercel deployment
      const mockConfig = {
        maxAgeInDays: 30,
        maxFiles: 100,
        cleanupOnStartup: true,
        enableScheduledCleanup: true,
        cleanupIntervalHours: 24
      };
      
      res.status(200).json({
        totalFiles: 0,
        totalSizeMB: "0.00",
        oldestFile: null,
        newestFile: null,
        cleanupConfig: mockConfig
      });
    } catch (error) {
      console.error('Error getting file stats:', error);
      res.status(500).json({ message: 'Failed to get file statistics' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
