// This is an example implementation using Vercel Blob Storage
// To use this, you need to install the @vercel/blob package:
// npm install @vercel/blob

import { put, list, del, head } from '@vercel/blob';
import { NextResponse } from 'next/server';

// Example: Upload a file
export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Generate a unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = `${uniqueSuffix}-${file.name}`;
    
    // Upload to Vercel Blob Storage
    const { url, pathname } = await put(`reports/${filename}`, file, {
      access: 'public',
      multipart: true,
    });

    return NextResponse.json({
      id: pathname,
      name: file.name,
      url: url
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

// Example: List all files
export async function GET() {
  try {
    const { blobs } = await list({ prefix: 'reports/' });
    
    const files = blobs.map(blob => ({
      id: blob.pathname,
      name: blob.pathname.split('/').pop(),
      url: blob.url,
      uploadedAt: blob.uploadedAt
    }));
    
    return NextResponse.json(files);
  } catch (error) {
    console.error('Error listing files:', error);
    return NextResponse.json(
      { error: 'Failed to list files' },
      { status: 500 }
    );
  }
}

// Example: Delete a file
export async function DELETE(request) {
  try {
    const { pathname } = await request.json();
    
    if (!pathname) {
      return NextResponse.json(
        { error: 'No pathname provided' },
        { status: 400 }
      );
    }
    
    await del(pathname);
    
    return NextResponse.json({
      success: true,
      message: `File ${pathname} deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}
