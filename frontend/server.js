const http = require('http');
const fs = require('fs');
const path = require('path');

const frontendDir = 'E:\\AI Project\\企业管理系统\\frontend';

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

http.createServer((req, res) => {
  let url = req.url.split('?')[0];
  if (url === '/') url = '/index.html';
  
  const filePath = path.join(frontendDir, url);
  
  // Security: prevent path traversal
  if (!filePath.startsWith(frontendDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  try {
    const data = fs.readFileSync(filePath);
    const ext = path.extname(filePath);
    const ct = mimeTypes[ext] || 'text/plain; charset=utf-8';
    res.writeHead(200, {
      'Content-Type': ct,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(data);
  } catch(e) {
    if (e.code === 'ENOENT') {
      res.writeHead(404);
      res.end('Not Found: ' + url);
    } else {
      res.writeHead(500);
      res.end('Server Error');
    }
  }
}).listen(8080, () => {
  console.log('Frontend server running on http://localhost:8080');
});
