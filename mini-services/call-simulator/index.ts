import { createServer } from 'http';
import { Server } from 'socket.io';

const httpServer = createServer();
const io = new Server(httpServer, {
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ============================================================
// Simulated Indian caller data pool (25 names + phone numbers)
// ============================================================

interface CallerData {
  name: string;
  phone: string;
}

const callersPool: CallerData[] = [
  { name: 'Priya Sharma', phone: '+91-98765-43210' },
  { name: 'Rajesh Kumar', phone: '+91-87654-32109' },
  { name: 'Anita Desai', phone: '+91-76543-21098' },
  { name: 'Vikram Patel', phone: '+91-65432-10987' },
  { name: 'Meera Nair', phone: '+91-54321-09876' },
  { name: 'Arjun Reddy', phone: '+91-99887-76655' },
  { name: 'Sunita Gupta', phone: '+91-88776-65544' },
  { name: 'Karthik Iyer', phone: '+91-77665-54433' },
  { name: 'Deepa Menon', phone: '+91-66554-43322' },
  { name: 'Sanjay Verma', phone: '+91-55443-32211' },
  { name: 'Pooja Singh', phone: '+91-99001-12233' },
  { name: 'Manish Joshi', phone: '+91-88990-01122' },
  { name: 'Kavitha Rao', phone: '+91-77889-90011' },
  { name: 'Amit Banerjee', phone: '+91-66778-89900' },
  { name: 'Lakshmi Iyer', phone: '+91-55667-78899' },
  { name: 'Rohit Sharma', phone: '+91-44556-67788' },
  { name: 'Neeta Kulkarni', phone: '+91-33445-56677' },
  { name: 'Suresh Pillai', phone: '+91-22334-45566' },
  { name: 'Divya Hegde', phone: '+91-11223-34455' },
  { name: 'Prakash Choudhury', phone: '+91-90112-23344' },
  { name: 'Ritu Agarwal', phone: '+91-89001-12233' },
  { name: 'Ashok Mehta', phone: '+91-78990-01122' },
  { name: 'Swati Mishra', phone: '+91-67889-90011' },
  { name: 'Nikhil Das', phone: '+91-56778-89900' },
  { name: 'Geeta Ranganathan', phone: '+91-45667-78899' },
];

const intents = [
  'Appointment Booking',
  'General Inquiry',
  'Rescheduling',
  'Emergency Consultation',
  'Fee Inquiry',
  'Lab Report Status',
  'Doctor Availability',
  'Follow-up Consultation',
  'Insurance Query',
  'Prescription Refill',
];

const sentiments = ['positive', 'neutral', 'negative'] as const;
type Sentiment = (typeof sentiments)[number];

const callResults = ['booked', 'missed', 'escalated', 'callback_requested', 'no_show'] as const;
type CallResult = (typeof callResults)[number];

const resultMessages: Record<CallResult, string> = {
  booked: 'Appointment booked successfully',
  missed: 'Caller hung up before connecting',
  escalated: 'Transferred to human agent',
  callback_requested: 'Callback requested by patient',
  no_show: 'Patient did not answer',
};

const resultEmoji: Record<CallResult, string> = {
  booked: '✅',
  missed: '📞',
  escalated: '⚠️',
  callback_requested: '🔄',
  no_show: '❌',
};

// ============================================================
// Utility functions
// ============================================================

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateCallEvent() {
  const caller = randomFrom(callersPool);
  const intent = randomFrom(intents);
  const sentiment = randomFrom(sentiments);
  const duration = randomBetween(30, 480); // 30s to 8 minutes

  return {
    type: 'call_event',
    data: {
      callerName: caller.name,
      callerPhone: caller.phone,
      intent,
      sentiment,
      duration,
      timestamp: new Date().toISOString(),
    },
  };
}

function generateCallEndEvent(callerName: string) {
  const result = randomFrom(callResults);
  const callDuration = randomBetween(45, 360); // 45s to 6 minutes

  return {
    type: 'call_ended',
    data: {
      callerName,
      result,
      message: resultMessages[result],
      emoji: resultEmoji[result],
      duration: callDuration,
      timestamp: new Date().toISOString(),
    },
  };
}

// ============================================================
// Connection & call simulation logic
// ============================================================

interface ActiveCall {
  timer: ReturnType<typeof setTimeout>;
  callerName: string;
}

const activeCalls = new Map<string, ActiveCall>();
let simulationTimer: ReturnType<typeof setInterval> | null = null;

function startCallSimulation(socketId: string) {
  // Schedule first call after 5-10 seconds
  const initialDelay = randomBetween(5000, 10000);

  if (simulationTimer) clearInterval(simulationTimer);

  // Schedule first call for this client
  const firstCallTimer = setTimeout(() => {
    if (activeCalls.has(socketId)) return; // Already have a call in progress
    emitCallEvent(socketId);
  }, initialDelay);

  activeCalls.set(socketId, { timer: firstCallTimer, callerName: '' });

  // Then schedule recurring calls every 15-30 seconds
  scheduleNextCall(socketId);
}

function scheduleNextCall(socketId: string) {
  const delay = randomBetween(15000, 30000);

  const timer = setTimeout(() => {
    const call = activeCalls.get(socketId);
    if (call) {
      emitCallEvent(socketId);
    }
  }, delay);

  const existing = activeCalls.get(socketId);
  if (existing) {
    existing.timer = timer;
  }
}

function emitCallEvent(socketId: string) {
  const call = activeCalls.get(socketId);
  if (!call) return;

  const event = generateCallEvent();
  io.to(socketId).emit('call_event', event.data);

  console.log(`📞 Call event sent to ${socketId}: ${event.data.callerName} (${event.data.callerPhone}) - ${event.data.intent}`);

  // Schedule call_ended event after 8-15 seconds
  const endDelay = randomBetween(8000, 15000);
  const callerName = event.data.callerName;

  const endTimer = setTimeout(() => {
    const endEvent = generateCallEndEvent(callerName);
    io.to(socketId).emit('call_ended', endEvent.data);

    console.log(`📊 Call ended for ${socketId}: ${callerName} - ${endEvent.data.result}`);

    // Schedule next call
    scheduleNextCall(socketId);
  }, endDelay);

  // Store the end timer
  call.timer = endTimer;
  call.callerName = callerName;
}

// ============================================================
// Socket.IO connection handling
// ============================================================

io.on('connection', (socket) => {
  console.log(`✅ Client connected: ${socket.id} (total: ${io.engine.clientsCount})`);

  // Send connection confirmation
  socket.emit('connected', {
    message: 'Call simulator connected',
    timestamp: new Date().toISOString(),
  });

  // Start simulation for this client
  startCallSimulation(socket.id);

  socket.on('pause_simulation', () => {
    const call = activeCalls.get(socket.id);
    if (call) {
      clearTimeout(call.timer);
      console.log(`⏸️ Simulation paused for ${socket.id}`);
    }
  });

  socket.on('resume_simulation', () => {
    console.log(`▶️ Simulation resumed for ${socket.id}`);
    scheduleNextCall(socket.id);
  });

  socket.on('disconnect', (reason) => {
    const call = activeCalls.get(socket.id);
    if (call) {
      clearTimeout(call.timer);
      activeCalls.delete(socket.id);
    }
    console.log(`❌ Client disconnected: ${socket.id} (${reason}) (total: ${io.engine.clientsCount})`);
  });

  socket.on('error', (error) => {
    console.error(`⚠️ Socket error (${socket.id}):`, error);
  });
});

// ============================================================
// Start server
// ============================================================

const PORT = 3004;
httpServer.listen(PORT, () => {
  console.log(`🏥 Call Simulator WebSocket server running on port ${PORT}`);
  console.log(`   Pool: ${callersPool.length} callers, ${intents.length} intents`);
  console.log(`   Call interval: 15-30s, Duration: 8-15s`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down...');
  activeCalls.forEach((call) => clearTimeout(call.timer));
  if (simulationTimer) clearInterval(simulationTimer);
  httpServer.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down...');
  activeCalls.forEach((call) => clearTimeout(call.timer));
  if (simulationTimer) clearInterval(simulationTimer);
  httpServer.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
