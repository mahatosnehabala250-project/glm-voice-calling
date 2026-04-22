---
Task ID: 6-a
Agent: Feature Developer
Task: Build Webhook Configuration UI & Event Log Dashboard

Work Log:
- Read worklog.md to understand full project history (17+ task cycles, ~31,000 lines)
- Analyzed existing API routes: /api/admin/webhooks (GET/POST/DELETE), /api/admin/webhook-events (GET), /api/admin/agent-config
- Analyzed existing Prisma schema: AgentConfig (n8nWebhookUrl, n8nWebhookSecret), WebhookEvent (21 fields)
- Analyzed app-store.ts AdminPage type, sidebar.tsx navigation sections, page.tsx routing

**Files Created:**
1. `src/components/admin/webhook-dashboard.tsx` (~620 lines) - Comprehensive webhook management dashboard with:
   - **Stats Cards** (4x): Webhooks Configured, Successful (7d), Failed (7d), Avg Response Time - each with gradient top lines, icons, and real data
   - **Configuration Tab**: Expandable clinic cards showing webhook URL (masked), secret (masked), status. Inline edit mode with save/cancel. Copy URL/secret buttons. Test webhook button per clinic
   - **Event Log Tab**: Full-featured delivery log with:
     - Filters: search bar, clinic dropdown, event type dropdown, status dropdown
     - Desktop table with 9 columns (expand chevron, timestamp, clinic, event type badge, URL, status badge, status code, retries, retry action)
     - Mobile card layout with responsive design
     - Expandable row detail with JSON syntax-highlighted request payload and response body (custom JsonHighlighter component with color-coded keys/values/numbers/booleans/nulls)
     - Pagination (previous/next)
     - Retry failed webhook button
   - **Event Types Tab**: 8 event types with icons and toggle switches (appointment_created, confirmed, cancelled, missed_call, escalation, call_completed, payment_received, ai_alert). Per-clinic event type configuration section
   - Framer Motion entrance animations (container/item stagger pattern)
   - Emerald/teal color scheme throughout, dark mode compatible
   - Toast notifications via sonner for all actions

**Files Modified:**
2. `src/stores/app-store.ts` - Added 'webhooks' to AdminPage type union
3. `src/components/shared/sidebar.tsx` - Added Webhook icon import and 'webhooks' nav item in CONFIGURATION section
4. `src/app/page.tsx` - Added WebhookDashboard import, WebhookIcon import, case 'webhooks' routing, URL param validation, page title, mobile nav entry
5. `src/components/shared/header.tsx` - Added 'webhooks': 'Webhooks' to pageTitles
6. `src/app/api/admin/webhook-events/route.ts` - Enhanced with:
   - Date range filtering (startDate, endDate query params)
   - POST handler for manual webhook retry (action=retry&eventId=xxx)
   - Proper error handling, status codes, and response format
7. `prisma/seed.ts` - Added:
   - n8n webhook URLs and secrets for 4 clinics (Sharma Dental, Agarwal Eye, Patel Skin, Reddy Orthopedic)
   - 22 webhook event seed records across all 4 clinics with various event types (appointment_created, confirmed, cancelled, missed_call, escalation, call_completed, payment_received, ai_alert)
   - Mix of successful (18) and failed (4) events with realistic payloads, response bodies, status codes, and retry counts

Stage Summary:
- 1 new component created (webhook-dashboard.tsx, ~620 lines)
- 7 existing files modified (app-store, sidebar, page.tsx, header, webhook-events API, seed.ts)
- 4 clinics configured with n8n webhook URLs
- 22 webhook event records seeded for demo data
- ESLint: 0 errors
- Dev server: compiles successfully, all routes return 200
- Total admin tabs now: 16 (includes new Webhooks tab)
