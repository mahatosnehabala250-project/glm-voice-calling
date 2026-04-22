# Task ID: 2 — WebSocket Bridge Service for Real-Time Voice AI

## Agent: Integration Developer

## Work Log

- Read worklog.md to understand full project history (10+ task cycles, ~18,000+ lines of code)
- Analyzed existing mini-service patterns (gemini-ai-service on port 3032, vobiz-sip-service on port 3031)
- Created `mini-services/ws-bridge/package.json` — independent bun project with `ws@^8.18.0` dependency
- Created `mini-services/ws-bridge/index.ts` (~930 lines) with:

### Core Architecture
- **Node.js http.createServer** for HTTP server on port 3033
- **ws WebSocketServer** for WebSocket upgrade handling (auto-attached via `{ server }` constructor)
- **Map<streamId, CallSession>** for tracking active call sessions
- **CORS headers** on all HTTP responses
- **Graceful shutdown** on SIGTERM/SIGINT with connection cleanup
- **Uncaught exception/rejection handlers** for process stability

### Vobiz Stream Protocol Support
- Handles all 5 Vobiz event types: `start`, `media`, `stop`, `dtmf`, `clearedAudio`
- Sends `playAudio` events back to Vobiz with base64-encoded µ-law audio
- Tracks call state, media chunks, audio bytes, DTMF digits, and transcript

### Audio Utilities
- `mulawToPcm()` — Convert G.711 µ-law buffer to 16-bit PCM (little-endian)
- `pcmToMulaw()` — Convert 16-bit PCM buffer to G.711 µ-law
- `generateSilenceMs()` — Generate silence in µ-law format (0xFF bytes)
- `base64Encode()` — Base64 encode for WebSocket payload
- `generateSimulatedSpeechMs()` — Generate sine-wave speech pattern for demo mode
- Full ITU-T G.711 µ-law encode/decode implementation with lookup table (256 entries)

### Demo Mode (ON by default)
- State machine: GREETING → LISTENING → PROCESSING → RESPONDING → IDLE
- Auto-sends greeting 300ms after connection starts
- Listens for ~120ms of audio (6+ chunks) before triggering response
- 2-second silence detection for end-of-speech
- 500ms processing delay to simulate AI thinking
- Simulated Hinglish greetings, responses, and farewells
- Full transcript tracking (patient audio + AI responses with timestamps)

### HTTP Endpoints
- `GET /` — Health check with active calls, uptime, audio format info
- `GET /api/metrics` — Active sessions, total calls, audio bytes processed
- `GET /api/sessions` — List all active WebSocket sessions
- `GET /api/sessions/:streamId` — Session detail with full transcript

### Logging
- Color-coded console logs with emoji indicators
- 🔌 for connections, 📞 for calls, 🔊 for audio, 🔑 for DTMF, ⏹️ for disconnections
- Every 50th media event logged to avoid spam
- Startup banner with service info and protocol details

### Issues Encountered and Resolved
- **Duplicate upgrade handler crash**: Initially added `server.on("upgrade", ...)` for manual WebSocket upgrade handling, but the `WebSocketServer({ server })` constructor already attaches its own upgrade listener. The `import("stream").Duplex` type annotation in the manual handler caused silent runtime crashes in bun. Fix: removed the redundant handler entirely.
- **Background process stability**: `bun --hot` in background with `nohup` required `< /dev/null` stdin redirection to prevent stdin-EOF crashes.
- **Process keepalive**: Added `setInterval` for WebSocket ping/keepalive and uncaught exception handlers.

## Verification
- All 4 HTTP endpoints tested successfully:
  - `GET /` → 200 with full service info
  - `GET /api/metrics` → 200 with zero-state metrics
  - `GET /api/sessions` → 200 with empty array (no active calls)
  - `GET /api/sessions/test-id` → 404 with error message
- ESLint: 0 errors
- Service running stably on port 3033 with `bun run dev` (`--hot` for development)

## Stage Summary
- 2 new files created (ws-bridge/package.json, ws-bridge/index.ts)
- Mini-service running on port 3033 with WebSocket + HTTP support
- Full G.711 µ-law audio conversion (encode + decode)
- Demo mode simulates complete AI conversation flow
- Vobiz Stream protocol fully implemented (5 inbound events, 1 outbound event)
- Session tracking with transcript, DTMF, and audio metrics
- CORS enabled for cross-origin requests
- ESLint: 0 errors
