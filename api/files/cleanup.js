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
      // Mock response for Vercel deployment
      res.status(200).json({
        success: true,
        message: "Cleanup completed successfully. Deleted 0 files.",
        oldFilesDeleted: 0,
        excessFilesDeleted: 0,
        totalFilesRemaining: 0,
        totalSizeRemaining: 0
      });
    } catch (error) {
      console.error('Error during manual cleanup:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to perform cleanup',
        error: error.message
      });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
