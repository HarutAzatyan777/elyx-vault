import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXTENSION_DIR = path.join(__dirname, 'extension');
const PORT = 8890;

let lastChangeTime = Date.now();

console.log('====================================================');
console.log('       Elyx Vault Extension Hot-Reload Watcher      ');
console.log('====================================================');
console.log(`Watching extension directory: ${EXTENSION_DIR}`);

fs.watch(EXTENSION_DIR, { recursive: true }, (eventType, filename) => {
  if (filename) {
    console.log(`[${new Date().toLocaleTimeString()}] File changed: ${filename}`);
    lastChangeTime = Date.now();
  }
});

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.url === '/last-updated') {
    res.writeHead(200);
    res.end(JSON.stringify({ timestamp: lastChangeTime }));
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(PORT, () => {
  console.log(`[Hot Reload Server] Ready at http://localhost:${PORT}/last-updated`);
  console.log('Save any file in extension/ to automatically reload Chrome extension!\n');
});
