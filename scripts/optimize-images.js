const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const booksBaseDir = path.join(__dirname, '../images/books');

function processDir(dir) {
  const items = fs.readdirSync(dir);
  
  items.forEach(item => {
    const fullPath = path.join(dir, item);
    const stats = fs.statSync(fullPath);
    
    if (stats.isDirectory()) {
      processDir(fullPath);
    } else if (item.endsWith('.jpg') || item.endsWith('.jpeg')) {
      const outputPath = fullPath.replace(/\.jpe?g$/, '.webp');
      
      // Skip if WebP already exists and is newer than JPG
      if (fs.existsSync(outputPath)) {
        const outStats = fs.statSync(outputPath);
        if (outStats.mtime > stats.mtime) {
          return;
        }
      }

      console.log(`Optimizing: ${path.relative(booksBaseDir, fullPath)}...`);
      
      sharp(fullPath)
        .resize(1200, 1200, {
          fit: 'cover',
          position: 'center'
        })
        .webp({ quality: 85 })
        .toFile(outputPath)
        .then(() => console.log(`  ✓ Saved: ${path.relative(booksBaseDir, outputPath)}`))
        .catch(err => console.error(`  ✗ Error: ${err.message}`));
    }
  });
}

if (fs.existsSync(booksBaseDir)) {
  console.log('Starting book optimization...');
  processDir(booksBaseDir);
} else {
  console.error(`Base books directory not found: ${booksBaseDir}`);
}
