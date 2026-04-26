# 🚀 VoiceAI SaaS — Hostinger VPS Deployment Guide

## Complete Step-by-Step Guide (Hinglish) — Video Tutorial Style ✨

> **Hey guys! 👋** Aaj hum VoiceAI SaaS ko Hostinger VPS pe deploy karenge.
> Ye guide bilkul beginner-friendly hai — chaahe tum Docker ka newbie ho ya pro,
> follow karo step-by-step aur 35 mins mein production pe live ho jaao! 🔥
>
> **Total Time**: ~35 minutes | **Cost**: ₹499/mo (KVM 2 plan)
> **Difficulty**: 🟢 Easy — Just copy-paste commands!

---

## 📋 Table of Contents

| # | Section | Time |
|---|---------|------|
| 1 | [VPS Setup & Docker Install](#part-1--hostinger-vps-setup--15-mins) | 15 mins |
| 2 | [Domain DNS Configuration](#part-2--domain-setup--5-mins) | 5 mins |
| 3 | [Clone & Configure Project](#part-3--clone--configure--10-mins) | 10 mins |
| 4 | [Deploy with Docker Compose](#part-4--deploy-with-docker-compose--5-mins) | 5 mins |
| 5 | [Caddy SSL Setup (Auto)](#part-5--caddy-ssl-setup-auto) | ~2 mins |
| 6 | [Post-Deploy Checklist](#part-6--post-deploy-checklist) | 5 mins |
| 7 | [Useful Commands Cheat Sheet](#part-7--useful-commands--cheat-sheet) | Bookmark! ⭐ |
| 8 | [Troubleshooting](#part-8--troubleshooting--常见问题) | When needed |

---

## 💰 Hostinger VPS Plan Comparison

> **Sabse pehle plan choose karo** — VoiceAI ke 8 Docker services chalane ke liye
> minimum 8GB RAM chahiye (Next.js + n8n + Gemini + Orchestrator sab memory khaate hain).

| Plan | RAM | CPU | Storage | Price | For VoiceAI |
|------|-----|-----|---------|-------|-------------|
| **KVM 1** | 4GB | 2 vCPU | 50GB NVMe | ₹249/mo | ❌ Testing only — OOM hoga |
| **KVM 2** | 8GB | 4 vCPU | 100GB NVMe | ₹499/mo | ✅ **Production — Recommended!** |
| **KVM 4** | 16GB | 6 vCPU | 200GB NVMe | ₹999/mo | 🔥 Scale karne pe |

> 💡 **Pro Tip**: Agar KVM 1 le rahe ho testing ke liye, toh swap add karna zaroori hai
> (Part 1, Step 6 mein bataya hai). But seriously, KVM 2 le lo — paisa vasool! 🙌

---

## PART 1: 🖥️ Hostinger VPS Setup (~15 mins)

### Step 1: Buy Hostinger VPS

1. [Hostinger VPS](https://www.hostinger.in/vps-hosting) pe jao
2. **KVM 2** plan select karo (8GB RAM, 4 vCPU, 100GB NVMe — ₹499/mo)
3. OS select karo: **Ubuntu 22.04 LTS** (recommended) ya **Ubuntu 24.04 LTS**
4. Server location: **Mumbai** (India ke liye sabse fast) ya **Singapore**
5. SSH key add karo (optional but recommended — more secure)
6. Buy & wait 2-3 minutes for provisioning

> ⚠️ **Important**: Hostinger ke andar "hPanel" mein VPS IP address milega.
> Usi IP se SSH karna hai. Note kar lo! 📝

### Step 2: SSH into VPS

Terminal open karo (ya PuTTY for Windows) aur:

```bash
# Apna VPS IP replace karo
ssh root@YOUR_VPS_IP

# Hostinger default password hPanel mein milega
# First login pe password change karne ko bolegi
```

✅ **Success sign**: `root@vps-xxxxx:~#` type ka prompt dikhna chahiye.

### Step 3: System Update

```bash
# Pehle system update karo — bas copy-paste karo 😎
apt update && apt upgrade -y
```

Ye ~1-2 min lagega depending on packages. Just wait.

### Step 4: Install Docker + Docker Compose

Docker install karna hai — ye container platform hai jisme humara pura VoiceAI chalenga:

```bash
# Docker install (official method — sabse reliable)
curl -fsSL https://get.docker.com | sh

# Docker service start aur enable (boot pe auto-start)
systemctl start docker
systemctl enable docker

# Verify installation
docker --version
# Expected: Docker version 27.x.x

docker compose version
# Expected: Docker Compose version v2.x.x
```

> ✅ Docker Compose already Docker ke andar built-in aata hai v2 se.
> Koi alag install karne ki zaroorat nahi!

### Step 5: Install Git

```bash
apt install git -y

# Verify
git --version
# Expected: git version 2.x.x
```

### Step 6: Install Other Useful Tools

```bash
apt install -y curl wget nano ufw htop
```

- `nano` → File editor (simple sa, notepad jaisa)
- `ufw` → Firewall (security ke liye)
- `htop` → Resource monitor (RAM/CPU dekhne ke liye)

### Step 7: Setup Firewall

```bash
# Required ports allow karo
ufw allow 22/tcp      # SSH (apne IP se hi better hai)
ufw allow 80/tcp      # HTTP (Caddy ke liye)
ufw allow 443/tcp     # HTTPS (Caddy ke liye)
ufw allow 443/udp     # HTTP/3 (Caddy optional)

# Firewall enable karo
ufw --force enable

# Status check
ufw status
```

> ⚠️ **Warning**: Port 22 (SSH) ko disable mat karna! Warna VPS se lock-out ho jaoge!
> Agar alag SSH port use karte ho toh woh allow karo.

### Step 8: Create Swap (For 4GB RAM VPS — KVM 1)

> Agar KVM 2 (8GB) liya hai toh ye step **skip** kar sakte ho.
> But KVM 1 (4GB) waalon ke liye ye **must** hai — warna OOM (Out of Memory) error aayega!

```bash
# 4GB swap file create karo
fallocate -l 4G /swapfile

# Permissions set karo (security)
chmod 600 /swapfile

# Swap format karo
mkswap /swapfile

# Swap enable karo
swapon /swapfile

# Permanent banao (restart pe bhi rahega)
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Verify
free -h
# Swap row mein 4G dikhna chahiye ✅
```

🎉 **PART 1 DONE!** VPS ready hai Docker ke saath. Ab domain setup karte hain!

---

## PART 2: 🌐 Domain Setup (~5 mins)

### Step 1: Buy Domain

Domain kahi se bhi le sakte ho:

| Provider | .in Domain | .com Domain | DNS Speed |
|----------|-----------|-------------|-----------|
| **Hostinger** | ~₹49/yr | ~₹699/yr | Fast (same VPS) |
| **Namecheap** | ~₹500/yr | ~₹600/yr | Fast |
| **Cloudflare** | ~₹700/yr | ~₹600/yr | Fastest |

> 💡 **Pro Tip**: Agar Hostinger se VPS liya hai toh domain bhi wahi se le lo —
> DNS propagation fastest hogi (same network).

### Step 2: DNS A Record (Main Domain)

Apne domain registrar ke DNS settings mein jao aur:

```
Type:  A
Name:  @
Value: YOUR_VPS_IP
TTL:   300 (ya Auto)
```

**Example**: Agar domain `voiceai.in` hai aur VPS IP `185.232.65.123`:

```
Type:  A
Name:  @
Value: 185.232.65.123
```

### Step 3: DNS Wildcard Record (Subdomains)

> Ye ek record se SABHI subdomains (n8n, sip, ws, etc.) VPS pe point ho jaayenge!

```
Type:  A
Name:  *
Value: YOUR_VPS_IP
TTL:   300
```

**What this does**:
- `voiceai.in` → VPS ✅
- `n8n.voiceai.in` → VPS ✅
- `sip.voiceai.in` → VPS ✅
- `ws.voiceai.in` → VPS ✅
- `anything.voiceai.in` → VPS ✅

> ⚠️ **Important**: DNS propagation mein 5-30 minutes lag sakta hai.
> Check karo: `dig voiceai.in +short` — apna VPS IP dikhna chahiye.

### Step 4: DNS CAA Record (Optional — Let's Encrypt ke liye)

```
Type:  CAA
Name:  @
Value: issue "letsencrypt.org"
```

Ye batata hai ki sirf Let's Encrypt SSL certificate bana sakta hai. Security best practice hai.

### Step 5: Verify DNS Propagation

```bash
# VPS pe ya apne local machine pe run karo
dig voiceai.in +short
# Expected: YOUR_VPS_IP

dig n8n.voiceai.in +short
# Expected: YOUR_VPS_IP (wildcard record se)

# Ya online tool use karo: https://www.whatsmydns.net
```

🎉 **PART 2 DONE!** Domain VPS pe point ho gaya. Ab code deploy karte hain!

---

## PART 3: 📂 Clone & Configure (~10 mins)

### Step 1: Clone Repository

```bash
# Project folder mein jao (ya directly home mein)
cd /root

# Repo clone karo
git clone https://github.com/mahatosnehabala250-project/glm-voice-calling.git

# Project folder mein enter karo
cd glm-voice-calling

# Check files
ls -la
# docker-compose.yml, Dockerfile, Caddyfile.prod, .env.example etc dikhne chahiye
```

### Step 2: Setup Environment File

```bash
# .env.example se .env banao
cp .env.example .env

# .env file edit karo
nano .env
```

### Step 3: Edit .env File — Complete Configuration

`nano .env` ke andar ye changes karo (one by one):

#### 🔑 Database Configuration

```env
# Production mein SQLite use karenge (file-based, simple)
# Agar Supabase use karna hai toh postgresql URL daalo
DATABASE_URL=file:/app/db/custom.db
```

#### 🔑 JWT Secret (VERY IMPORTANT!)

```env
# STRONG random string generate karo:
# VPS pe run karo: openssl rand -hex 32
JWT_SECRET=ye-ek-bohot-lambi-random-string-hai-64-characters
```

> ⚠️ **SECURITY WARNING**: JWT_SECRET ko bilkul weak mat rakhna!
> `openssl rand -hex 32` se generate karo. Ye password encryption ke liye hai.

#### 🔑 App URL

```env
# Apna actual domain yahan daalo (https ke saath!)
NEXT_PUBLIC_APP_URL=https://voiceai.yourdomain.com
NEXT_PUBLIC_APP_NAME=VoiceAI
```

#### 🔑 Gemini AI API Key

```env
# Google AI Studio se free mein milta hai
# https://aistudio.google.com/apikey
GEMINI_API_KEY=AIzaSy...your-actual-key-here
GEMINI_DEMO_MODE=false
```

#### 🔑 Vobiz SIP Credentials

```env
# Vobiz dashboard se milega
# https://vobiz.io ya apna SIP provider
VOBIZ_AUTH_ID=your-vobiz-auth-id
VOBIZ_AUTH_TOKEN=your-vobiz-auth-token
VOBIZ_MOBILE_NO=+91XXXXXXXXXX
VOBIZ_CREDENTIAL_ID=your-credential-id
```

#### 🔑 Supabase (Optional — SQLite use kar rahe toh skip)

```env
# Agar SQLite use kar rahe ho (default) toh ye optional hai
# Supabase setup karna ho toh: https://supabase.com
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

#### 🔑 n8n Configuration

```env
# n8n login credentials (STRONG password rakhna!)
N8N_USERNAME=admin
N8N_PASSWORD=your-very-strong-n8n-password

# n8n webhook base URL (Caddy reverse proxy ke through)
N8N_WEBHOOK_BASE=https://n8n.voiceai.yourdomain.com
```

#### 🔑 Service URLs (Docker Internal — Change mat karo!)

```env
# Ye Docker network ke liye hai — mat change karna!
VOBIZ_SERVICE_URL=http://vobiz-sip:3031
GEMINI_SERVICE_URL=http://gemini-ai:3032
WS_BRIDGE_SERVICE_URL=http://ws-bridge:3033
MAIN_APP_URL=http://voiceai-app:3000
```

### Step 4: Save & Exit Nano

```
Ctrl + O → Enter (save)
Ctrl + X → Exit
```

### Step 5: Setup Production Caddyfile

```bash
# Production Caddyfile copy karo (overwrite)
cp Caddyfile.prod Caddyfile

# Caddyfile edit karo apne domain ke saath
nano Caddyfile
```

Caddyfile mein ye line replace karo:

```caddyfile
# OLD: {$APP_DOMAIN:voiceai.yourdomain.com}
# NEW: {$APP_DOMAIN:voiceai.yourdomain.com}
# (Replace voiceai.yourdomain.com with YOUR actual domain)

# For example, if domain is voiceai.in:
# {$APP_DOMAIN:voiceai.in}
```

> 💡 **Simple way**: `nano Caddyfile` mein `Ctrl+\` press karo,
> `voiceai.yourdomain.com` type karo, phir apna domain daalo, `Enter`, phir `A` (All replace).

Ya phir manually `sed` command use karo:

```bash
# Replace ALL occurrences of voiceai.yourdomain.com with your actual domain
sed -i 's/voiceai\.yourdomain\.com/voiceai.yourdomain.com/g' Caddyfile
# ^^^ Replace 'voiceai.yourdomain.com' (after /g) with YOUR actual domain
```

🎉 **PART 3 DONE!** Configuration ready. Ab Docker build karte hain!

---

## PART 4: 🐳 Deploy with Docker Compose (~5 mins)

### Step 1: Build & Start All Services

```bash
# Project folder mein hona chahiye (/root/glm-voice-calling)
cd /root/glm-voice-calling

# Sab services build aur start karo (background mein)
docker compose up -d --build
```

> ⏳ **First build mein 5-10 minutes lagega** — Next.js app compile hota hai,
> sab mini-services build hote hain, n8n image download hota hai.
> Coffee break le lo! ☕

**What's happening:**
1. 🏗️ 6 custom services build ho rahe hain (Dockerfile se)
2. 📦 n8n image download ho raha hai (~200MB)
3. 📦 Caddy image download ho raha hai (~40MB)
4. 🚀 Sab containers start ho rahe hain

### Step 2: Check All Services Status

```bash
# Sab containers ka status dekho
docker compose ps
```

**Expected output** (sab "healthy" ya "running" hona chahiye):

```
NAME                SERVICE            STATUS                    PORTS
voiceai-app         voiceai-app        Up (healthy)              0.0.0.0:3000->3000/tcp
vobiz-sip           vobiz-sip          Up (healthy)              0.0.0.0:3031->3031/tcp
gemini-ai           gemini-ai          Up (healthy)              0.0.0.0:3032->3032/tcp
ws-bridge           ws-bridge          Up (healthy)              0.0.0.0:3033->3033/tcp
call-simulator      call-simulator     Up (healthy)              0.0.0.0:3004->3004/tcp
call-orchestrator   call-orchestrator  Up (healthy)              0.0.0.0:3035->3035/tcp
voiceai-n8n         n8n                Up (healthy)              0.0.0.0:5678->5678/tcp
voiceai-caddy       caddy              Up                        0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
```

> ⚠️ Agar kuch containers "starting" mein fase hain toh 2-3 min wait karo.
> `docker compose ps` dobara run karo. Health check mein 30-60 sec lagta hai.

### Step 3: Check Logs (Agar kuch galat ho toh)

```bash
# Main app ke logs dekho
docker compose logs -f voiceai-app

# Specific service ke logs
docker compose logs -f n8n
docker compose logs -f caddy

# Saare services ke last 50 lines
docker compose logs --tail=50
```

`Ctrl+C` se logs exit karo.

### Step 4: Verify App is Running

```bash
# Local test (VPS pe)
curl -s http://localhost:3000 | head -20
# HTML output dikhna chahiye ✅

# API health check
curl -s http://localhost:3000/api/route
# {"status":"ok"} ya kuch response aana chahiye ✅

# n8n health check
curl -s http://localhost:5678/healthz
# {"status":"ok"} ✅
```

🎉 **PART 4 DONE!** Sab 8 services chal rahe hain! Ab SSL setup karte hain!

---

## PART 5: 🔒 Caddy SSL Setup (Auto — ~2 mins)

> Caddy ka sabse bada advantage hai — **SSL automatically** Let's Encrypt se mil jaata hai!
> Koi manual certificate setup nahi, koi Certbot nahi, koi renewal nahi. Magic! ✨

### Step 1: Verify Caddy is Running

```bash
docker compose ps caddy
# Status: "Up" hona chahiye ✅
```

### Step 2: Check Caddy Logs

```bash
docker compose logs -f caddy
```

**Successful SSL output mein ye dikhega:**
```
{"level":"info","msg":"certificate obtained successfully","identifier":"voiceai.yourdomain.com"}
```

> ⚠️ Agar SSL error aaye toh:
> 1. DNS propagation complete hai? (`dig voiceai.yourdomain.com +short`)
> 2. Port 80/443 open hai? (`ufw status`)
> 3. Caddyfile mein domain sahi hai? (`cat Caddyfile | head -5`)

### Step 3: Verify HTTPS

```bash
# VPS pe se test karo
curl -I https://voiceai.yourdomain.com
# HTTP/2 200 hona chahiye ✅

# SSL certificate check
curl -vI https://voiceai.yourdomain.com 2>&1 | grep "subject:"
# subject: CN=voiceai.yourdomain.com ✅
```

### Step 4: Test All Subdomains

```bash
# Main app
curl -I https://voiceai.yourdomain.com

# n8n
curl -I https://n8n.voiceai.yourdomain.com

# Vobiz SIP
curl -I https://sip.voiceai.yourdomain.com

# WebSocket bridge
curl -I https://ws.voiceai.yourdomain.com

# Call Orchestrator
curl -I https://orchestrator.voiceai.yourdomain.com

# Call Simulator (demo)
curl -I https://simulator.voiceai.yourdomain.com
```

> 🎯 Sab URLs pe `HTTP/2 200` ya `HTTP/2 301/302` aana chahiye.

🎉 **PART 5 DONE!** SSL chal raha hai — sab kuch HTTPS pe! Ab final checks!

---

## PART 6: ✅ Post-Deploy Checklist (~5 mins)

### Step 1: Push Database Schema

```bash
# Prisma schema database mein push karo
docker compose exec voiceai-app bunx prisma db push

# Expected output:
# 🚀 Your database is now in sync with your Prisma schema.
```

### Step 2: Seed Database (Optional — Demo Data)

```bash
# Agar seed file hai toh run karo
docker compose exec voiceai-app bunx prisma db seed
```

### Step 3: Test Main App

Browser mein jaake:

```
https://voiceai.yourdomain.com
```

- ✅ Login page dikhna chahiye
- ✅ SSL lock icon (🔒) browser mein
- ✅ No console errors

### Step 4: Test n8n

```
https://n8n.voiceai.yourdomain.com
```

- ✅ n8n login page dikhna chahiye
- ✅ `.env` mein daale hue credentials se login karo
- ✅ Workflows import kar sakte ho

### Step 5: Full Health Check

```bash
# Sab services ka ek saath status
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

# Resource usage dekho (RAM/CPU)
docker stats --no-stream

# Disk usage
df -h
```

### Step 6: Security Final Checks

```bash
# Firewall status
ufw status verbose

# SSH — key-based authentication enable karo (recommended)
# Apne local machine pe:
# ssh-copy-id root@YOUR_VPS_IP

# Phir /etc/ssh/sshd_config mein:
# PasswordAuthentication no
# systemctl restart sshd
```

### Step 7: Create Admin User

```bash
# VoiceAI app mein admin user create karo
# (Register API endpoint use karke ya n8n workflow se)
# Browser pe https://voiceai.yourdomain.com pe jake signup karo
```

---

## PART 7: 📋 Useful Commands — Cheat Sheet

> Ye commands bookmark kar lo — roz kaam aayenge! ⭐

### 🔍 View Logs

```bash
# Specific service ke logs (real-time, follow mode)
docker compose logs -f voiceai-app        # Next.js main app
docker compose logs -f n8n                # n8n workflows
docker compose logs -f vobiz-sip          # Vobiz SIP service
docker compose logs -f gemini-ai          # Gemini AI service
docker compose logs -f ws-bridge          # WebSocket bridge
docker compose logs -f call-simulator     # Call simulator
docker compose logs -f call-orchestrator  # Call orchestrator
docker compose logs -f caddy              # Caddy reverse proxy

# Last 100 lines (real-time nahi)
docker compose logs --tail=100 voiceai-app

# Saare services ke logs ek saath
docker compose logs --tail=50
```

### 🔄 Restart Services

```bash
# Ek service restart karo
docker compose restart voiceai-app
docker compose restart n8n
docker compose restart caddy

# Saare restart karo
docker compose restart

# Full recreate (config changes ke baad)
docker compose up -d --force-recreate
```

### 🏗️ Rebuild Services

```bash
# Ek service rebuild karo (code change ke baad)
docker compose up -d --build voiceai-app

# Saare rebuild karo (major update ke baad)
docker compose up -d --build

# Clean build (cache clear — slow but thorough)
docker compose build --no-cache voiceai-app
docker compose up -d
```

### 📊 Check Status & Resources

```bash
# Container status
docker compose ps

# Detailed status with format
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

# Live resource usage (RAM, CPU)
docker stats

# One-time snapshot
docker stats --no-stream

# System resources
htop          # Interactive process monitor
free -h       # RAM usage
df -h         # Disk usage
top           # CPU usage
```

### 🗄️ Database Operations

```bash
# Push schema changes
docker compose exec voiceai-app bunx prisma db push

# Generate Prisma client
docker compose exec voiceai-app bunx prisma generate

# Seed database
docker compose exec voiceai-app bunx prisma db seed

# Backup SQLite database
docker compose exec voiceai-app cp db/custom.db backup-$(date +%Y%m%d).db

# Enter container shell (debugging ke liye)
docker compose exec voiceai-app sh
docker compose exec voiceai-app bash
```

### 🔧 Update & Maintain

```bash
# Latest code pull karo aur rebuild
cd /root/glm-voice-calling
git pull origin main
docker compose up -d --build

# Docker itself update karo
curl -fsSL https://get.docker.com | sh

# Clean up unused images/disks (disk space free)
docker system prune -a
docker volume prune
```

### 🌐 SSH Tunnel (Local Debugging)

```bash
# VPS ka localhost port apne machine pe forward karo
# Useful: apne laptop pe https://localhost:3000 se VPS app access

ssh -L 3000:localhost:3000 root@YOUR_VPS_IP
ssh -L 5678:localhost:5678 root@YOUR_VPS_IP    # n8n
ssh -L 3000:localhost:3000 -L 5678:localhost:5678 root@YOUR_VPS_IP
```

### 🧹 Cleanup & Reset

```bash
# Saare containers stop aur delete karo
docker compose down

# Saare containers + volumes delete karo (DATA LOSS!)
docker compose down -v

# Full nuclear reset — sab delete, fresh start
docker compose down -v --rmi all --remove-orphans
```

---

## PART 8: 🔧 Troubleshooting (常见问题)

> Kuch problem aaye? Daro mat — yahan sab solutions hain! 💪

### ❌ Problem 1: Port 80 or 443 Already in Use

**Symptom**: Caddy container fail ho raha hai, `port already allocated` error.

```bash
# Check kya port use ho raha hai
sudo lsof -i :80
sudo lsof -i :443

# Agar Apache hai (Hostinger pe sometimes pre-installed)
systemctl stop apache2
systemctl disable apache2

# Agar Nginx hai
systemctl stop nginx
systemctl disable nginx

# Phir Caddy restart karo
docker compose restart caddy
```

---

### ❌ Problem 2: Out of Memory (OOM Killed)

**Symptom**: Containers randomly restart, `OOMKilled` in logs.

```bash
# Check memory usage
free -h
docker stats --no-stream

# Agar RAM kam hai, swap add karo
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Ya memory limits reduce karo docker-compose.yml mein
# voiceai-app: limits.memory: 1G → 512M
# n8n: limits.memory: 512M → 256M
```

> 💡 **Best fix**: KVM 2 plan (8GB RAM) pe upgrade karo — sirf ₹499/mo!

---

### ❌ Problem 3: SSL Certificate Not Working

**Symptom**: HTTPS pe `connection refused` ya `certificate error`.

```bash
# 1. DNS check karo — domain VPS IP pe point ho raha hai?
dig voiceai.yourdomain.com +short
# Apna VPS IP dikhna chahiye

# 2. Port 80 open hai? (Let's Encrypt port 80 se verify karta hai)
sudo ufw status
# 80/tcp ALLOW hona chahiye

# 3. Caddy logs check karo
docker compose logs --tail=50 caddy

# 4. Caddyfile mein domain sahi hai?
cat Caddyfile | head -3

# 5. DNS propagation wait karo (5-30 mins)
# Check: https://www.whatsmydns.net

# 6. Force certificate renewal
docker compose restart caddy
```

---

### ❌ Problem 4: n8n Not Loading / Slow

**Symptom**: n8n page open nahi hoti ya bahut slow hai.

```bash
# n8n logs check karo
docker compose logs --tail=100 n8n

# Memory check karo — n8n ko kam se kam 256M chahiye
docker stats --no-stream voiceai-n8n

# Restart karo
docker compose restart n8n

# Agar consistently slow hai → VPS plan upgrade karo (KVM 2)
```

---

### ❌ Problem 5: Build Fails

**Symptom**: `docker compose up -d --build` fails with error.

```bash
# Step 1: Error dekho
docker compose logs voiceai-app

# Step 2: Clean build try karo
docker compose build --no-cache voiceai-app

# Step 3: Agar disk space kam hai
df -h
# Clean up
docker system prune -a
docker volume prune

# Step 4: Docker memory increase (agar build OOM ho)
# /etc/docker/daemon.json create/edit karo:
echo '{"storage-driver":"overlay2","log-driver":"json-file","log-opts":{"max-size":"10m","max-file":"3"}}' > /etc/docker/daemon.json
systemctl restart docker

# Step 5: Git repo fresh clone karo (agar code corrupt hai)
cd /root
rm -rf glm-voice-calling
git clone https://github.com/mahatosnehabala250-project/glm-voice-calling.git
cd glm-voice-calling
cp .env.example .env
# .env edit karo phir se
docker compose up -d --build
```

---

### ❌ Problem 6: Database Error

**Symptom**: App start nahi hota ya "database is locked" error.

```bash
# Prisma generate karo
docker compose exec voiceai-app bunx prisma generate

# Schema push karo
docker compose exec voiceai-app bunx prisma db push

# Agar SQLite locked hai
docker compose restart voiceai-app

# Agar Supabase use kar rahe ho toh connection string check karo
docker compose exec voiceai-app printenv DATABASE_URL
```

---

### ❌ Problem 7: Containers Not Starting After Reboot

```bash
# Docker service check karo
systemctl status docker

# Docker enable karo (auto-start on boot)
systemctl enable docker

# Containers restart policy check karo
docker compose ps
# "Restart" column mein "unless-stopped" hona chahiye

# Manual start
docker compose up -d
```

---

### ❌ Problem 8: Health Check Failing

**Symptom**: Container "unhealthy" status mein hai.

```bash
# Manual health check
docker compose exec voiceai-app curl -f http://localhost:3000/api/route

# Agar curl nahi hai container mein
docker compose exec voiceai-app wget -qO- http://localhost:3000/api/route

# App logs check karo — startup error ho sakta hai
docker compose logs --tail=50 voiceai-app

# Container restart karo
docker compose restart voiceai-app
```

---

## 🏗️ Architecture Diagram

```
                         🌐 INTERNET
                             │
                    ┌────────▼────────┐
                    │   Caddy (443)   │  ← Auto HTTPS (Let's Encrypt) 🔒
                    │  Reverse Proxy   │
                    └────────┬────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
     ┌────▼────┐       ┌────▼────┐       ┌────▼────┐
     │ VoiceAI │       │   n8n   │       │Vobiz-SIP│
     │  App    │       │  (5678) │       │  (3031) │
     │  (3000) │       └─────────┘       └─────────┘
     └────┬────┘
          │         Docker Bridge Network (voiceai-network)
     ┌────┼──────────────┬────────────┬──────────────┐
     │    │              │            │              │
 ┌───▼──┐ ┌▼────────┐ ┌─▼─────┐ ┌───▼──────┐ ┌─────▼──────┐
 │Gemini│ │WS-Bridge│ │ Call  │ │  Call    │ │  Caddy     │
 │ AI   │ │ (3033)  │ │Simula-│ │Orchestra-│ │  Data/Conf │
 │(3032)│ └─────────┘ │ tor   │ │  tor     │ │  (volumes) │
 └──────┘             │(3004) │ │  (3035)  │ └────────────┘
                      └───────┘ └──────────┘

 External APIs:
 ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
 │ Supabase │  │ Gemini   │  │ Vobiz    │  │ n8n      │
 │ (DB)     │  │ (AI/TTS) │  │ (SIP)    │  │(Workflows│
 └──────────┘  └──────────┘  └──────────┘  └──────────┘
```

---

## 🌐 Service URLs Summary

| Service | URL | Internal Port |
|---------|-----|---------------|
| 🏠 **Main App** | `https://voiceai.yourdomain.com` | 3000 |
| ⚙️ **n8n Workflows** | `https://n8n.voiceai.yourdomain.com` | 5678 |
| 📞 **Vobiz SIP** | `https://sip.voiceai.yourdomain.com` | 3031 |
| 🤖 **Gemini AI** | Internal only (not exposed) | 3032 |
| 🔌 **WebSocket** | `https://ws.voiceai.yourdomain.com` | 3033 |
| 🎮 **Call Simulator** | `https://simulator.voiceai.yourdomain.com` | 3004 |
| 🎯 **Orchestrator** | `https://orchestrator.voiceai.yourdomain.com` | 3035 |

---

## 🔒 Security Checklist

- [ ] ✅ Strong `JWT_SECRET` set kiya (`openssl rand -hex 32`)
- [ ] ✅ Strong `N8N_PASSWORD` set kiya
- [ ] ✅ UFW firewall enabled (ports 22, 80, 443 only)
- [ ] ✅ SSH key authentication setup kiya
- [ ] ✅ `.env` file GitHub pe committed nahi hai
- [ ] ✅ SSL/HTTPS working (Caddy auto-managed)
- [ ] ✅ Docker containers `non-root` user pe chal rahe hain
- [ ] ✅ Unnecessary ports exposed nahi hain (3000, 3031, etc. only internal)
- [ ] ✅ Regular backups setup kiye (database)
- [ ] ✅ `docker system prune`定期 kar rahe ho (disk space)

---

## 💸 Monthly Cost Breakdown

| Service | Provider | Cost/Month |
|---------|----------|-----------|
| VPS (KVM 2) | Hostinger | ₹499 |
| Domain (.in) | Any registrar | ~₹7/yr (~₹0.6/mo) |
| SSL Certificate | Let's Encrypt (via Caddy) | **FREE** 🎉 |
| Gemini API | Google AI Studio | **FREE** (generous limits) |
| Supabase | Supabase | **FREE** tier available |
| Docker | Docker (open source) | **FREE** 🎉 |
| n8n | n8n (self-hosted) | **FREE** 🎉 |
| Caddy | Caddy (open source) | **FREE** 🎉 |
| Vobiz SIP | Vobiz | ₹999+ (usage based) |
| **TOTAL** | | **~₹500-1500/mo** |

> 🎯 **Vercel/Railway pe deploy karte toh $20-50/month (₹1600-4000) lagta!**
> Self-hosted pe sirf ₹500/mo mein same thing! 💰

---

## 🎉 Deployment Complete!

**Congratulations bhai! 🥳** Tumne successfully VoiceAI SaaS ko Hostinger VPS pe deploy kar diya!

**Ab kya karna hai:**
1. ✅ Admin account banao (signup page se)
2. ✅ n8n workflows import karo (`vobiz-docs-*.json` files)
3. ✅ Vobiz SIP configure karo (webhook URLs set karo)
4. ✅ AI agent setup karo (Gemini prompt configure karo)
5. ✅ Test calls karo (call simulator se demo test)
6. ✅ Monitoring setup karo (htop, docker stats regularly check karo)

**Helpful Resources:**
- 📖 [Caddy Documentation](https://caddyserver.com/docs/)
- 📖 [Docker Compose Docs](https://docs.docker.com/compose/)
- 📖 [n8n Self-Hosting](https://docs.n8n.io/hosting/)
- 📖 [Prisma Database](https://www.prisma.io/docs/)

---

> **Made with ❤️ for VoiceAI SaaS**
> Last updated: 2025 | Hostinger VPS + Docker Compose + Caddy
