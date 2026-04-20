const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');

// Resolve frontend dir relative to this file's location
// server.js lives at <project>/frontend/server.js
const frontendDir = path.resolve(__dirname);
const BACKEND_URL = 'http://localhost:3000';

http.createServer((req, res) => {
  let url = req.url.split('?')[0];
  if (url === '/') url = '/login.html';

  // Proxy API requests to backend
  if (url.startsWith('/api/')) {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        'Content-Type': 'application/json'
      }
    };
    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, {
        ...proxyRes.headers,
        'Access-Control-Allow-Origin': '*'
      });
      proxyRes.pipe(res);
    });
    req.pipe(proxyReq);
    proxyReq.on('error', (e) => {
      res.writeHead(502);
      res.end('Backend unavailable');
    });
    return;
  }

  const filePath = path.join(frontendDir, url);

  // Security: prevent path traversal
  if (!filePath.startsWith(frontendDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  try {
    const data = fs.readFileSync(filePath);
    const ext  = path.extname(filePath);
    const mime = {
      '.html': 'text/html; charset=utf-8',
      '.css':  'text/css',
      '.js':   'application/javascript',
      '.json': 'application/json',
      '.png':  'image/png',
      '.jpg':  'image/jpeg',
      '.svg':  'image/svg+xml',
      '.ico':  'image/x-icon',
    }[ext] || 'text/plain; charset=utf-8';

    res.writeHead(200, {
      'Content-Type':             mime,
      'Cache-Control':            'no-cache, no-store, must-revalidate',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(data);
  } catch (e) {
    res.writeHead(e.code === 'ENOENT' ? 404 : 500);
    res.end(e.code === 'ENOENT' ? 'Not Found: ' + url : 'Server Error');
  }
}).listen(8080, () => {
  console.log('Frontend server running on http://localhost:8080');
  console.log('Serving from: ' + frontendDir);
});