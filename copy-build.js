import fs from 'fs';
import path from 'path';

// Create server/public directory if it doesn't exist
const sourceDir = path.resolve('./dist/public');
const targetDir = path.resolve('./server/public');

// Ensure target directory exists
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Copy files from dist/public to server/public
function copyDir(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Copy to server/public
copyDir(sourceDir, targetDir);
console.log('Build files copied to server/public');
