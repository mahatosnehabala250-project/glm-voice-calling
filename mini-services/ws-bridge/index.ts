// ============================================================
// VoiceAI WebSocket Bridge Service
// Port: 3033
//
// Bridges Vobiz Stream WebSocket ↔ Gemini AI
// Handles G.711 µ-law audio, tracks call sessions,
// and provides demo mode with simulated AI responses.
// ============================================================

import { createServer, IncomingMessage, ServerResponse } from "http";
import { WebSocketServer, WebSocket } from "ws";

// ============================================================
// Configuration
// ============================================================

const PORT = 3033;
const DEMO_MODE = process.env.WS_BRIDGE_DEMO_MODE !== "false"; // ON by default
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_LIVE_WS_URL = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.StreamGenerateContent';
const GEMINI_SERVICE_URL = process.env.GEMINI_SERVICE_URL || "http://localhost:3032";
const VOICEAI_GATEWAY_URL = process.env.VOICEAI_GATEWAY_URL || "http://localhost:3000";
const AUDIO_CHUNK_MS = 20; // 20ms per chunk at 8kHz
const AUDIO_CHUNK_SIZE = 160; // 160 bytes per chunk (8kHz * 8-bit * 20ms)
const DEMO_INITIAL_SILENCE_CHUNKS = 6; // ~120ms of silence before greeting
const DEMO_RESPONSE_DELAY_MS = 2000; // 2s after audio stops before responding

// ============================================================
// TypeScript Types
// ============================================================

type CallStatus = "connecting" | "active" | "ending" | "ended";
type DemoState = "GREETING" | "LISTENING" | "PROCESSING" | "RESPONDING" | "IDLE";

interface CallSession {
  streamId: string;
  callId: string;
  authId: string;
  clinicId: string;
  ws: WebSocket;
  startedAt: number;
  mediaCount: number;
  dtmfBuffer: string[];
  lastActivity: number;
  status: CallStatus;
  transcript: Array<{ role: "patient" | "ai"; text: string; timestamp: number }>;
  audioBytesReceived: number;
  audioBytesSent: number;
  // Demo mode fields
  demoState: DemoState;
  demoAudioChunks: number;
  demoSilenceTimer: ReturnType<typeof setTimeout> | null;
  demoResponseTimer: ReturnType<typeof setTimeout> | null;
  mediaBuffer: Buffer[];
  mediaBufferStartTime: number;
  // Gemini Live mode fields
  geminiSession: GeminiLiveSession | null;
}

// Vobiz WebSocket event types
interface VobizStartEvent {
  sequenceNumber?: number;
  event: "start";
  start: {
    callId: string;
    streamId: string;
    auth_id?: string;
    tracks?: string[];
    mediaFormat?: {
      encoding: string;
      sampleRate: number;
    };
  };
  [key: string]: unknown;
}

interface VobizMediaEvent {
  event: "media";
  streamId: string;
  media: {
    payload: string; // base64-encoded µ-law audio
    contentType: string;
    sampleRate: number;
    timestamp: number;
  };
  [key: string]: unknown;
}

interface VobizStopEvent {
  event: "stop";
  streamId: string;
  reason?: string;
  [key: string]: unknown;
}

interface VobizDtmfEvent {
  event: "dtmf";
  streamId?: string;
  // Vobiz docs show TWO possible formats:
  // 1. Flat: { "event": "dtmf", "digits": "1" }
  // 2. Nested: { "event": "dtmf", "dtmf": { "digit": "1", "duration": 100 } }
  digits?: string;
  dtmf?: {
    digit: string;
    duration: number;
  };
  [key: string]: unknown;
}

interface VobizClearedAudioEvent {
  event: "clearedAudio";
  streamId: string;
  [key: string]: unknown;
}

type VobizEvent = VobizStartEvent | VobizMediaEvent | VobizStopEvent | VobizDtmfEvent | VobizClearedAudioEvent;

interface PlayAudioMessage {
  event: "playAudio";
  streamId: string;
  media: {
    payload: string; // base64-encoded µ-law audio
    contentType: "audio/x-mulaw" | "audio/x-l16";
    sampleRate: number;
  };
}

interface ClearAudioMessage {
  event: "clearAudio";
  streamId: string;
}

interface CheckpointMessage {
  event: "checkpoint";
  streamId: string;
  name: string;
}

// ============================================================
// Global State
// ============================================================

const startTime = Date.now();
const sessions = new Map<string, CallSession>();
let totalCallsHandled = 0;
let totalAudioBytesProcessed = 0;

// ============================================================
// µ-law (G.711) Conversion Tables
// ============================================================

// Build decode table: µ-law byte → 16-bit PCM sample
const MULAW_DECODE_TABLE = new Int16Array(256);
// Build encode table: 16-bit PCM sample (clamped to 0-65535 range) → µ-law byte
// We'll use a function for encoding since a 65536-entry table is large

function buildMulawDecodeTable(): void {
  for (let i = 0; i < 256; i++) {
    MULAW_DECODE_TABLE[i] = mulawToPcmSample(i);
  }
}

/**
 * Convert a single µ-law byte to a signed 16-bit PCM sample.
 * Implements ITU-T G.711 specification.
 */
function mulawToPcmSample(mulaw: number): number {
  // Expand the compressed µ-law value
  let compressed = ~mulaw & 0xFF; // Invert all bits

  // Extract exponent (bits 4-7) and mantissa (bits 0-3)
  const exponent = (compressed & 0x70) >> 4;
  const mantissa = compressed & 0x0F;

  // Add implicit leading 1 to mantissa
  let sample = (mantissa << 4) | 0x10;
  sample = (sample << exponent) + 0x20; // Shift by exponent and add bias

  // Apply sign bit (bit 7 of compressed)
  if (compressed & 0x80) {
    sample = -sample;
  }

  return sample;
}

/**
 * Convert a signed 16-bit PCM sample to a µ-law byte.
 * Implements ITU-T G.711 specification.
 */
function pcmToMulawSample(pcm: number): number {
  // Clamp to 16-bit range
  const MAX = 32635;
  pcm = Math.max(-MAX, Math.min(MAX, pcm));

  // Get sign and make positive
  const sign = pcm < 0 ? 0x80 : 0x00;
  pcm = Math.abs(pcm);

  // Add bias
  pcm += 0x84;

  // Find exponent (number of leading zeros in upper 7 bits of biased sample)
  let exponent = 7;
  for (let expMask = 0x4000; (pcm & expMask) === 0 && exponent > 0; expMask >>= 1) {
    exponent--;
  }

  // Calculate mantissa
  const mantissa = (pcm >> (exponent + 3)) & 0x0F;

  // Pack into µ-law byte: sign | (exponent << 4) | mantissa
  const compressed = sign | (exponent << 4) | mantissa;

  // Invert all bits (µ-law stores complemented)
  return ~compressed & 0xFF;
}

// ============================================================
// Audio Utility Functions
// ============================================================

/**
 * Convert a buffer of G.711 µ-law encoded audio to 16-bit PCM.
 * Each µ-law byte becomes a 16-bit PCM sample (little-endian).
 */
function mulawToPcm(mulaw: Buffer): Buffer {
  const pcm = Buffer.alloc(mulaw.length * 2);
  for (let i = 0; i < mulaw.length; i++) {
    const sample = MULAW_DECODE_TABLE[mulaw[i]];
    pcm.writeInt16LE(sample, i * 2);
  }
  return pcm;
}

/**
 * Convert a buffer of 16-bit PCM audio (little-endian) to G.711 µ-law.
 * Each pair of bytes (16-bit sample) becomes one µ-law byte.
 */
function pcmToMulaw(pcm: Buffer): Buffer {
  if (pcm.length % 2 !== 0) {
    throw new Error("PCM buffer length must be even (16-bit samples)");
  }
  const mulaw = Buffer.alloc(pcm.length / 2);
  for (let i = 0; i < mulaw.length; i++) {
    const sample = pcm.readInt16LE(i * 2);
    mulaw[i] = pcmToMulawSample(sample);
  }
  return mulaw;
}

/**
 * Generate silence in µ-law format.
 * µ-law value for silence (zero amplitude) is 0xFF (255).
 */
function generateSilenceMs(ms: number): Buffer {
  const chunkCount = Math.ceil(ms / AUDIO_CHUNK_MS);
  return Buffer.alloc(chunkCount * AUDIO_CHUNK_SIZE, 0xFF);
}

/**
 * Base64 encode a buffer for WebSocket payload.
 */
function base64Encode(buf: Buffer): string {
  return buf.toString("base64");
}

/**
 * Generate a simulated speech-like audio pattern in µ-law.
 * Creates a sine-wave-like pattern to simulate voice for demo mode.
 */
function generateSimulatedSpeechMs(ms: number, frequency: number = 300): Buffer {
  const chunkCount = Math.ceil(ms / AUDIO_CHUNK_MS);
  const totalBytes = chunkCount * AUDIO_CHUNK_SIZE;
  const mulaw = Buffer.alloc(totalBytes);

  for (let i = 0; i < totalBytes; i++) {
    // Create a modulated sine-wave pattern
    const t = i / 8000; // sample index / sample rate
    const envelope = Math.sin(Math.PI * t / (ms / 1000)); // Soft envelope
    const wave = Math.sin(2 * Math.PI * frequency * t);
    const amplitude = wave * envelope * 0.3; // 30% max amplitude

    // Convert float amplitude to µ-law
    const pcmValue = Math.round(amplitude * 32767);
    mulaw[i] = pcmToMulawSample(Math.max(-32635, Math.min(32635, pcmValue)));
  }

  return mulaw;
}

// ============================================================
// PCM Resampling (Linear Interpolation)
// ============================================================

/**
 * Resample PCM 16-bit audio between sample rates using linear interpolation.
 * @param input - Buffer of 16-bit PCM samples (little-endian)
 * @param fromRate - Source sample rate (e.g., 8000)
 * @param toRate - Target sample rate (e.g., 24000)
 */
function resamplePcm(input: Buffer, fromRate: number, toRate: number): Buffer {
  if (fromRate === toRate) return input;
  const ratio = toRate / fromRate;
  const inputSamples = input.length / 2; // 16-bit samples
  const outputSamples = Math.floor(inputSamples * ratio);
  const output = Buffer.alloc(outputSamples * 2);

  for (let i = 0; i < outputSamples; i++) {
    const srcIndex = i / ratio;
    const index = Math.floor(srcIndex);
    const frac = srcIndex - index;

    if (index + 1 < inputSamples) {
      const a = input.readInt16LE(index * 2);
      const b = input.readInt16LE((index + 1) * 2);
      const sample = Math.round(a + (b - a) * frac);
      output.writeInt16LE(Math.max(-32768, Math.min(32767, sample)), i * 2);
    }
  }

  return output;
}

// ============================================================
// System Prompt Builder
// ============================================================

function buildSystemPrompt(clinicName: string, doctorName: string, services: string[]): string {
  return `You are VoiceAI, an AI receptionist at ${clinicName} led by ${doctorName}. 
You speak in Hinglish (Hindi + English mix). Be warm, professional, and helpful.
Available services: ${services.join(', ')}.
Your job is to:
1. Greet patients warmly
2. Help them book appointments
3. Answer questions about services and fees
4. Handle emergencies by escalating to human staff
Keep responses short and conversational. You are on a phone call, so be concise.`;
}

// ============================================================
// Gemini Live Session Manager
// ============================================================

class GeminiLiveSession {
  private ws: WebSocket | null = null;
  private streamId: string;
  private vobizWs: WebSocket;
  private isActive = false;
  private systemPrompt: string;
  private setupResolve: (() => void) | null = null;
  private reconnectAttempts = 0;
  private static readonly MAX_RECONNECT = 1;

  constructor(streamId: string, vobizWs: WebSocket, systemPrompt: string) {
    this.streamId = streamId;
    this.vobizWs = vobizWs;
    this.systemPrompt = systemPrompt;
  }

  async connect(): Promise<void> {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    return new Promise((resolve, reject) => {
      const url = `${GEMINI_LIVE_WS_URL}?key=${GEMINI_API_KEY}`;
      const ws = new WebSocket(url);
      this.ws = ws;

      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('Gemini WebSocket connection timeout (10s)'));
      }, 10000);

      ws.on('open', () => {
        console.log(`🤖 [Gemini] Connected for stream ${this.streamId.slice(0, 8)}...`);
        this.sendSetup();
      });

      ws.on('message', (data: Buffer | string) => {
        const raw = typeof data === 'string' ? data : data.toString('utf-8');
        this.handleGeminiMessage(raw);
      });

      ws.on('error', (err: Error) => {
        clearTimeout(timeout);
        console.error(`❌ [Gemini] WebSocket error for ${this.streamId.slice(0, 8)}...: ${err.message}`);
        this.isActive = false;
        reject(err);
      });

      ws.on('close', (code: number, reason: Buffer) => {
        clearTimeout(timeout);
        console.log(`🔌 [Gemini] Disconnected for ${this.streamId.slice(0, 8)}... (code=${code})`);
        this.isActive = false;
      });

      // Store resolve for setupComplete handling
      this.setupResolve = resolve;
    });
  }

  private sendSetup(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const setupMsg = {
      setup: {
        model: 'models/gemini-2.0-flash-live-001',
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: 'Aoede',
              },
            },
          },
          systemInstruction: {
            parts: [{ text: this.systemPrompt }],
          },
        },
        tools: [{ functionDeclarations: [] }],
      },
    };

    this.ws.send(JSON.stringify(setupMsg));
    console.log(`📤 [Gemini] Sent setup for stream ${this.streamId.slice(0, 8)}...`);
  }

  /**
   * Convert µ-law (8kHz) → PCM 16-bit (8kHz) → resample to 24kHz → send to Gemini.
   */
  sendAudio(mulawBuffer: Buffer): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isActive) return;

    try {
      // µ-law → PCM 16-bit at 8kHz
      const pcm8k = mulawToPcm(mulawBuffer);
      // Resample 8kHz → 24kHz
      const pcm24k = resamplePcm(pcm8k, 8000, 24000);
      // Send as base64-encoded PCM 24kHz
      const msg = {
        realtimeInput: {
          mediaChunks: [{
            data: pcm24k.toString('base64'),
            mimeType: 'audio/pcm;rate=24000',
          }],
        },
      };
      this.ws.send(JSON.stringify(msg));
    } catch (err) {
      console.warn(`⚠️ [Gemini] Failed to send audio for ${this.streamId.slice(0, 8)}...: ${err instanceof Error ? err.message : err}`);
    }
  }

  private handleGeminiMessage(raw: string): void {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      console.warn(`⚠️ [Gemini] Non-JSON message from Gemini`);
      return;
    }

    // Handle setupComplete
    if ('setupComplete' in msg) {
      console.log(`✅ [Gemini] Setup complete for stream ${this.streamId.slice(0, 8)}...`);
      this.isActive = true;
      if (this.setupResolve) {
        this.setupResolve();
        this.setupResolve = null;
      }
      return;
    }

    // Handle serverContent
    if ('serverContent' in msg) {
      const serverContent = msg.serverContent as Record<string, unknown> | undefined;
      if (!serverContent) return;

      const modelTurn = serverContent.modelTurn as Record<string, unknown> | undefined;
      if (!modelTurn) return;

      const parts = modelTurn.parts as Array<Record<string, unknown>> | undefined;
      if (!parts) return;

      for (const part of parts) {
        // Text response
        if ('text' in part && typeof part.text === 'string') {
          this.handleTextResponse(part.text);
        }
        // Audio response
        if ('inlineData' in part && part.inlineData) {
          const inlineData = part.inlineData as Record<string, unknown>;
          if (typeof inlineData.data === 'string') {
            this.handleAudioResponse(inlineData.data);
          }
        }
      }
    }
  }

  private handleTextResponse(text: string): void {
    console.log(`💬 [Gemini] Text: "${text.substring(0, 100)}"`);
    const session = sessions.get(this.streamId);
    if (session) {
      session.transcript.push({
        role: 'ai',
        text,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Decode base64 PCM 24kHz → resample to 8kHz → convert to µ-law → send to Vobiz.
   */
  private handleAudioResponse(base64Audio: string): void {
    if (this.vobizWs.readyState !== WebSocket.OPEN) return;

    try {
      const pcm24k = Buffer.from(base64Audio, 'base64');
      // Resample 24kHz → 8kHz
      const pcm8k = resamplePcm(pcm24k, 24000, 8000);
      // Convert to µ-law
      const mulaw = pcmToMulaw(pcm8k);
      // Send to Vobiz
      sendPlayAudio(this.vobizWs, this.streamId, mulaw);
    } catch (err) {
      console.warn(`⚠️ [Gemini] Failed to play audio for ${this.streamId.slice(0, 8)}...: ${err instanceof Error ? err.message : err}`);
    }
  }

  /**
   * Send interrupt signal to Gemini to stop current generation.
   */
  sendInterrupt(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isActive) return;
    this.ws.send(JSON.stringify({ interrupt: true }));
    console.log(`⏹️ [Gemini] Sent interrupt for stream ${this.streamId.slice(0, 8)}...`);
  }

  async disconnect(): Promise<void> {
    this.isActive = false;
    if (this.ws) {
      try {
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.close(1000, 'Call ended');
        }
      } catch (err) {
        console.warn(`⚠️ [Gemini] Error closing WebSocket: ${err instanceof Error ? err.message : err}`);
      }
      this.ws = null;
    }
  }
}

// ============================================================
// Send playAudio to Vobiz
// ============================================================

function sendPlayAudio(ws: WebSocket, streamId: string, mulawAudio: Buffer): void {
  if (ws.readyState !== WebSocket.OPEN) return;

  const message: PlayAudioMessage = {
    event: "playAudio",
    streamId,
    media: {
      payload: base64Encode(mulawAudio),
      contentType: "audio/x-mulaw",
      sampleRate: 8000,
    },
  };

  ws.send(JSON.stringify(message));

  // Track bytes
  const session = sessions.get(streamId);
  if (session) {
    session.audioBytesSent += mulawAudio.length;
  }
}

// ============================================================
// Send clearAudio to Vobiz (interrupt current playback)
// ============================================================

function sendClearAudio(ws: WebSocket, streamId: string): void {
  if (ws.readyState !== WebSocket.OPEN) return;

  const message: ClearAudioMessage = {
    event: "clearAudio",
    streamId,
  };

  ws.send(JSON.stringify(message));
  console.log(`🔇 [ClearAudio] Sent clearAudio for stream ${streamId.slice(0, 8)}...`);
}

// ============================================================
// Send checkpoint to Vobiz (confirm audio playback)
// ============================================================

function sendCheckpoint(ws: WebSocket, streamId: string, name: string): void {
  if (ws.readyState !== WebSocket.OPEN) return;

  const message: CheckpointMessage = {
    event: "checkpoint",
    streamId,
    name,
  };

  ws.send(JSON.stringify(message));
  console.log(`✅ [Checkpoint] Sent checkpoint "${name}" for stream ${streamId.slice(0, 8)}...`);
}

// ============================================================
// Demo Mode — Simulated AI Conversation
// ============================================================

const DEMO_GREETINGS = [
  "Namaste! VoiceAI mein aapka swagat hai!",
  "Hello! Sharma Dental Clinic mein aapka swagat hai!",
  "Namaste! Main VoiceAI hoon, aapki AI receptionist.",
];

const DEMO_RESPONSES = [
  "Ji haan, bilkul! Main aapki madad kar sakti hoon.",
  "Aap appointment book karna chahte hain? Bataiye kaunsa date suit karega.",
  "Koi baat nahi, main samajh gayi. Aur kuch poochna hai?",
  "Theek hai, main note kar rahi hoon. Kya aur madad chahiye?",
];

const DEMO_FAREWELLS = [
  "Dhanyavaad! Aapka din shubh ho!",
  "Alvida! Jab bhi zarurat ho, hum yahan hain.",
  "Shukriya! Aapki appointment confirm ho gayi hai.",
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function handleDemoGreeting(session: CallSession): void {
  console.log(`🗣️ [Demo] Sending greeting for stream ${session.streamId}`);
  const greeting = pickRandom(DEMO_GREETINGS);

  // Add to transcript
  session.transcript.push({
    role: "ai",
    text: greeting,
    timestamp: Date.now(),
  });

  // Build audio: 100ms silence + 1.5s simulated speech + 50ms silence
  const silenceBefore = generateSilenceMs(100);
  const speech = generateSimulatedSpeechMs(1500, 280 + Math.random() * 100);
  const silenceAfter = generateSilenceMs(50);
  const fullAudio = Buffer.concat([silenceBefore, speech, silenceAfter]);

  sendPlayAudio(session.ws, session.streamId, fullAudio);

  session.demoState = "LISTENING";
  session.demoAudioChunks = 0;
  session.mediaBuffer = [];
}

function handleDemoResponse(session: CallSession): void {
  console.log(`🗣️ [Demo] Sending response for stream ${session.streamId}`);
  const response = pickRandom(DEMO_RESPONSES);

  // Add to transcript
  session.transcript.push({
    role: "ai",
    text: response,
    timestamp: Date.now(),
  });

  // ✅ Per Vobiz docs: clear previous audio before sending new audio to avoid overlap
  sendClearAudio(session.ws, session.streamId);

  // Build audio: 200ms silence + 2s simulated speech + 50ms silence
  const silenceBefore = generateSilenceMs(200);
  const speech = generateSimulatedSpeechMs(2000, 250 + Math.random() * 150);
  const silenceAfter = generateSilenceMs(50);
  const fullAudio = Buffer.concat([silenceBefore, speech, silenceAfter]);

  sendPlayAudio(session.ws, session.streamId, fullAudio);

  // ✅ Send checkpoint to confirm audio was queued
  sendCheckpoint(session.ws, session.streamId, `demo-response-${Date.now()}`);

  session.demoState = "LISTENING";
  session.demoAudioChunks = 0;
  session.mediaBuffer = [];
}

function handleDemoFarewell(session: CallSession): void {
  console.log(`🗣️ [Demo] Sending farewell for stream ${session.streamId}`);
  const farewell = pickRandom(DEMO_FAREWELLS);

  session.transcript.push({
    role: "ai",
    text: farewell,
    timestamp: Date.now(),
  });

  const silenceBefore = generateSilenceMs(100);
  const speech = generateSimulatedSpeechMs(1500, 260 + Math.random() * 80);
  const silenceAfter = generateSilenceMs(100);
  const fullAudio = Buffer.concat([silenceBefore, speech, silenceAfter]);

  sendPlayAudio(session.ws, session.streamId, fullAudio);

  session.demoState = "IDLE";
}

/**
 * Schedule a demo response after silence is detected.
 * Resets the timer each time new audio arrives.
 */
function scheduleDemoResponse(session: CallSession): void {
  // Clear existing timer
  if (session.demoSilenceTimer) {
    clearTimeout(session.demoSilenceTimer);
    session.demoSilenceTimer = null;
  }

  // If we have enough audio chunks, schedule a response
  if (session.demoAudioChunks >= DEMO_INITIAL_SILENCE_CHUNKS) {
    session.demoState = "PROCESSING";
    console.log(
      `🧠 [Demo] Processing audio from stream ${session.streamId} (${session.demoAudioChunks} chunks)...`
    );

    session.demoSilenceTimer = setTimeout(() => {
      if (session.status !== "active" || session.ws.readyState !== WebSocket.OPEN) return;

      // Simulate transcription of patient speech
      const patientText = `[Patient audio: ${session.demoAudioChunks} chunks received at ${new Date().toISOString()}]`;
      session.transcript.push({
        role: "patient",
        text: patientText,
        timestamp: Date.now(),
      });

      console.log(
        `📝 [Demo] Transcribed patient audio → scheduling AI response for ${session.streamId}`
      );

      // Small delay to simulate AI thinking
      session.demoResponseTimer = setTimeout(() => {
        if (session.status !== "active" || session.ws.readyState !== WebSocket.OPEN) return;
        handleDemoResponse(session);
      }, 500);
    }, DEMO_RESPONSE_DELAY_MS);
  }
}

// ============================================================
// WebSocket Event Handlers
// ============================================================

function handleStart(ws: WebSocket, data: VobizStartEvent): void {
  const start = data.start;
  const streamId = start.streamId;
  const callId = start.callId;

  console.log(`📞 [Start] callId=${callId}, streamId=${streamId}, auth_id=${start.auth_id || "N/A"}`);

  // Create session
  const session: CallSession = {
    streamId,
    callId,
    authId: start.auth_id || "unknown",
    clinicId: "default",
    ws,
    startedAt: Date.now(),
    mediaCount: 0,
    dtmfBuffer: [],
    lastActivity: Date.now(),
    status: "active",
    transcript: [],
    audioBytesReceived: 0,
    audioBytesSent: 0,
    demoState: "GREETING",
    demoAudioChunks: 0,
    demoSilenceTimer: null,
    demoResponseTimer: null,
    mediaBuffer: [],
    mediaBufferStartTime: 0,
    geminiSession: null,
  };

  sessions.set(streamId, session);
  totalCallsHandled++;

  console.log(`✅ [Session] Created session for stream ${streamId} (total active: ${sessions.size})`);

  if (DEMO_MODE) {
    // Demo mode: send greeting after a short delay
    setTimeout(() => {
      if (session.status === "active" && ws.readyState === WebSocket.OPEN) {
        handleDemoGreeting(session);
      }
    }, 300);
  } else {
    // Gemini Live mode: connect to Gemini and let AI handle the greeting
    if (!GEMINI_API_KEY) {
      console.warn(`⚠️ [Gemini] GEMINI_API_KEY not set — falling back to demo mode for stream ${streamId}`);
      setTimeout(() => {
        if (session.status === "active" && ws.readyState === WebSocket.OPEN) {
          handleDemoGreeting(session);
        }
      }, 300);
      return;
    }

    const systemPrompt = buildSystemPrompt(
      'Sharma Dental Clinic',
      'Dr. Rajesh Sharma',
      ['Dental Checkup', 'Root Canal', 'Teeth Cleaning', 'Braces', 'Whitening']
    );

    const gemini = new GeminiLiveSession(streamId, ws, systemPrompt);
    session.geminiSession = gemini;

    gemini.connect()
      .then(() => {
        console.log(`🤖 [Gemini] Session ready for stream ${streamId.slice(0, 8)}... — AI will greet the patient`);
      })
      .catch((err: Error) => {
        console.error(`❌ [Gemini] Failed to connect for ${streamId.slice(0, 8)}...: ${err.message} — falling back to demo mode`);
        session.geminiSession = null;
        if (session.status === "active" && ws.readyState === WebSocket.OPEN) {
          handleDemoGreeting(session);
        }
      });
  }
}

function handleMedia(ws: WebSocket, data: VobizMediaEvent): void {
  const streamId = data.streamId;
  const session = sessions.get(streamId);

  if (!session) {
    console.warn(`⚠️ [Media] No session for streamId=${streamId}`);
    return;
  }

  session.lastActivity = Date.now();
  session.mediaCount++;
  session.demoAudioChunks++;

  // Decode and track audio
  let audioBytes = 0;
  try {
    const mulawBuf = Buffer.from(data.media.payload, "base64");
    audioBytes = mulawBuf.length;
    session.audioBytesReceived += audioBytes;
    totalAudioBytesProcessed += audioBytes;

    // Buffer audio for potential processing
    session.mediaBuffer.push(mulawBuf);
    if (session.mediaBuffer.length === 1) {
      session.mediaBufferStartTime = Date.now();
    }

    // Keep buffer manageable (max ~5 seconds)
    const maxChunks = 250; // 5s at 50 chunks/s
    while (session.mediaBuffer.length > maxChunks) {
      session.mediaBuffer.shift();
    }
  } catch (err) {
    console.warn(`⚠️ [Media] Failed to decode audio for ${streamId}: ${err instanceof Error ? err.message : err}`);
  }

  // Log every 50th media event to avoid spam
  if (session.mediaCount % 50 === 0) {
    console.log(
      `🔊 [Media] stream=${streamId.slice(0, 8)}..., chunk #${session.mediaCount}, bytes=${audioBytes}, total=${session.audioBytesReceived}`
    );
  }

  // Gemini Live mode: forward audio to Gemini
  if (!DEMO_MODE && session.geminiSession) {
    try {
      session.geminiSession.sendAudio(mulawBuf);
    } catch (err) {
      console.warn(`⚠️ [Media] Gemini sendAudio failed for ${streamId}: ${err instanceof Error ? err.message : err}`);
    }
    return;
  }

  // Demo mode: schedule response when silence is detected
  if (DEMO_MODE && session.demoState === "LISTENING") {
    scheduleDemoResponse(session);
  }
}

function handleStop(ws: WebSocket, data: VobizStopEvent): void {
  const streamId = data.streamId;
  const reason = data.reason || "unknown";

  console.log(`⏹️ [Stop] streamId=${streamId}, reason=${reason}`);

  const session = sessions.get(streamId);
  if (!session) {
    console.warn(`⚠️ [Stop] No session for streamId=${streamId}`);
    return;
  }

  session.status = "ended";
  session.lastActivity = Date.now();

  // Clean up Gemini session
  if (session.geminiSession) {
    session.geminiSession.disconnect().catch(() => {});
    session.geminiSession = null;
  }

  // Clean up timers
  if (session.demoSilenceTimer) {
    clearTimeout(session.demoSilenceTimer);
    session.demoSilenceTimer = null;
  }
  if (session.demoResponseTimer) {
    clearTimeout(session.demoResponseTimer);
    session.demoResponseTimer = null;
  }

  const duration = Math.floor((Date.now() - session.startedAt) / 1000);

  console.log(
    `📊 [Session Ended] stream=${streamId.slice(0, 8)}..., duration=${duration}s, mediaChunks=${session.mediaCount}, audioIn=${session.audioBytesReceived}, audioOut=${session.audioBytesSent}`
  );

  // Keep session in map for a while (for metrics/API queries)
  // Auto-cleanup after 5 minutes
  setTimeout(() => {
    const s = sessions.get(streamId);
    if (s && s.status === "ended") {
      sessions.delete(streamId);
      console.log(`🧹 [Cleanup] Removed ended session ${streamId.slice(0, 8)}... (remaining: ${sessions.size})`);
    }
  }, 300000);
}

function handleDtmf(ws: WebSocket, data: VobizDtmfEvent): void {
  const streamId = data.streamId || "unknown";
  // ✅ Handle both flat and nested DTMF formats per Vobiz docs
  const digit = data.digits || data.dtmf?.digit || "?";
  const duration = data.dtmf?.duration || 0;

  console.log(`🔑 [DTMF] stream=${streamId.slice(0, 8)}..., digit='${digit}', duration=${duration}ms`);

  const session = sessions.get(streamId);
  if (!session) {
    console.warn(`⚠️ [DTMF] No session for streamId=${streamId}`);
    return;
  }

  session.lastActivity = Date.now();
  session.dtmfBuffer.push(digit);

  // Log the DTMF buffer
  console.log(`🔑 [DTMF Buffer] stream=${streamId.slice(0, 8)}..., buffer=[${session.dtmfBuffer.join(", ")}]`);
}

function handleClearedAudio(ws: WebSocket, data: VobizClearedAudioEvent): void {
  const streamId = data.streamId;

  // This is an acknowledgment that audio was played
  // No action needed, but log it
  const session = sessions.get(streamId);
  if (session && session.mediaCount % 50 === 0) {
    console.log(`🔊 [ClearedAudio] stream=${streamId.slice(0, 8)}... — audio playback acknowledged`);
  }
}

function handleWebSocketMessage(ws: WebSocket, rawMessage: string): void {
  let data: VobizEvent;

  try {
    data = JSON.parse(rawMessage) as VobizEvent;
  } catch (err) {
    console.warn(`⚠️ [WS] Malformed message: ${rawMessage.substring(0, 100)}...`);
    return;
  }

  const event = data.event;

  switch (event) {
    case "start":
      handleStart(ws, data as VobizStartEvent);
      break;
    case "media":
      handleMedia(ws, data as VobizMediaEvent);
      break;
    case "stop":
      handleStop(ws, data as VobizStopEvent);
      break;
    case "dtmf":
      handleDtmf(ws, data as VobizDtmfEvent);
      break;
    case "clearedAudio":
      handleClearedAudio(ws, data as VobizClearedAudioEvent);
      break;
    default:
      console.warn(`⚠️ [WS] Unknown event type: ${event}`);
  }
}

function handleWebSocketClose(ws: WebSocket, code: number, reason: Buffer): void {
  // Find and clean up the session associated with this WebSocket
  for (const [streamId, session] of sessions) {
    if (session.ws === ws) {
      session.status = "ended";
      session.lastActivity = Date.now();

      // Clean up Gemini session
      if (session.geminiSession) {
        session.geminiSession.disconnect().catch(() => {});
        session.geminiSession = null;
      }

      // Clean up timers
      if (session.demoSilenceTimer) {
        clearTimeout(session.demoSilenceTimer);
        session.demoSilenceTimer = null;
      }
      if (session.demoResponseTimer) {
        clearTimeout(session.demoResponseTimer);
        session.demoResponseTimer = null;
      }

      console.log(
        `🔌 [WS Close] stream=${streamId.slice(0, 8)}..., code=${code}, sessions=${sessions.size}`
      );
      break;
    }
  }
}

function handleWebSocketError(ws: WebSocket, error: Error): void {
  console.error(`❌ [WS Error] ${error.message}`);

  // Find session
  for (const [streamId, session] of sessions) {
    if (session.ws === ws) {
      console.error(`❌ [WS Error] Associated stream: ${streamId.slice(0, 8)}...`);
      session.status = "ended";
      break;
    }
  }
}

// ============================================================
// HTTP Endpoints
// ============================================================

function sendJson(res: ServerResponse, data: unknown, status: number = 200): void {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(body);
}

function sendCorsPreflight(res: ServerResponse): void {
  res.writeHead(204, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  });
  res.end();
}

function handleHealthCheck(req: IncomingMessage, res: ServerResponse): void {
  const activeCalls = Array.from(sessions.values()).filter((s) => s.status === "active").length;
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = uptime % 60;

  sendJson(res, {
    status: "healthy",
    service: "VoiceAI WebSocket Bridge",
    version: "1.1.0",
    port: PORT,
    demoMode: DEMO_MODE,
    geminiLiveReady: !!GEMINI_API_KEY,
    activeCalls,
    totalCallsHandled,
    uptime: `${hours}h ${minutes}m ${seconds}s`,
    uptimeSeconds: uptime,
    protocol: "Vobiz Stream (WebSocket)",
    audioFormat: "G.711 µ-law (PCMU), 8kHz, 8-bit, 64kbps",
    chunkSize: `${AUDIO_CHUNK_SIZE} bytes per 20ms`,
    timestamp: new Date().toISOString(),
    endpoints: [
      "GET / — Health check",
      "GET /api/metrics — WebSocket metrics",
      "GET /api/sessions — Active sessions list",
      "GET /api/sessions/:streamId — Session details with transcript",
    ],
  });
}

function handleMetrics(req: IncomingMessage, res: ServerResponse): void {
  const activeSessions = Array.from(sessions.values());
  const activeCalls = activeSessions.filter((s) => s.status === "active");

  sendJson(res, {
    activeSessions: activeCalls.length,
    totalSessions: sessions.size,
    totalCallsHandled,
    totalAudioBytesProcessed,
    totalAudioBytesReceived: activeCalls.reduce((sum, s) => sum + s.audioBytesReceived, 0),
    totalAudioBytesSent: activeCalls.reduce((sum, s) => sum + s.audioBytesSent, 0),
    totalMediaChunks: activeCalls.reduce((sum, s) => sum + s.mediaCount, 0),
    avgMediaChunks: activeCalls.length > 0
      ? Math.round(activeCalls.reduce((sum, s) => sum + s.mediaCount, 0) / activeCalls.length)
      : 0,
    demoMode: DEMO_MODE,
    timestamp: new Date().toISOString(),
  });
}

function handleSessionsList(req: IncomingMessage, res: ServerResponse): void {
  const activeSessions = Array.from(sessions.values()).filter((s) => s.status === "active");

  const sessionList = activeSessions.map((s) => ({
    streamId: s.streamId,
    callId: s.callId,
    authId: s.authId,
    clinicId: s.clinicId,
    status: s.status,
    startedAt: new Date(s.startedAt).toISOString(),
    duration: Math.floor((Date.now() - s.startedAt) / 1000),
    mediaCount: s.mediaCount,
    audioBytesReceived: s.audioBytesReceived,
    audioBytesSent: s.audioBytesSent,
    dtmfBuffer: s.dtmfBuffer,
    lastActivity: new Date(s.lastActivity).toISOString(),
    demoState: DEMO_MODE ? s.demoState : undefined,
    transcriptLength: s.transcript.length,
  }));

  sendJson(res, {
    count: sessionList.length,
    sessions: sessionList,
    timestamp: new Date().toISOString(),
  });
}

function handleSessionDetail(req: IncomingMessage, res: ServerResponse, streamId: string): void {
  const session = sessions.get(streamId);

  if (!session) {
    sendJson(res, { error: `Session not found for streamId: ${streamId}` }, 404);
    return;
  }

  sendJson(res, {
    streamId: session.streamId,
    callId: session.callId,
    authId: session.authId,
    clinicId: session.clinicId,
    status: session.status,
    startedAt: new Date(session.startedAt).toISOString(),
    duration: Math.floor((Date.now() - session.startedAt) / 1000),
    mediaCount: session.mediaCount,
    audioBytesReceived: session.audioBytesReceived,
    audioBytesSent: session.audioBytesSent,
    dtmfBuffer: session.dtmfBuffer,
    lastActivity: new Date(session.lastActivity).toISOString(),
    demoState: DEMO_MODE ? session.demoState : undefined,
    transcript: session.transcript.map((t) => ({
      role: t.role,
      text: t.text,
      timestamp: new Date(t.timestamp).toISOString(),
    })),
    timestamp: new Date().toISOString(),
  });
}

// ============================================================
// HTTP Request Router
// ============================================================

function handleHttpRequest(req: IncomingMessage, res: ServerResponse): void {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);
  const { pathname } = url;

  // CORS preflight
  if (req.method === "OPTIONS") {
    sendCorsPreflight(res);
    return;
  }

  // Only GET endpoints
  if (req.method !== "GET") {
    sendJson(res, { error: "Method not allowed. Only GET endpoints available." }, 405);
    return;
  }

  // Health check
  if (pathname === "/") {
    handleHealthCheck(req, res);
    return;
  }

  // Metrics
  if (pathname === "/api/metrics") {
    handleMetrics(req, res);
    return;
  }

  // Sessions list
  if (pathname === "/api/sessions") {
    handleSessionsList(req, res);
    return;
  }

  // Session detail
  const sessionMatch = pathname.match(/^\/api\/sessions\/([a-zA-Z0-9\-]+)$/);
  if (sessionMatch) {
    handleSessionDetail(req, res, sessionMatch[1]);
    return;
  }

  // 404
  sendJson(res, {
    error: "Not Found",
    message: `Route ${pathname} not found`,
    availableEndpoints: [
      "GET / — Health check",
      "GET /api/metrics — WebSocket metrics",
      "GET /api/sessions — Active sessions list",
      "GET /api/sessions/:streamId — Session details with transcript",
    ],
  }, 404);
}

// ============================================================
// Initialize and Start Server
// ============================================================

// Build µ-law decode lookup table at startup
buildMulawDecodeTable();
console.log(`📋 [Init] Built µ-law decode table (256 entries)`);

// Create HTTP server
const server = createServer(handleHttpRequest);

// Create WebSocket server
const wss = new WebSocketServer({
  server,
  maxPayload: 1024 * 1024, // 1MB max message size
});

// Handle WebSocket connections
wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
  const clientIp = req.socket.remoteAddress || "unknown";
  console.log(`🔌 [Connect] New WebSocket connection from ${clientIp} (active: ${sessions.size})`);

  ws.on("message", (data: Buffer | string, isBinary: boolean) => {
    // Vobiz sends JSON strings (text frames)
    if (isBinary) {
      console.warn(`⚠️ [WS] Received binary frame (expected text) from ${clientIp}`);
      return;
    }
    const message = data.toString("utf-8");
    handleWebSocketMessage(ws, message);
  });

  ws.on("close", (code: number, reason: Buffer) => {
    handleWebSocketClose(ws, code, reason);
  });

  ws.on("error", (error: Error) => {
    handleWebSocketError(ws, error);
  });

  // Keep-alive ping interval (every 30s)
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  }, 30000);

  ws.on("close", () => {
    clearInterval(pingInterval);
  });
});

// Note: WebSocket upgrades are handled automatically by the WebSocketServer
// (we passed `server` in the constructor, so it attaches its own upgrade listener)

// Catch unhandled errors to prevent silent crashes
process.on("uncaughtException", (err) => {
  console.error("❌ [Uncaught Exception]", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("❌ [Unhandled Rejection]", reason);
});

// Start listening
server.listen(PORT, '0.0.0.0', () => {
  console.log("");
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║   🔌 VoiceAI WebSocket Bridge Service v1.1      ║");
  console.log("╠══════════════════════════════════════════════════╣");
  console.log(`║   Port: ${String(PORT).padEnd(39)}║`);
  console.log(`║   Demo Mode: ${String(DEMO_MODE ? "ON (simulated AI responses)" : "OFF (live Gemini)").padEnd(34)}║`);
  console.log(`║   Gemini Live: ${String(GEMINI_API_KEY ? "READY (API key configured)" : "NOT CONFIGURED (no API key)").padEnd(35)}║`);
  console.log(`║   Audio: G.711 µ-law, 8kHz, 8-bit, 64kbps${" ".repeat(3)}║`);
  console.log(`║   Chunk: ${AUDIO_CHUNK_SIZE} bytes per 20ms${" ".repeat(24)}║`);
  console.log("╠══════════════════════════════════════════════════╣");
  console.log("║   Vobiz Events (inbound):                        ║");
  console.log("║   ← start, media, stop, dtmf, clearedAudio      ║");
  console.log("║   Vobiz Messages (outbound):                     ║");
  console.log("║   → playAudio, clearAudio, checkpoint            ║");
  console.log("║   DTMF: flat (digits) + nested (dtmf.digit)     ║");
  console.log("╠══════════════════════════════════════════════════╣");
  console.log("║   HTTP Endpoints:                                ║");
  console.log("║   GET  /              — Health check              ║");
  console.log("║   GET  /api/metrics   — WebSocket metrics         ║");
  console.log("║   GET  /api/sessions  — Active sessions           ║");
  console.log("║   GET  /api/sessions/:id — Session detail         ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log("");
  console.log(`🚀 Server running at http://0.0.0.0:${PORT}`);
  console.log(`📡 WebSocket upgrade handler active`);
  console.log("");
});

// ============================================================
// Graceful Shutdown
// ============================================================

function shutdown(signal: string): void {
  console.log(`\n🛑 Received ${signal}, shutting down WebSocket Bridge...`);

  // Close all active WebSocket connections
  for (const [streamId, session] of sessions) {
    // Clean up Gemini session
    if (session.geminiSession) {
      session.geminiSession.disconnect().catch(() => {});
      session.geminiSession = null;
    }

    if (session.ws.readyState === WebSocket.OPEN) {
      // Clear timers
      if (session.demoSilenceTimer) clearTimeout(session.demoSilenceTimer);
      if (session.demoResponseTimer) clearTimeout(session.demoResponseTimer);

      session.status = "ending";
      session.ws.close(1001, "Server shutting down");
      console.log(`🔌 [Shutdown] Closed stream ${streamId.slice(0, 8)}...`);
    }
  }

  // Close WebSocket server
  wss.close(() => {
    console.log("✅ WebSocket server closed");
  });

  // Close HTTP server
  server.close(() => {
    console.log("✅ HTTP server closed");
    console.log(`📊 Final stats: ${totalCallsHandled} calls handled, ${totalAudioBytesProcessed} bytes processed`);
    process.exit(0);
  });

  // Force exit after 5 seconds if graceful shutdown hangs
  setTimeout(() => {
    console.warn("⚠️ Forced shutdown after 5s timeout");
    process.exit(1);
  }, 5000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
