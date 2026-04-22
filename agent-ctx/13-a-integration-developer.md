---
Task ID: 13-a
Agent: Integration Developer
Task: Integrate AI Performance, Team Members, and Weekly Schedule into existing dashboards

Work Log:
- Read worklog.md to understand full project history (11 prior task cycles)
- Analyzed existing app-store.ts, page.tsx, sidebar.tsx, command-palette.tsx, client-settings.tsx
- Verified all 3 target components exist: ai-performance.tsx, team-members.tsx, weekly-schedule.tsx
- Confirmed WeeklySchedule and TeamMembers were already imported and used in client-settings.tsx (lines 10-11, 650-656)

**Task 1: Integrate AI Performance as 6th Admin Tab**
- Updated app-store.ts: Added `'ai-performance'` to AdminPage type union
- Updated page.tsx: Imported AIPerformance, added `case 'ai-performance': return <AIPerformance />;` in admin switch
- Updated page.tsx: Added `{ id: 'ai-performance' as const, label: 'AI', icon: Brain }` to adminMobileNav array
- Updated page.tsx: Added `'ai-performance'` to admin setCurrentPage type cast
- Updated sidebar.tsx: Added Brain import, added `{ id: 'ai-performance', label: 'AI Insights', icon: Brain }` to adminNav after Analytics

**Task 2: Integrate Team Members as 5th Client Tab**
- Updated app-store.ts: Added `'team'` to ClientPage type union
- Updated page.tsx: Imported TeamMembers, added `case 'team': return <TeamMembers />;` in client switch
- Updated page.tsx: Added `{ id: 'team' as const, label: 'Team', icon: Users }` to clientMobileNav array
- Updated page.tsx: Added `'team'` to client setCurrentPage type cast
- Updated sidebar.tsx: Added Users import, added `{ id: 'team', label: 'Team', icon: Users }` to clientNav after Settings

**Task 3: Verify Weekly Schedule Integration**
- Confirmed WeeklySchedule is already imported (line 10) and used (line 650) in client-settings.tsx
- Wrapped in motion.div with `variants={itemAnim}` and section labeled "Weekly Availability Calendar"
- Receives businessDays and businessHours props from form state

**Task 4: Update Command Palette**
- Updated command-palette.tsx: Added Brain and Users imports
- Added AI Insights command for admin: `{ id: 'nav-ai-performance', icon: Brain, label: 'Go to AI Insights', shortcut: 'G I' }`
- Added Team command for client: `{ id: 'nav-team', icon: Users, label: 'Go to Team', shortcut: 'G T' }`

Stage Summary:
- 5 files modified (app-store.ts, page.tsx, sidebar.tsx, command-palette.tsx; client-settings.tsx verified already integrated)
- ESLint: 0 errors (exit code 0)
- Dev server: compiles successfully (multiple ✓ Compiled in ~130-360ms)
- Admin tabs: 6 total (Overview, Clinics, Provisioning, Billing, Analytics, AI Insights)
- Client tabs: 5 total (Overview, Appointments, Call Logs, Settings, Team)
- Mobile nav updated for both roles
- Command palette updated with G I (admin) and G T (client) shortcuts
- All changes are purely additive with no breaking changes to existing logic
