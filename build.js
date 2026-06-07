const fs = require('fs');
const path = require('path');

// Helper to recursively copy directories
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  let entries = fs.readdirSync(src, { withFileTypes: true });

  for (let entry of entries) {
    let srcPath = path.join(src, entry.name);
    let destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

try {
  console.log('Building Special Fare static application...');

  // Create clean dist folder
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  fs.mkdirSync('dist', { recursive: true });

  // Copy assets
  if (fs.existsSync('css')) {
    copyDir('css', path.join('dist', 'css'));
    console.log('✓ Copied CSS files');
  }
  if (fs.existsSync('js')) {
    copyDir('js', path.join('dist', 'js'));
    console.log('✓ Copied JS files');
  }

  // Copy HTML & config files from root
  const rootFiles = fs.readdirSync('.');
  let htmlCount = 0;
  for (let file of rootFiles) {
    if (file.endsWith('.html') || file === '.env.example' || file === '.gitignore') {
      fs.copyFileSync(file, path.join('dist', file));
      if (file.endsWith('.html')) htmlCount++;
    }
  }
  console.log(`✓ Copied ${htmlCount} HTML pages`);
  console.log('✓ Build completed successfully! Output folder: dist/');
} catch (err) {
  console.error('Error building project:', err);
  process.exit(1);
}

