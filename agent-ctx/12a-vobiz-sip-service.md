# Task ID: 12-a — Vobiz SIP Integration Mini-Service

## Summary
Created a Vobiz SIP integration mini-service at `mini-services/vobiz-sip-service/` that connects to the Vobiz API for call management. The service runs on port 3031 with 6 API endpoints and gracefully falls back to mock data when Vobiz API is unreachable.

## Files Created
1. **mini-services/vobiz-sip-service/package.json** — Independent bun project with `bun --hot index.ts` dev script
2. **mini-services/vobiz-sip-service/index.ts** — ~430 lines, Bun.serve HTTP server with:
   - Health check endpoint
   - Make outbound call (with phone validation)
   - Real-time call status tracking
   - Inbound webhook receiver (returns TwiML XML)
   - Call history with pagination
   - End call functionality
   - Mock data fallback with simulated call progression
3. **src/app/api/vobiz/route.ts** — Next.js API proxy route that forwards requests to the mini-service

## Test Results
All 10 test cases passed:
- ✅ Health check
- ✅ Make call (with mock fallback)
- ✅ Call status
- ✅ Call history with pagination
- ✅ End call
- ✅ Webhook inbound (XML passthrough)
- ✅ Error: missing callSid
- ✅ Error: missing required fields
- ✅ Error: invalid phone format
- ✅ Error: unknown route

## Integration
- Proxy route at `/api/vobiz` handles all forwarding via action-based routing
- GET params: `action=health|call-status|call-history`
- POST body: `action=make-call|end-call|webhook-inbound`

## Notes
- Service uses `bun index.ts` (not `--hot`) for background stability
- Vobiz credentials loaded from environment variables
- All calls logged to console for debugging
