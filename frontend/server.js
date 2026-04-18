const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let urlPath = req.url === '/' ? '/dashboard.html' : req.url;
  let filePath = path.join(__dirname, urlPath);
  
  // Security: prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  
  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, 'dashboard.html');
  }
  
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'text/plain';
  
  res.writeHead(200, {
    'Content-Type': contentType + (contentType.startsWith('text/') ? '; charset=utf-8' : ''),
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => {
  console.log(`Frontend server running on http://localhost:${PORT}`);
  console.log(`Login page: http://localhost:${PORT}/login.html`);
});
