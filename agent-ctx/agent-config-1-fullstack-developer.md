---
Task ID: agent-config-1
Agent: Full-Stack Developer
Task: Build comprehensive per-clinic AI Agent configuration system

Work Log:
- Read worklog.md to understand full project history and existing patterns
- Updated Prisma schema with AgentConfig model (40+ fields): Vobiz integration, webhooks, calendar, knowledge base, voice, booking, escalation, agent status, performance stats
- Added agentConfig relation to Clinic model with onDelete: Cascade
- Pushed schema to SQLite database with bun run db:push
- Created GET/POST /api/admin/agent-config - list all configs with clinic info, create new config
- Created GET/PUT/DELETE /api/admin/agent-config/[id] - get/update/delete single config
- Created GET/PUT /api/client/agent-config - client-only GET (auto-creates draft) and PUT (restricted to safe fields)
- Built Admin Agent Setup page (admin-agent-setup.tsx) with 7 tabbed configuration tabs
- Built Client Agent Studio page (agent-studio.tsx) with 5 configuration sections and live test
- Updated app-store.ts, sidebar.tsx, page.tsx for new navigation entries
- ESLint passes with 0 errors, dev server compiles successfully

Stage Summary:
- Per-clinic agent configuration system fully implemented
- Admin: Vobiz, webhooks, calendar, voice, booking, escalation per clinic
- Client: knowledge base, AI personality, booking flow, escalation rules
- Both pages have live preview and test capabilities
