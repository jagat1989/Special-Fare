const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // Normalize URL path
  let filePath = req.url.split('?')[0];
  if (filePath === '/') {
    filePath = '/index.html';
  }

  const absolutePath = path.join(__dirname, filePath);
  
  // Prevent directory traversal attacks
  if (!absolutePath.startsWith(__dirname)) {
    res.statusCode = 403;
    res.end('403 Forbidden');
    return;
  }

  fs.stat(absolutePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.statusCode = 404;
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(absolutePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(absolutePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🚀 Special Fare Local Dev Server is running!`);
  console.log(`👉 Open your browser at: http://localhost:${PORT}`);
  console.log(`==================================================\n`);
});
