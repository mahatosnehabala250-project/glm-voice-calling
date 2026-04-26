import { spawn } from 'child_process';
import http from 'http';

const NEXT_PORT = 3000;
const KEEPALIVE_PORT = 3099;

let nextProcess: ReturnType<typeof spawn> | null = null;

function startNext() {
  if (nextProcess) {
    nextProcess.kill('SIGTERM');
  }
  
  console.log(`[${new Date().toISOString()}] Starting Next.js on port ${NEXT_PORT}...`);
  nextProcess = spawn('node', [
    '/home/z/my-project/node_modules/.bin/next',
    'dev',
    '-p', String(NEXT_PORT)
  ], {
    cwd: '/home/z/my-project',
    env: { ...process.env },
    stdio: ['inherit', 'inherit', 'inherit']
  });

  nextProcess.on('exit', (code, signal) => {
    console.log(`[${new Date().toISOString()}] Next.js exited (code=${code}, signal=${signal}). Restarting in 2s...`);
    setTimeout(startNext, 2000);
  });

  nextProcess.on('error', (err) => {
    console.error(`[${new Date().toISOString()}] Next.js error:`, err);
    setTimeout(startNext, 2000);
  });
}

// Keep-alive HTTP server
const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'alive',
    nextPort: NEXT_PORT,
    uptime: process.uptime(),
    nextRunning: nextProcess !== null && !nextProcess.killed
  }));
});

server.listen(KEEPALIVE_PORT, () => {
  console.log(`[${new Date().toISOString()}] Keep-alive server on port ${KEEPALIVE_PORT}`);
});

// Self-ping to Next.js every 5s to keep it warm
setInterval(() => {
  http.get(`http://localhost:${NEXT_PORT}/`, (res) => {
    // silently consume response to keep connection alive
    res.resume();
  }).on('error', () => {
    // server might be starting, ignore
  });
}, 5000);

// Start Next.js
startNext();
