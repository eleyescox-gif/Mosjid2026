const http = require('http');
const fs = require('fs');
const path = require('path');
const sendSmsHandler = require('./api/send-sms');

const PORT = 8080;
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
    let reqPath = decodeURIComponent(req.url.split('?')[0]);

    // Handle /api/send-sms
    if (reqPath === '/api/send-sms') {
        res.status = function(code) { this.statusCode = code; return this; };
        res.json = function(data) {
            this.setHeader('Content-Type', 'application/json');
            this.end(JSON.stringify(data));
        };

        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    req.body = JSON.parse(body);
                } catch (e) {
                    req.body = {};
                }
                sendSmsHandler(req, res);
            });
            return;
        } else {
            const urlObj = new URL(req.url, `http://${req.headers.host}`);
            req.query = Object.fromEntries(urlObj.searchParams);
            return sendSmsHandler(req, res);
        }
    }

    let filePath = path.join(__dirname, reqPath === '/' ? 'index.html' : reqPath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('File not found');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`Mosque Finance App Server running at http://localhost:${PORT}/`);
});
