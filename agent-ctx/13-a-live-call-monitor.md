# Task ID: 13-a — Live Call Monitor Component

## Work Summary
Created `src/components/admin/live-call-monitor.tsx` (~520 lines) — a rich real-time call monitoring dashboard for the VoiceAI admin panel.

### Files Created
- `src/components/admin/live-call-monitor.tsx` — Main component

### Files Modified
- `src/stores/app-store.ts` — Added 'live-calls' to AdminPage type
- `src/components/shared/sidebar.tsx` — Added PhoneCall nav item
- `src/app/page.tsx` — Added LiveCallMonitor import and switch case

### Features
1. Header with pulsing green dot, SIP connection status, active call counter, Make Test Call button
2. Call Statistics Bar with 5 responsive stat cards
3. Active Calls Grid (2-col desktop, 1-col mobile) with live duration, waveform, transcript, sentiment
4. Recent Calls Timeline with color-coded borders
5. Mock call simulation with state transitions

### Verification
- ESLint: 0 errors
- Dev server: compiles successfully
- Total admin tabs: 7
