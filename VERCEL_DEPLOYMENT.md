# Vercel Deployment Guide

This document provides detailed instructions for deploying the MT5 Report Analyzer application to Vercel using GitHub.

## Prerequisites

1. A [GitHub](https://github.com) account
2. A [Vercel](https://vercel.com) account (you can sign up with your GitHub account)
3. Your project code ready to be pushed to GitHub

## Step 1: Prepare Your Repository

1. Create a new repository on GitHub:
   - Go to [GitHub](https://github.com)
   - Click the "+" icon in the top right and select "New repository"
   - Name your repository (e.g., "mt5-report-analyzer")
   - Choose public or private visibility
   - Click "Create repository"

2. Push your code to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/your-repo-name.git
   git push -u origin main
   ```

## Step 2: Connect to Vercel

1. Go to [Vercel](https://vercel.com) and sign in with your GitHub account
2. Click "Add New..." → "Project"
3. Select your GitHub repository from the list
4. Vercel will automatically detect that it's a Vite project

## Step 3: Configure the Project

1. Configure the build settings:
   - Framework Preset: Other
   - Build Command: `npm run vercel-build`
   - Output Directory: `dist/client`
   - Install Command: `npm install`

2. Set up environment variables:
   - Click "Environment Variables"
   - Add the following variables:
     - `NODE_ENV`: `production`
     - If using a database, add `DATABASE_URL` with your connection string

3. Click "Deploy"

## Step 4: Set Up Blob Storage (For Production)

To handle file uploads in production, you'll need to set up Vercel Blob Storage:

1. Install the Vercel Blob Storage package:
   ```bash
   npm install @vercel/blob
   ```

2. Set up the Blob Storage environment variables in the Vercel dashboard:
   - Go to your project in the Vercel dashboard
   - Click on "Settings" → "Environment Variables"
   - Add the `BLOB_READ_WRITE_TOKEN` variable (you can generate this in the Vercel dashboard)

3. Update your API routes to use Vercel Blob Storage:
   - See the example implementation in `api/examples/blob-storage.js`
   - Modify your existing API routes to use Blob Storage instead of local file storage

## Step 5: Verify Deployment

1. Once deployment is complete, Vercel will provide you with a URL to access your application
2. Test your application to ensure everything is working correctly
3. If you encounter any issues, check the Vercel deployment logs for errors

## Automatic Deployments

Vercel automatically deploys new versions when you push changes to your GitHub repository:

1. Make changes to your code locally
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Your commit message"
   git push
   ```
3. Vercel will automatically detect the changes and deploy a new version

## Preview Deployments

Vercel also creates preview deployments for pull requests:

1. Create a new branch:
   ```bash
   git checkout -b feature/new-feature
   ```
2. Make your changes and push to GitHub:
   ```bash
   git add .
   git commit -m "Add new feature"
   git push -u origin feature/new-feature
   ```
3. Create a pull request on GitHub
4. Vercel will create a preview deployment for your pull request

## Troubleshooting

If you encounter issues during deployment:

1. Check the Vercel deployment logs for errors
2. Ensure all required environment variables are set
3. Verify that your build commands are correct
4. Make sure your API routes are properly configured for serverless functions

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Blob Storage Documentation](https://vercel.com/docs/storage/vercel-blob)
- [GitHub Documentation](https://docs.github.com)
