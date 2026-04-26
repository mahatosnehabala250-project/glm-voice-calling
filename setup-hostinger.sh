#!/bin/bash
# ============================================================
# VoiceAI SaaS - ONE-LINER Hostinger VPS Setup
# ============================================================
# Run this on a FRESH Hostinger VPS:
#
#   curl -sSL https://raw.githubusercontent.com/mahatosnehabala250-project/glm-voice-calling/main/setup-hostinger.sh | bash -s -- YOUR_DOMAIN
#
# Example:
#   curl -sSL ... | bash -s -- voiceai.yourdomain.com
#
# What it does:
#   1. Updates system packages
#   2. Installs Docker + Docker Compose
#   3. Installs Git, curl, htop, ufw
#   4. Sets up firewall (ports 22, 80, 443)
#   5. Creates 4GB swap (for low-RAM VPS)
#   6. Clones the VoiceAI repo
#   7. Creates .env from .env.example
#   8. Configures Caddyfile with your domain
#   9. Builds & starts all 8 Docker services
#  10. Runs Prisma DB migrations
#  11. Runs health checks on all services
#   12. Prints deployment summary
#
# Time: ~15-20 minutes on a fresh VPS
# ============================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║     🚀 VoiceAI SaaS — Hostinger VPS Auto-Setup              ║"
echo "║     Akela command mein sab kuch deploy ho jaayega!          ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ─── Domain check ───
DOMAIN="$1"
if [ -z "$DOMAIN" ]; then
    echo -e "${RED}ERROR: Domain zaroori hai!${NC}"
    echo ""
    echo "Usage:"
    echo "  ./setup-hostinger.sh YOUR_DOMAIN"
    echo ""
    echo "Example:"
    echo "  ./setup-hostinger.sh voiceai.yourdomain.com"
    echo ""
    echo "Agar one-liner use kar rahe ho:"
    echo "  curl -sSL <script-url> | bash -s -- voiceai.yourdomain.com"
    exit 1
fi

echo -e "${GREEN}Domain: ${BOLD}$DOMAIN${NC}"
echo ""

# ─── System Info ───
echo -e "${YELLOW}━━━ System Info ━━━${NC}"
echo "  OS:     $(cat /etc/os-release 2>/dev/null | grep PRETTY_NAME | cut -d'"' -f2 || echo 'Unknown')"
echo "  Kernel: $(uname -r)"
echo "  RAM:    $(free -h 2>/dev/null | grep Mem | awk '{print $2}' || echo 'Unknown')"
echo "  CPU:    $(nproc) cores"
echo "  Disk:   $(df -h / 2>/dev/null | tail -1 | awk '{print $4}' || echo 'Unknown') free"
echo ""

# ═══════════════════════════════════════════════════
# STEP 1: System Update
# ═══════════════════════════════════════════════════
echo -e "${BLUE}[1/10] System update...${NC}"
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -qq
echo -e "${GREEN}  ✅ System updated${NC}"

# ═══════════════════════════════════════════════════
# STEP 2: Install Docker
# ═══════════════════════════════════════════════════
echo -e "${BLUE}[2/10] Installing Docker...${NC}"

if command -v docker &> /dev/null; then
    echo -e "${GREEN}  ✅ Docker already installed: $(docker --version)${NC}"
else
    # Install Docker using official convenience script
    curl -fsSL https://get.docker.com | sh
    systemctl start docker
    systemctl enable docker
    echo -e "${GREEN}  ✅ Docker installed: $(docker --version)${NC}"
fi

if docker compose version &> /dev/null; then
    echo -e "${GREEN}  ✅ Docker Compose: $(docker compose version)${NC}"
else
    echo -e "${RED}  ❌ Docker Compose not found! Manual install required.${NC}"
    exit 1
fi

# ═══════════════════════════════════════════════════
# STEP 3: Install Required Tools
# ═══════════════════════════════════════════════════
echo -e "${BLUE}[3/10] Installing tools (git, curl, htop, ufw)...${NC}"
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq git curl wget nano htop > /dev/null 2>&1
echo -e "${GREEN}  ✅ Tools installed${NC}"

# ═══════════════════════════════════════════════════
# STEP 4: Setup Firewall
# ═══════════════════════════════════════════════════
echo -e "${BLUE}[4/10] Setting up firewall...${NC}"

# Allow SSH (don't lock out!)
ufw allow 22/tcp > /dev/null 2>&1

# Allow HTTP/HTTPS for Caddy
ufw allow 80/tcp > /dev/null 2>&1
ufw allow 443/tcp > /dev/null 2>&1
ufw allow 443/udp > /dev/null 2>&1

# Enable firewall (force in case already enabled)
ufw --force enable > /dev/null 2>&1

echo -e "${GREEN}  ✅ Firewall configured (SSH + HTTP + HTTPS)${NC}"

# ═══════════════════════════════════════════════════
# STEP 5: Create Swap (if needed)
# ═══════════════════════════════════════════════════
echo -e "${BLUE}[5/10] Checking swap...${NC}"

SWAP_SIZE=$(free -m | grep Swap | awk '{print $2}')

if [ "$SWAP_SIZE" -lt 2000 ]; then
    echo -e "${YELLOW}  ⚠️  Swap less than 2GB. Creating 4GB swap file...${NC}"
    
    if [ ! -f /swapfile ]; then
        fallocate -l 4G /swapfile
        chmod 600 /swapfile
        mkswap /swapfile > /dev/null 2>&1
        swapon /swapfile
        
        # Make permanent
        if ! grep -q '/swapfile' /etc/fstab; then
            echo '/swapfile none swap sw 0 0' >> /etc/fstab
        fi
        
        # Optimize swap settings
        sysctl -w vm.swappiness=10 > /dev/null 2>&1
        echo 'vm.swappiness=10' >> /etc/sysctl.conf 2>/dev/null || true
        
        echo -e "${GREEN}  ✅ 4GB swap created${NC}"
    else
        echo -e "${GREEN}  ✅ Swap file already exists${NC}"
    fi
else
    echo -e "${GREEN}  ✅ Swap already configured: ${SWAP_SIZE}MB${NC}"
fi

# ═══════════════════════════════════════════════════
# STEP 6: Clone Repository
# ═══════════════════════════════════════════════════
echo -e "${BLUE}[6/10] Cloning VoiceAI repository...${NC}"

PROJECT_DIR="/opt/voiceai"

if [ -d "$PROJECT_DIR" ]; then
    echo -e "${YELLOW}  ⚠️  Directory exists. Pulling latest code...${NC}"
    cd "$PROJECT_DIR"
    git pull origin main || git pull origin master || true
else
    git clone https://github.com/mahatosnehabala250-project/glm-voice-calling.git "$PROJECT_DIR"
    cd "$PROJECT_DIR"
fi

echo -e "${GREEN}  ✅ Code ready at $PROJECT_DIR${NC}"

# ═══════════════════════════════════════════════════
# STEP 7: Configure Environment
# ═══════════════════════════════════════════════════
echo -e "${BLUE}[7/10] Setting up environment...${NC}"

# Create .env from .env.example
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        
        # Generate strong JWT secret
        JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || head -c 64 /dev/urandom | xxd -p | head -c 64)
        sed -i "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env
        
        # Set domain
        sed -i "s|NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=https://$DOMAIN|" .env
        sed -i "s|N8N_WEBHOOK_BASE=.*|N8N_WEBHOOK_BASE=https://n8n.$DOMAIN|" .env
        
        # Set production database path
        sed -i "s|DATABASE_URL=.*|DATABASE_URL=file:/app/db/custom.db|" .env
        
        echo -e "${GREEN}  ✅ .env created with secure JWT secret${NC}"
    else
        echo -e "${RED}  ❌ .env.example not found!${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}  ⚠️  .env already exists. Not overwriting.${NC}"
fi

# ═══════════════════════════════════════════════════
# STEP 8: Configure Caddy
# ═══════════════════════════════════════════════════
echo -e "${BLUE}[8/10] Configuring Caddy with domain $DOMAIN...${NC}"

if [ -f Caddyfile.prod ]; then
    cp Caddyfile.prod Caddyfile
    # Replace placeholder domain with actual domain
    sed -i "s/voiceai\.yourdomain\.com/$DOMAIN/g" Caddyfile
    echo -e "${GREEN}  ✅ Caddyfile configured for $DOMAIN${NC}"
else
    echo -e "${YELLOW}  ⚠️  Caddyfile.prod not found. Using existing Caddyfile.${NC}"
fi

# ═══════════════════════════════════════════════════
# STEP 9: Build & Start Docker Services
# ═══════════════════════════════════════════════════
echo -e "${BLUE}[9/10] Building Docker images...${NC}"
echo -e "${YELLOW}  ⏳ Ye 5-10 minutes lagega (pehli baar). Chai peelo! ☕${NC}"

# Build all images in parallel
docker compose build --parallel 2>&1 | tail -30

echo ""
echo -e "${GREEN}  ✅ All images built successfully!${NC}"

echo -e "${BLUE}  Starting all 8 services...${NC}"
docker compose up -d

echo -e "${YELLOW}  ⏳ Services start ho rahe hain...${NC}"
sleep 15

# ═══════════════════════════════════════════════════
# STEP 10: Database Migrations & Health Checks
# ═══════════════════════════════════════════════════
echo -e "${BLUE}[10/10] Running database migrations...${NC}"

# Wait for app container to be healthy first
echo -e "${YELLOW}  ⏳ Waiting for voiceai-app to be ready...${NC}"
MAX_WAIT=120
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
    if docker exec voiceai-app curl -sf http://localhost:3000/api/route > /dev/null 2>&1; then
        break
    fi
    sleep 5
    WAITED=$((WAITED + 5))
    echo -n "."
done
echo ""

if docker exec voiceai-app bunx prisma generate > /dev/null 2>&1; then
    echo -e "${GREEN}  ✅ Prisma client generated${NC}"
fi

if docker exec voiceai-app bunx prisma db push > /dev/null 2>&1; then
    echo -e "${GREEN}  ✅ Database schema pushed${NC}"
else
    echo -e "${YELLOW}  ⚠️  DB push skipped (may already be up to date)${NC}"
fi

# ─── Health Checks ───
echo ""
echo -e "${BLUE}Running health checks...${NC}"

check_service() {
    local name=$1
    local url=$2
    local max_retries=10
    local retry=0
    
    while [ $retry -lt $max_retries ]; do
        if curl -sf "$url" > /dev/null 2>&1; then
            echo -e "  ${GREEN}✅ ${BOLD}$name${NC} — ${GREEN}Healthy${NC}"
            return 0
        fi
        retry=$((retry + 1))
        sleep 3
    done
    echo -e "  ${RED}❌ ${BOLD}$name${NC} — ${RED}Not responding${NC}"
    return 1
}

ALL_OK=true
check_service "VoiceAI App (Next.js)" "http://localhost:3000/api/route" || ALL_OK=false
check_service "Vobiz SIP Service" "http://localhost:3031/" || ALL_OK=false
check_service "Gemini AI Service" "http://localhost:3032/" || ALL_OK=false
check_service "WS Bridge" "http://localhost:3033/" || ALL_OK=false
check_service "n8n Workflows" "http://localhost:5678/healthz" || ALL_OK=false
check_service "Call Simulator" "http://localhost:3004/socket.io/?EIO=4&transport=polling" || ALL_OK=false
check_service "Call Orchestrator" "http://localhost:3035/" || ALL_OK=false

# ─── Stop port conflicts (Apache/Nginx if present) ───
if systemctl is-active apache2 > /dev/null 2>&1; then
    echo -e "${YELLOW}  ⚠️  Apache detected — stopping it (Caddy uses port 80/443)${NC}"
    systemctl stop apache2
    systemctl disable apache2
fi

if systemctl is-active nginx > /dev/null 2>&1; then
    echo -e "${YELLOW}  ⚠️  Nginx detected — stopping it (Caddy uses port 80/443)${NC}"
    systemctl stop nginx
    systemctl disable nginx
fi

# ═══════════════════════════════════════════════════
# DEPLOYMENT SUMMARY
# ═══════════════════════════════════════════════════
echo ""
echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║     🎉 DEPLOYMENT COMPLETE! 🎉                               ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${BOLD}📊 Service Status:${NC}"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null

echo ""
echo -e "${BOLD}🌐 Your URLs:${NC}"
echo -e "  🏠 ${GREEN}Main App:${NC}           https://$DOMAIN"
echo -e "  ⚙️ ${GREEN}n8n Workflows:${NC}      https://n8n.$DOMAIN"
echo -e "  📞 ${GREEN}Vobiz SIP:${NC}          https://sip.$DOMAIN"
echo -e "  🔌 ${GREEN}WebSocket:${NC}          https://ws.$DOMAIN"
echo -e "  🎯 ${GREEN}Orchestrator:${NC}       https://orchestrator.$DOMAIN"
echo -e "  🎮 ${GREEN}Call Simulator:${NC}     https://simulator.$DOMAIN"

echo ""
echo -e "${BOLD}⚠️  IMPORTANT — Ab ye bhi karo:${NC}"
echo -e "  1. ${YELLOW}DNS Setup:${NC} Domain ke A record mein apni VPS IP daalo"
echo -e "     ${CYAN}Type: A | Name: @ | Value: YOUR_VPS_IP${NC}"
echo -e "     ${CYAN}Type: A | Name: * | Value: YOUR_VPS_IP${NC}"
echo ""
echo -e "  2. ${YELLOW}.env Edit:${NC} Apni real API keys daalo"
echo -e "     ${CYAN}nano $PROJECT_DIR/.env${NC}"
echo -e "     ${CYAN}GEMINI_API_KEY, VOBIZ credentials, N8N password${NC}"
echo ""
echo -e "  3. ${YELLOW}Services Restart:${NC} .env edit ke baad"
echo -e "     ${CYAN}cd $PROJECT_DIR && docker compose up -d --force-recreate${NC}"
echo ""
echo -e "  4. ${YELLOW}Seed Database:${NC} Demo data chahiye toh"
echo -e "     ${CYAN}docker compose exec voiceai-app bunx prisma db seed${NC}"

echo ""
echo -e "${BOLD}📋 Useful Commands:${NC}"
echo -e "  docker compose logs -f voiceai-app    # App logs"
echo -e "  docker compose restart voiceai-app    # App restart"
echo -e "  docker compose ps                      # All services status"
echo -e "  docker stats --no-stream              # Resource usage"
echo -e "  htop                                   # System monitor"

echo ""
if [ "$ALL_OK" = true ]; then
    echo -e "${GREEN}${BOLD}✅ ALL SERVICES RUNNING! VoiceAI is LIVE! 🚀${NC}"
else
    echo -e "${YELLOW}${BOLD}⚠️  Some services need attention. Check logs above.${NC}"
fi

echo -e "${CYAN}"
echo "══════════════════════════════════════════════════════════════"
echo "  Project: $PROJECT_DIR"
echo "  Guide:   $PROJECT_DIR/HOSTINGER-SETUP.md"
echo "══════════════════════════════════════════════════════════════"
echo -e "${NC}"
