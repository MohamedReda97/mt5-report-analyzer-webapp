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

      const { fields, files } = await new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) return reject(err);
          resolve({ fields, files });
        });
      });

      // Get the uploaded file
      const uploadedFile = files.report;

      if (!uploadedFile) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      // Generate a unique ID for the file
      const uniqueId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // Return file info
      res.status(200).json({
        id: uniqueId,
        name: uploadedFile.originalname || uploadedFile.originalFilename || 'Unknown File',
        path: uploadedFile.filepath || '/temp-path'
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json({ message: 'Failed to upload file' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
