# VoiceAI SaaS Platform — QA Test Report (Round 15)
**Date:** 2026-04-19  
**Environment:** http://localhost:3000  
**Tester:** Automated QA Agent  
**Screenshots:** `/home/z/my-project/qa-screenshots/`

---

## Executive Summary

- **Total Tabs Tested:** 19 (10 admin + 9 client)
- **JS Errors:** 0
- **Bugs Found:** 8 (2 Critical, 3 High, 3 Low)
- **Overall Score:** 7.2 / 10

---

## BUGS FOUND

### 🔴 CRITICAL

| # | Bug | Location | Details |
|---|-----|----------|---------|
| C1 | **Sign Out button does not work** | Admin & Client sidebar | Clicking "Sign Out" briefly flashes "Loading VoiceAI" then reloads the same dashboard. User remains logged in. Auth state is never cleared. Workaround: manually clear localStorage/sessionStorage. |
| C2 | **WhatsApp tab renders wrong page** | Client sidebar → WhatsApp | Clicking "WhatsApp" shows the **Overview** dashboard content instead of any WhatsApp-specific UI. The tab appears to have no dedicated route/page — it just falls back to Overview. |

### 🟠 HIGH

| # | Bug | Location | Details |
|---|-----|----------|---------|
| H1 | **Doctor Portal shows wrong user identity** | Client → Doctor Portal | Shows "Neha Sharma" as a "Dental Surgeon" with "15+ years experience" and "4.8 (127 reviews)". Neha is the receptionist, not a doctor. Should show Dr. Rajesh Sharma's profile. |
| H2 | **Schedule tab shows 0 appointments** | Client → Schedule | Weekly Schedule for "13 Apr — 18 Apr 2026" shows "0 appointments / 0 confirmed" even though there are appointments on 17/04 (Anita Kumari, Rohit Mehra, Vikram Singh). The data exists in Appointments but is not reflected in Schedule. |
| H3 | **Overview greeting calls receptionist "Dr."** | Client → Overview | Heading reads "Good Morning, **Dr.** Neha Sharma!" — Neha Sharma is a receptionist, not a doctor. The "Dr." prefix is incorrectly applied. |

### 🟡 LOW

| # | Bug | Location | Details |
|---|-----|----------|---------|
| L1 | **Duplicate "Dr." in AI Agent Preview** | Client → Settings → AI Config | Preview shows "Dr. **Dr.** Rajesh Sharma ki clinic se" — "Dr." is duplicated. |
| L2 | **Booking Conversion Funnel shows impossible percentages** | Admin → Analytics | Funnel shows "-500%" and "-250%" between stages, and "Overall conversion: 140%" (over 100%). The funnel math is broken. |
| L3 | **Page header doesn't update for some tabs** | Admin → Live Calls, Integrations, Notifications, Reports | Header stays as generic "Dashboard" instead of showing the tab-specific title (e.g., "Live Calls", "Integrations"). The page `<main>` heading is correct, but the top banner is wrong. |

---

## TAB-BY-TAB SCORES

### ADMIN PANEL (admin@voiceai.in)

| Tab | Score (1-10) | Screenshot | Notes |
|-----|:---:|---|---|
| **Overview** | **8/10** | 02-admin-overview.png | Rich data: cards, charts, activity feed, clinic table, leaderboard. "AI Performance Insights" section is duplicated (also its own tab). Missing: header says "Platform Overview" ✓ but footer shows API Server "Operational" while Integrations page says "Disconnected". |
| **Clinics** | **9/10** | 03-admin-clinics.png | Excellent table with search, filter, Add Clinic, Export, action buttons per row. All 5 clinics shown with correct data. Minor: icon-only action buttons (no tooltips visible in a11y tree). |
| **Provisioning** | **8/10** | 04-admin-provisioning.png | Clean SIP number management. 10 numbers listed with correct statuses (Available/Assigned/Offline). Assign dropdowns present. |
| **Billing** | **9/10** | 05-admin-billing.png | Comprehensive: revenue summary, MRR trend chart, plan distribution donut, subscriptions table, invoices table with filters, payment history. Very polished. |
| **Analytics** | **6/10** | 06-admin-analytics.png | Good charts (call volume, peak hours, clinic comparison, intent distribution, leaderboard). **BUG:** Conversion funnel shows impossible math (-500%, -250%, 140%). Trend column in leaderboard is empty. |
| **AI Insights** | **8/10** | 07-admin-ai-insights.png | Detailed AI metrics: booking rate, response time, intent accuracy, call completion, satisfaction, escalation. Intent breakdown, completion rate chart, agent health, language distribution, conversation topics, response time trend. Good depth. |
| **Live Calls** | **9/10** | 08-admin-live-calls.png | Impressive live call monitoring with 4 active calls showing live transcripts (Hinglish/Hindi), caller details, sentiment, Transfer/End Call buttons. Recent calls list with 10 entries. Minor: "SIP Disconnected" badge contradicts "2 live" calls. |
| **Integrations** | **8/10** | 09-admin-integrations.png | Vobiz SIP, Gemini AI, Supabase DB configs with credentials, test buttons, API keys management, webhook config with event log. Vobiz shows "Disconnected", Gemini shows "Error". Webhook URL is localhost (expected for dev). |
| **Notifications** | **8/10** | 10-admin-notifications.png | 6 notifications with timeline, category filters (All/System/Alerts/Billing/Booking), Mark All Read button. Good content variety. |
| **Reports** | **8/10** | 11-admin-reports.png | 4 report templates with descriptions, date range picker, recent reports table. Generate buttons present. Clean and functional. |

### CLIENT PANEL (receptionist@sharma-dental.in)

| Tab | Score (1-10) | Screenshot | Notes |
|-----|:---:|---|---|
| **Overview** | **7/10** | 13-client-overview.png | Good dashboard with greeting (wrong "Dr." prefix), KPIs, quick actions, recent activity, upcoming appointments, recent calls, AI performance cards, charts. Buttons like "Call Back" and "Check Availability" present but no testing of actual functionality. |
| **Appointments** | **9/10** | 14-client-appointments.png | Excellent table: 5 appointments with patient, phone, date, time, reason, status, actions (View/Confirm/Cancel). Search, status filter, New Booking, Export CSV all present. "Showing 5 of 5" correct. |
| **Schedule** | **4/10** | 15-client-schedule.png | Calendar UI present but **shows 0 appointments** for the week despite data existing. Navigation arrows and Today button present. This is a data-loading bug. |
| **Call Logs** | **9/10** | 16-client-call-logs.png | Comprehensive: KPI cards (total calls, answered rate, avg duration, booking rate, sentiment), table with 4 calls showing caller, time, duration, status, intent, tags, sentiment, transcript button. Export CSV. |
| **Analytics** | **8/10** | 17-client-analytics.png | Good charts: call volume trend, appointment status donut, intent distribution, sentiment analysis, peak hours, weekly performance table. Data appears consistent. |
| **Team** | **8/10** | 18-client-team.png | 4 team members shown with roles, permissions, contact info, online status. Add Team Member button. Clean card layout. |
| **Settings** | **8/10** | 19-client-settings.png | Very comprehensive: clinic info form, business hours, services management, fee input, AI config (language, greeting, preview with mock phone), escalation settings, weekly schedule, team members. Bug: "Dr. Dr." duplication in preview. |
| **AI Chat** | **7/10** | 20-22-client-ai-chat.png | Chat interface with welcome message, capability list, quick action buttons. **Responds to "hello"** with a helpful menu (offline/local mode). Send button stays disabled even when text is typed (Enter key works). "Offline — using local responses" indicator. |
| **Doctor Portal** | **5/10** | 23-client-doctor-portal.png | Shows receptionist profile as doctor (wrong identity). Has today's schedule, weekly performance chart (only Mon-Wed), patient reviews with ratings, quick action buttons. Weekly chart incomplete. |
| **WhatsApp** | **1/10** | 24-client-whatsapp.png | **Entirely broken.** Renders the Overview page content instead of any WhatsApp UI. No WhatsApp messaging, template management, or analytics. |

---

## ADDITIONAL OBSERVATIONS

1. **No JS errors anywhere** — Clean console across all pages (only HMR logs in dev mode).
2. **Consistent footer** — Shows version v1.2.0, API Server/Gemini AI/SIP Trunk status across all pages. ✓
3. **Notification panel** — Present but content not deeply tested (badge shows "3" notifications).
4. **Search bar** — Present in all pages but only visual; not tested for actual search functionality.
5. **Dark mode** — Not tested (light mode default).
6. **Mobile responsiveness** — Not tested in this round (screenshots from earlier QA rounds exist).
7. **"AI Insights" vs "AI Performance"** — Task asked for "AI Performance" tab; the actual tab is named "AI Insights". Page heading says "AI Performance Dashboard" but sidebar says "AI Insights". Minor naming inconsistency.
8. **"Calls" vs "Call Logs"** — Task asked for "Calls" tab; client sidebar has "Call Logs" instead.
9. **Missing "WhatsApp" in task spec** — Client has a WhatsApp tab (10th) not listed in original task.

---

## TOP PRIORITY FIXES

1. **Fix Sign Out** — Clear auth cookies/localStorage properly on sign out. This is a critical auth bug.
2. **Fix WhatsApp tab** — Either implement a WhatsApp management page or remove the broken tab from the sidebar.
3. **Fix Doctor Portal identity** — Should show the actual doctor's profile (Dr. Rajesh Sharma), not the logged-in receptionist.
4. **Fix Schedule data loading** — Appointments exist in the system but aren't shown in the weekly schedule view.
5. **Fix greeting title** — Don't prefix receptionist users with "Dr."
6. **Fix "Dr. Dr." duplication** — In Settings AI Agent Preview greeting text.
7. **Fix Analytics funnel math** — Prevent negative percentages and >100% overall conversion.

---

## SCORE SUMMARY

| Category | Score |
|----------|:-----:|
| Login/Auth | 5/10 (Sign Out broken) |
| Admin Panel | 8.1/10 (avg across 10 tabs) |
| Client Panel | 6.9/10 (avg across 10 tabs, WhatsApp drags it down) |
| Data Integrity | 6/10 (funnel math, schedule empty, wrong identities) |
| UI/UX Polish | 8/10 |
| Error-Free | 10/10 (zero JS errors) |
| **OVERALL** | **7.2/10** |
