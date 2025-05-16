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
      // This is a placeholder that returns mock data
      // In a real implementation, you would use Vercel Blob Storage or another service
      // to store and process the uploaded files
      
      const mockData = [
        {
          fileName: "Mock Report 1",
          color: "#4287f5",
          metrics: {
            "Net Profit": 1000,
            "Max DD": -200,
            "Profit Factor": 2.5,
            "Win Rate": 65
          }
        },
        {
          fileName: "Mock Report 2",
          color: "#f54242",
          metrics: {
            "Net Profit": 1500,
            "Max DD": -300,
            "Profit Factor": 3.0,
            "Win Rate": 70
          }
        }
      ];
      
      res.status(200).json(mockData);
    } catch (error) {
      console.error('Error parsing reports:', error);
      res.status(500).json({ message: 'Failed to parse reports' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
