# VoiceAI SaaS - Deployment Guide

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Environment Variables Checklist](#environment-variables-checklist)
- [Railway Deployment](#railway-deployment)
- [Coolify / VPS Deployment (Docker Compose)](#coolify--vps-deployment-docker-compose)
- [Service-to-Service Communication in Docker](#service-to-service-communication-in-docker)
- [Health Check Endpoints](#health-check-endpoints)
- [Troubleshooting](#troubleshooting)

---

## Architecture Overview

VoiceAI SaaS is a microservices platform with 6 Docker containers:

| Service | Container | Port | Description |
|---|---|---|---|
| **voiceai-app** | Next.js 16 | 3000 | Main web application, API routes, auth |
| **vobiz-sip** | Bun HTTP | 3031 | Vobiz SIP trunking integration for calls |
| **gemini-ai** | Bun HTTP | 3032 | Gemini AI chat, transcription, sentiment, summaries |
| **ws-bridge** | Bun HTTP + WS | 3033 | WebSocket bridge: Vobiz audio stream ↔ Gemini Live AI |
| **call-simulator** | Socket.IO | 3004 | Simulated call events for testing/demo |
| **call-orchestrator** | Bun HTTP | 3035 | Call flow orchestration: SIP + AI + n8n + DB |

All services share environment variables from a single `.env` file.

---

## Environment Variables Checklist

Copy `.env.example` to `.env` and fill in all values:

### Required for All Deployments

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | Database connection (Supabase for prod) | `postgresql://postgres:pass@db.xxx.supabase.co:5432/postgres` |
| `JWT_SECRET` | JSON Web Token secret (strong random string) | `your-64-char-random-string-here` |
| `NEXT_PUBLIC_APP_URL` | Public URL of your deployed app | `https://voiceai.yourdomain.com` |
| `NEXT_PUBLIC_APP_NAME` | Application name | `VoiceAI` |

### Required for AI Features

| Variable | Description | Example |
|---|---|---|
| `GEMINI_API_KEY` | Google Gemini API key | `AIzaSy...` |
| `GEMINI_DEMO_MODE` | Demo mode (mock responses when API unavailable) | `true` or `false` |

### Required for SIP / Phone Calls

| Variable | Description | Example |
|---|---|---|
| `VOBIZ_AUTH_ID` | Vobiz account auth ID | `MA_GU1ZOXC3` |
| `VOBIZ_AUTH_TOKEN` | Vobiz auth token | `your-token` |
| `VOBIZ_MOBILE_NO` | Your Vobiz phone number | `+919XXXXXXXXX` |
| `VOBIZ_CREDENTIAL_ID` | Vobiz SIP credential ID | `your-credential-id` |

### Required for Supabase Integration

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://your-project.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGci...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (admin access) | `eyJhbGci...` |

### Optional (WhatsApp, n8n, etc.)

| Variable | Description | Default |
|---|---|---|
| `WHATSAPP_API_KEY` | MSG91/Twilio WhatsApp API key | (empty) |
| `WHATSAPP_SENDER_ID` | WhatsApp sender ID | (empty) |
| `WS_BRIDGE_DEMO_MODE` | WS Bridge demo mode | `true` |
| `N8N_WEBHOOK_BASE` | n8n webhook base URL | (empty) |
| `N8N_WEBHOOK_BOOKING` | n8n booking webhook URL | (empty) |
| `N8N_WEBHOOK_ESCALATION` | n8n escalation webhook URL | (empty) |
| `N8N_WEBHOOK_CALL_SUMMARY` | n8n call summary webhook URL | (empty) |

---

## Railway Deployment

Railway auto-detects the `Dockerfile` at the project root and deploys the Next.js app. For a full multi-service deployment, create separate Railway services for each mini-service.

### Step 1: Deploy Main App

1. Push your code to GitHub (ensure `.env` is in `.gitignore`)
2. Go to [Railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select your repository
4. Railway will detect the `Dockerfile` and `railway.json`
5. Set environment variables in Railway dashboard → Variables tab
6. Deploy

### Step 2: Deploy Mini-Services (Each as Separate Railway Service)

For each mini-service, create a separate Railway service:

1. **vobiz-sip-service**: Set root directory to `mini-services/vobiz-sip-service` in Railway settings
2. **gemini-ai-service**: Set root directory to `mini-services/gemini-ai-service`
3. **ws-bridge**: Set root directory to `mini-services/ws-bridge`
4. **call-simulator**: Set root directory to `mini-services/call-simulator`
5. **call-orchestrator**: Set root directory to `mini-services/call-orchestrator`

Each service needs its own `railway.json` in its directory (or set build config in Railway UI).

### Step 3: Configure Internal Networking

Railway provides internal networking between services. Update the environment variables:

| Service | Environment Variable to Set |
|---|---|
| call-orchestrator | See note below about service URLs |

**Important**: The call-orchestrator has hardcoded `localhost` URLs for downstream services. For Railway deployment, you need to either:

1. **Add environment variable overrides** in the call-orchestrator code (recommended):
   ```typescript
   const VOBIZ_SERVICE = process.env.VOBIZ_SERVICE_URL || 'http://localhost:3031';
   const GEMINI_SERVICE = process.env.GEMINI_SERVICE_URL || 'http://localhost:3032';
   const WS_BRIDGE_SERVICE = process.env.WS_BRIDGE_SERVICE_URL || 'http://localhost:3033';
   const MAIN_APP = process.env.MAIN_APP_URL || 'http://localhost:3000';
   ```

2. **Set Railway internal service URLs** as environment variables:
   ```
   VOBIZ_SERVICE_URL=http://vobiz-sip.railway.internal:3031
   GEMINI_SERVICE_URL=http://gemini-ai.railway.internal:3032
   WS_BRIDGE_SERVICE_URL=http://ws-bridge.railway.internal:3033
   MAIN_APP_URL=http://voiceai-app.railway.internal:3000
   ```

### Railway CLI Alternative

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Deploy main app
railway up

# Deploy mini-services (from each directory)
cd mini-services/vobiz-sip-service && railway up
cd ../gemini-ai-service && railway up
cd ../ws-bridge && railway up
cd ../call-simulator && railway up
cd ../call-orchestrator && railway up
```

---

## Coolify / VPS Deployment (Docker Compose)

This is the recommended approach for a self-hosted VPS with Coolify or manual Docker Compose.

### Prerequisites

- A VPS with at least **4 CPU cores** and **4 GB RAM** (8 GB recommended)
- Docker and Docker Compose installed
- Domain name with DNS pointing to your VPS (optional, for HTTPS)

### Step 1: Clone & Configure

```bash
# Clone your repository
git clone https://github.com/your-org/voiceai-saas.git
cd voiceai-saas

# Copy environment file
cp .env.example .env

# Edit with your production values
nano .env
```

**Critical**: Set `DATABASE_URL` to your Supabase PostgreSQL connection string for production:

```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres
```

### Step 2: Build & Start

```bash
# Build all images
docker compose build

# Start all services (detached)
docker compose up -d

# View logs
docker compose logs -f

# Check service health
docker compose ps
```

### Step 3: Run Database Migrations

```bash
# Generate Prisma client and push schema
docker compose exec voiceai-app bunx prisma generate
docker compose exec voiceai-app bunx prisma db push
```

### Step 4: Verify All Services

```bash
# Health check all services
curl http://localhost:3000/api/route         # Next.js app
curl http://localhost:3031/                   # Vobiz SIP
curl http://localhost:3032/                   # Gemini AI
curl http://localhost:3033/                   # WS Bridge
curl http://localhost:3004/socket.io/?EIO=4&transport=polling  # Call Simulator
curl http://localhost:3035/                   # Call Orchestrator
```

### Step 5: Set Up Reverse Proxy (Caddy/Nginx)

**With Caddy (auto HTTPS):**

```
voiceai.yourdomain.com {
    reverse_proxy localhost:3000
}

# Optionally expose mini-service APIs
api.voiceai.yourdomain.com {
    reverse_proxy localhost:3000
}
```

**With Nginx:**

```nginx
server {
    listen 80;
    server_name voiceai.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Useful Docker Compose Commands

```bash
# Restart a specific service
docker compose restart voiceai-app

# View logs for one service
docker compose logs -f gemini-ai

# Rebuild after code changes
docker compose build --no-cache voiceai-app
docker compose up -d voiceai-app

# Stop everything
docker compose down

# Stop and remove volumes (resets database)
docker compose down -v

# Scale a service
docker compose up -d --scale call-simulator=2
```

### Coolify-Specific Setup

If using Coolify:

1. Create a new project in Coolify
2. Add a "Docker Compose" service
3. Point it to your repository
4. Set the build path to root
5. Add your `.env` variables in Coolify's environment section
6. Deploy

---

## Service-to-Service Communication in Docker

### Current State

The call-orchestrator uses hardcoded `localhost` URLs:

```typescript
const VOBIZ_SERVICE = 'http://localhost:3031';
const GEMINI_SERVICE = 'http://localhost:3032';
const WS_BRIDGE_SERVICE = 'http://localhost:3033';
const MAIN_APP = 'http://localhost:3000';
```

### For Docker Compose (Bridge Network)

In Docker Compose with a bridge network, containers reference each other by **service name**. To make this work, you have two options:

**Option A: Use `network_mode: host` (Linux only)**
```yaml
services:
  call-orchestrator:
    network_mode: host
```
This makes all containers share the host's network, so `localhost` works as-is.

**Option B: Add env var overrides (Recommended)**
Update the call-orchestrator to read from environment variables:

```typescript
const VOBIZ_SERVICE = process.env.VOBIZ_SERVICE_URL || 'http://localhost:3031';
const GEMINI_SERVICE = process.env.GEMINI_SERVICE_URL || 'http://localhost:3032';
const WS_BRIDGE_SERVICE = process.env.WS_BRIDGE_SERVICE_URL || 'http://localhost:3033';
const MAIN_APP = process.env.MAIN_APP_URL || 'http://localhost:3000';
```

Then in `docker-compose.yml`:
```yaml
call-orchestrator:
  environment:
    - VOBIZ_SERVICE_URL=http://vobiz-sip:3031
    - GEMINI_SERVICE_URL=http://gemini-ai:3032
    - WS_BRIDGE_SERVICE_URL=http://ws-bridge:3033
    - MAIN_APP_URL=http://voiceai-app:3000
```

---

## Health Check Endpoints

Each service exposes a health check endpoint:

| Service | Endpoint | Response |
|---|---|---|
| voiceai-app | `GET /api/route` | JSON status |
| vobiz-sip | `GET /` | Service info with uptime |
| gemini-ai | `GET /` | Model info, demo mode status |
| ws-bridge | `GET /` | Active calls, audio stats |
| call-simulator | `GET /socket.io/?EIO=4&transport=polling` | Socket.IO handshake |
| call-orchestrator | `GET /` | Service status, active sessions |

---

## Troubleshooting

### Build Failures

```bash
# Check build logs
docker compose build voiceai-app 2>&1 | tail -50

# Common fix: clear Docker cache
docker builder prune -f
docker compose build --no-cache
```

### Service Won't Start

```bash
# Check logs
docker compose logs voiceai-app --tail=100

# Check if port is in use
ss -tlnp | grep -E '3000|3031|3032|3033|3004|3035'

# Check resource usage
docker stats
```

### Health Check Failing

```bash
# Test health endpoint manually
docker compose exec voiceai-app curl -f http://localhost:3000/api/route

# If curl is not installed in the container
docker compose exec voiceai-app wget -qO- http://localhost:3000/api/route
```

### Database Connection Issues

```bash
# Test Supabase connectivity
docker compose exec voiceai-app bun -e "
const url = process.env.DATABASE_URL;
console.log('DB URL prefix:', url?.substring(0, 30));
"

# Reset local SQLite database
docker compose down -v
docker compose up -d
docker compose exec voiceai-app bunx prisma db push
```

### Memory Issues

If containers are getting OOM killed:

```bash
# Check container restart counts
docker compose ps

# Increase memory limits in docker-compose.yml
deploy:
  resources:
    limits:
      memory: 1G  # Increase from 512M
```

---

## Quick Reference

```bash
# Full deployment from scratch
git pull origin main
cp .env.example .env && nano .env
docker compose build
docker compose up -d
docker compose exec voiceai-app bunx prisma db push
docker compose ps  # Verify all healthy

# Update after code change
git pull origin main
docker compose build voiceai-app
docker compose up -d voiceai-app

# Emergency: Full restart
docker compose down && docker compose up -d
```
