# VoiceAI SaaS - Coolify VPS Deployment Guide

## Complete Step-by-Step Guide (Hinglish + English)

---

## PART 1: VPS Setup & Coolify Installation

### Step 1: VPS Requirements

| Requirement | Minimum | Recommended |
|---|---|---|
| **CPU** | 2 cores | 4 cores |
| **RAM** | 4 GB | 8 GB |
| **Storage** | 40 GB SSD | 80 GB SSD |
| **OS** | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |
| **Domain** | 1 domain (e.g., voiceai.yourdomain.com) | Same |

> **VPS Providers** (India-friendly): Hostinger VPS, Contabo, Hetzner, DigitalOcean, AWS Lightsail
> **Cost**: ~$5-15/month (₹400-1200/month)

### Step 2: SSH into your VPS

```bash
ssh root@YOUR_VPS_IP
# ya phir
ssh ubuntu@YOUR_VPS_IP
```

### Step 3: Update System & Install Dependencies

```bash
# System update
sudo apt update && sudo apt upgrade -y

# Install curl, git, and basic tools
sudo apt install -y curl git wget nano ufw software-properties-common

# Install Docker (official method)
curl -fsSL https://get.docker.com | sudo sh

# Add current user to docker group (so you don't need sudo every time)
sudo usermod -aG docker $USER

# Apply group change (ya logout/login kar lo)
newgrp docker

# Verify Docker installed
docker --version
docker compose version
```

### Step 4: Install Coolify

```bash
# Coolify install (with SSH port - default 22, change if different)
# This will install Coolify + its own PostgreSQL + Redis
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash

# Agar SSH port alag hai (jaise 2222):
# curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash -s -- --ssh-port 2222
```

> **Installation time**: ~5-10 minutes depending on internet speed
> **Port**: Coolify will be available on port **8000**

### Step 5: Open Firewall Ports

```bash
# Allow required ports
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 80/tcp     # HTTP
sudo ufw allow 443/tcp    # HTTPS
sudo ufw allow 8000/tcp   # Coolify dashboard
sudo ufw allow 3000:3035/tcp  # App services (internal)

# Enable firewall
sudo ufw --force enable

# Check status
sudo ufw status
```

### Step 6: Access Coolify Dashboard

```
http://YOUR_VPS_IP:8000
```

**First-time setup:**
1. Create admin account (email + password)
2. Set your hostname (your domain or VPS IP)
3. Done! Coolify is ready.

---

## PART 2: DNS Configuration

### Step 7: Point Domain to VPS

Apne domain registrar (GoDaddy, Namecheap, Cloudflare, etc.) mein jao aur:

**A Record:**
```
Type: A
Name: @        (ya voiceai)
Value: YOUR_VPS_IP
TTL: 300
```

**CNAME Records (subdomains):**
```
Type: CNAME    Name: n8n          Value: yourdomain.com
Type: CNAME    Name: sip          Value: yourdomain.com
Type: CNAME    Name: orchestrator Value: yourdomain.com
Type: CNAME    Name: ws           Value: yourdomain.com
Type: CNAME    Name: simulator    Value: yourdomain.com
```

**Or use Wildcard:**
```
Type: A        Name: *            Value: YOUR_VPS_IP
```

> DNS propagation mein 10-30 minutes lag sakta hai.

---

## PART 3: Deploy VoiceAI Project on Coolify

### Step 8: Push Code to GitHub

```bash
# Apne local machine pe (Z.ai sandbox mein already done hai):
git remote add origin https://github.com/mahatosnehabala250-project/glm-voice-calling.git
git push -u origin main
```

### Step 9: Create Project in Coolify

1. **Coolify Dashboard** open karo → `http://YOUR_VPS_IP:8000`
2. Click **"Add New Project"**
3. Project name: `VoiceAI SaaS`
4. Click **"Add New Service"**
5. Select **"Public Repository"** ya **"Private Repository"**
6. Connect GitHub and select: `mahatosnehabala250-project/glm-voice-calling`
7. Branch: `main`

### Step 10: Configure Build Settings

Coolify mein service settings:

| Setting | Value |
|---|---|
| **Build Type** | Docker Compose |
| **Docker Compose Location** | `/` (root) |
| **Docker Compose File** | `docker-compose.yml` |
| **Nixpacks Builder** | OFF (hum Dockerfile use kar rahe) |

### Step 11: Set Environment Variables

Coolify mein **Service → Environment** section mein ye sab add karo:

```env
# === DATABASE (Supabase for production) ===
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres

# === SUPABASE ===
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# === GEMINI AI ===
GEMINI_API_KEY=AIzaSy...your-key
GEMINI_DEMO_MODE=false

# === VOBIZ SIP ===
VOBIZ_AUTH_ID=MA_GU1ZOXC3
VOBIZ_AUTH_TOKEN=your-token
VOBIZ_MOBILE_NO=+919XXXXXXXXX
VOBIZ_CREDENTIAL_ID=your-credential-id

# === JWT AUTH ===
JWT_SECRET=change-this-to-a-strong-random-string-64chars

# === APP CONFIG ===
NEXT_PUBLIC_APP_URL=https://voiceai.yourdomain.com
NEXT_PUBLIC_APP_NAME=VoiceAI

# === n8n ===
N8N_USERNAME=admin
N8N_PASSWORD=your-strong-password
N8N_WEBHOOK_BASE=https://n8n.voiceai.yourdomain.com

# === SERVICE URLs (Docker internal - coolify auto-manages these) ===
VOBIZ_SERVICE_URL=http://vobiz-sip:3031
GEMINI_SERVICE_URL=http://gemini-ai:3032
WS_BRIDGE_SERVICE_URL=http://ws-bridge:3033
MAIN_APP_URL=http://voiceai-app:3000
```

### Step 12: Configure Caddyfile for Production

VPS pe, project folder mein jaake Caddyfile update karo:

```bash
# SSH into VPS, then:
cd /data/coolify/services/your-project/

# Copy production Caddyfile
cp Caddyfile.prod Caddyfile

# Edit with your domain
nano Caddyfile

# Replace: voiceai.yourdomain.com → your actual domain
```

Ya Coolify mein **Volumes** section se Caddyfile mount kar sakte ho.

### Step 13: Deploy!

1. Coolify dashboard mein click **"Deploy"**
2. Wait for build (5-10 minutes first time)
3. Check logs for errors
4. All 8 services should show green (healthy)

### Step 14: Verify Deployment

```bash
# SSH into VPS
ssh root@YOUR_VPS_IP

# Check all containers running
docker ps

# Check service health
docker compose ps

# Test each service
curl https://voiceai.yourdomain.com/api/route           # Next.js app
curl https://voiceai.yourdomain.com:3031/                # Vobiz SIP
curl https://n8n.voiceai.yourdomain.com/healthz          # n8n
```

---

## PART 4: Post-Deployment Steps

### Step 15: Run Database Migrations

```bash
# SSH into VPS, then run inside voiceai-app container:
docker exec -it voiceai-app bunx prisma generate
docker exec -it voiceai-app bunx prisma db push
```

### Step 16: Setup n8n Workflows

1. Open `https://n8n.voiceai.yourdomain.com`
2. Login with N8N_USERNAME / N8N_PASSWORD
3. Import workflows from `/vobiz-docs-*.json` files
4. Configure webhook URLs in VoiceAI settings
5. Activate all workflows

### Step 17: Configure Vobiz SIP

1. Login to Vobiz dashboard
2. Set webhook URL: `https://sip.voiceai.yourdomain.com/api/vobiz/webhook`
3. Or use orchestrator: `https://orchestrator.voiceai.yourdomain.com/api/vobiz/webhook`
4. Test with a call

### Step 18: SSL/HTTPS (Automatic)

Caddy automatically handles SSL! Kuch karna nahi. 
- Domain pointing to VPS → Caddy auto-generates Let's Encrypt certificate.

---

## PART 5: Common Issues & Solutions

### Build Fails

```bash
# Check build logs in Coolify dashboard
# Or SSH in and build manually:
cd /data/coolify/services/your-project/
docker compose build --no-cache voiceai-app
```

### Container Restarting (OOM)

```bash
# Check container memory
docker stats

# Increase memory limit in Coolify:
# Service → Advanced → Memory Limit → 1G or 2G
```

### n8n Not Starting

```bash
# Check n8n logs
docker logs voiceai-n8n --tail=50

# Common fix: restart n8n
docker restart voiceai-n8n
```

### Port Already in Use

```bash
# Check what's using the port
sudo lsof -i :80
sudo lsof -i :443
sudo lsof -i :3000

# Stop conflicting service
sudo systemctl stop nginx   # if nginx installed
sudo systemctl disable nginx
```

### Health Check Failing

```bash
# Test manually
docker exec voiceai-app curl -f http://localhost:3000/api/route

# If curl not in container
docker exec voiceai-app wget -qO- http://localhost:3000/api/route
```

---

## Architecture Diagram

```
                    INTERNET
                       │
              ┌────────▼────────┐
              │   Caddy (443)   │  ← Auto HTTPS (Let's Encrypt)
              │   Reverse Proxy  │
              └────────┬────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
    ┌────▼────┐  ┌────▼────┐  ┌────▼────┐
    │  voiceai│  │   n8n   │  │vobiz-sip│
    │  -app   │  │  (5678) │  │  (3031) │
    │  (3000) │  └─────────┘  └─────────┘
    └────┬────┘
         │ voiceai-network (Docker bridge)
    ┌────┼────────────────────────┐
    │    │         │       │      │
┌───▼┐ ┌▼──────┐ ┌▼────┐ ┌▼───┐ ┌▼──────────┐
│gem │ │ws-    │ │call│ │sim-│ │  call-     │
│-ai │ │bridge │ │-orb│ │ulat│ │ orchestr-  │
│(32)│ │(3033) │ │(35)│ │(04)│ │  ator(35)  │
└────┘ └───────┘ └────┘ └────┘ └───────────┘

External APIs:
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Supabase │  │ Gemini   │  │ Vobiz    │
│ (DB)     │  │ (AI/STT) │  │ (SIP)    │
└──────────┘  └──────────┘  └──────────┘
```

---

## Quick Reference Commands

```bash
# ─── VPS Mein Jaake ───
ssh root@YOUR_VPS_IP

# ─── Coolify Status Check ───
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# ─── Logs Dekho ───
docker logs -f voiceai-app              # Next.js logs
docker logs -f voiceai-n8n              # n8n logs
docker logs -f call-orchestrator        # Orchestrator logs

# ─── Restart Kuch Service ───
docker restart voiceai-app
docker restart voiceai-n8n
docker compose restart voiceai-app

# ─── Full Restart ───
docker compose down && docker compose up -d

# ─── Database Migrate ───
docker exec voiceai-app bunx prisma db push

# ─── Backup Database ───
docker exec voiceai-app bunx prisma db push --force-reset

# ─── Coolify Update ───
curl -fsSL https://cdn.coollabs.io/coolify/update.sh | bash
```

---

## Cost Estimate (Monthly)

| Service | Provider | Cost |
|---|---|---|
| VPS (4GB RAM) | Hetzner/Contabo | $5-8 |
| Domain | Namecheap/Cloudflare | $1-2 |
| Supabase (Free) | Supabase | $0 |
| Gemini API | Google | $0-20 |
| Vobiz SIP | Vobiz | ₹999+ |
| **Total** | | **$6-30/month** |

> **Coolify is FREE** (self-hosted, open-source)
> No monthly platform fees like Vercel/Railway!

---

## Security Checklist

- [ ] Change default passwords (n8n, JWT_SECRET)
- [ ] Enable UFW firewall
- [ ] Set up SSH key authentication (disable password login)
- [ ] Enable automatic security updates
- [ ] Regular backups (Coolify has built-in backup)
- [ ] Monitor resource usage
- [ ] Keep Coolify updated
- [ ] Use Supabase RLS (Row Level Security)
- [ ] Don't expose mini-service ports publicly
- [ ] Use .env (never commit secrets to git)
