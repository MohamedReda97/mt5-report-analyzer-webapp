import fs from 'fs';
import path from 'path';

// Create server/public directory if it doesn't exist
const sourceDir = path.resolve('./dist/public');
const targetDir = path.resolve('./server/public');
const rootPublicDir = path.resolve('./public');

// Ensure both target directories exist
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

if (!fs.existsSync(rootPublicDir)) {
  fs.mkdirSync(rootPublicDir, { recursive: true });
}

// Copy files from dist/public to server/public and root/public
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

// Copy to root/public
copyDir(sourceDir, rootPublicDir);
console.log('Build files copied to root public directory');
