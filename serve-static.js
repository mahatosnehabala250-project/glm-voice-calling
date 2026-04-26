/* eslint-disable @typescript-eslint/no-require-imports */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const STANDALONE_DIR = path.join(__dirname, '.next', 'standalone');

// Import Next.js server
async function start() {
  try {
    const server = require(path.join(STANDALONE_DIR, 'server.js'));
    console.log('Next.js standalone server loaded');
  } catch(e) {
    console.error('Failed to load standalone:', e.message);
    // Fallback: serve static HTML
    const html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8').catch(() => '<h1>VoiceAI - Server Starting...</h1>');
    http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*' });
      res.end(typeof html === 'string' ? html : '<h1>VoiceAI</h1>');
    }).listen(PORT, () => console.log(`Fallback server on ${PORT}`));
  }
}
start();
