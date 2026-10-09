// Minimal static file server — supports Range requests (video seek)
const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = parseInt(process.argv[2] || '8080', 10);
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.webp': 'image/webp',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.mp4':  'video/mp4',
  '.pdf':  'application/pdf',
  '.svg':  'image/svg+xml',
  '.woff2':'font/woff2',
  '.woff': 'font/woff',
};

http.createServer(function (req, res) {
  var urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';
  var filePath = path.join(ROOT, urlPath);
  var ext = path.extname(filePath).toLowerCase();
  var ct = MIME[ext] || 'application/octet-stream';

  fs.stat(filePath, function (err, stat) {
    if (err || !stat.isFile()) {
      res.writeHead(404); res.end('Not found'); return;
    }
    var range = req.headers.range;
    if (range) {
      var parts = range.replace(/bytes=/, '').split('-');
      var start = parseInt(parts[0], 10);
      var end   = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      res.writeHead(206, {
        'Content-Type': ct,
        'Content-Range': 'bytes ' + start + '-' + end + '/' + stat.size,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
      });
      fs.createReadStream(filePath, { start: start, end: end }).pipe(res);
    } else {
      res.writeHead(200, { 'Content-Type': ct, 'Content-Length': stat.size, 'Accept-Ranges': 'bytes' });
      fs.createReadStream(filePath).pipe(res);
    }
  });
}).listen(PORT, function () {
  console.log('Serving ' + ROOT + ' on http://localhost:' + PORT);
});
