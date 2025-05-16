# MT5 Report Analyzer Webapp

A web application for analyzing and comparing MT5 trading reports.

## Features

- Upload and parse MT5 HTML reports
- Compare multiple reports side by side
- Visualize metrics with charts and tables
- Analyze trading performance

## Deployment on Vercel

This project has been configured for deployment on Vercel. Follow these steps to deploy:

### Prerequisites

- A Vercel account
- Git repository with your code

### Deployment Steps with GitHub

1. **Create a GitHub repository**
   - Create a new repository on GitHub
   - Push your code to the repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/your-repo-name.git
   git push -u origin main
   ```

2. **Connect your GitHub repository to Vercel**
   - Go to [Vercel](https://vercel.com)
   - Sign in with GitHub
   - Click "Add New..." → "Project"
   - Select your repository from the list
   - Vercel will automatically detect that it's a Vite project

3. **Configure the project**
   - Framework Preset: Other
   - Build Command: `npm run vercel-build`
   - Output Directory: `dist/client`
   - Install Command: `npm install`

4. **Environment Variables**
   - Add any required environment variables:
     - `NODE_ENV`: `production`
     - `DATABASE_URL`: Your database connection string (if using a database)

5. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy your application

6. **Automatic Deployments**
   - Vercel will automatically deploy new versions when you push to your GitHub repository
   - You can configure branch deployments in the Vercel dashboard

### Important Notes for Production Deployment

- **File Storage**: The original application uses local file storage for uploaded reports, which won't work on Vercel's serverless environment. For production deployment, implement one of these solutions:
  - [Vercel Blob Storage](https://vercel.com/docs/storage/vercel-blob) (recommended)
    ```javascript
    import { put, list, del } from '@vercel/blob';

    // Example: Upload a file
    const { url } = await put('reports/report1.html', file, { access: 'public' });
    ```
  - [Amazon S3](https://aws.amazon.com/s3/)
  - [Cloudinary](https://cloudinary.com/)

- **API Routes**: The application has been modified to use Vercel's serverless functions. The API routes are located in the `/api` directory and currently return mock data. You'll need to update these to use your chosen storage solution.

- **Database**: If your application requires a database, consider using:
  - [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) (easiest integration)
  - [Neon](https://neon.tech/) (serverless PostgreSQL, compatible with Vercel)
  - [PlanetScale](https://planetscale.com/) (serverless MySQL)

- **Environment Variables**: Make sure to set up all required environment variables in the Vercel dashboard. These are not committed to GitHub for security reasons.

## Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

## Building for Production

```bash
# Build the application
npm run build

# Start the production server
npm run start
```

## Project Structure

- `/client` - Frontend React application
- `/server` - Backend Express server
- `/shared` - Shared types and utilities
- `/api` - Vercel serverless functions
- `/dist` - Build output

## License

MIT
