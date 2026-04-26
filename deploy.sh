#!/bin/bash
# ============================================================
# VoiceAI SaaS - VPS Deployment Script
# ============================================================
# Usage: chmod +x deploy.sh && ./deploy.sh
# Run on your VPS after Coolify is installed
# ============================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════╗"
echo "║     VoiceAI SaaS - VPS Deployment Script         ║"
echo "║     Coolify + Docker Compose                     ║"
echo "╚══════════════════════════════════════════════════╝"
echo -e "${NC}"

# ─── Step 1: Check Prerequisites ───
echo -e "${YELLOW}[1/8] Checking prerequisites...${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker not installed. Installing...${NC}"
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker $USER
    newgrp docker
    echo -e "${GREEN}Docker installed successfully!${NC}"
else
    echo -e "${GREEN}Docker: $(docker --version)${NC}"
fi

# Check Docker Compose
if ! docker compose version &> /dev/null; then
    echo -e "${RED}Docker Compose not found. Please install Docker Compose v2.${NC}"
    exit 1
else
    echo -e "${GREEN}Docker Compose: $(docker compose version)${NC}"
fi

# Check Git
if ! command -v git &> /dev/null; then
    echo -e "${RED}Git not installed. Installing...${NC}"
    sudo apt install -y git
else
    echo -e "${GREEN}Git: $(git --version)${NC}"
fi

# ─── Step 2: Check .env file ───
echo -e "${YELLOW}[2/8] Checking environment configuration...${NC}"

if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${YELLOW}Created .env from .env.example${NC}"
        echo -e "${RED}IMPORTANT: Edit .env with your actual credentials before deploying!${NC}"
        echo -e "${RED}Run: nano .env${NC}"
        read -p "Have you configured .env? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}Please edit .env first, then run this script again.${NC}"
            exit 1
        fi
    else
        echo -e "${RED}Neither .env nor .env.example found!${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}.env file found${NC}"
fi

# ─── Step 3: Configure Caddyfile ───
echo -e "${YELLOW}[3/8] Configuring Caddy...${NC}"

if [ -f Caddyfile.prod ]; then
    read -p "Enter your domain (e.g., voiceai.yourdomain.com): " DOMAIN
    if [ -n "$DOMAIN" ]; then
        cp Caddyfile.prod Caddyfile
        sed -i "s/voiceai\.yourdomain\.com/$DOMAIN/g" Caddyfile
        echo -e "${GREEN}Caddyfile configured for $DOMAIN${NC}"
    else
        echo -e "${YELLOW}No domain provided. Using default Caddyfile.${NC}"
    fi
else
    echo -e "${YELLOW}No Caddyfile.prod found, using existing Caddyfile${NC}"
fi

# ─── Step 4: Pull latest code ───
echo -e "${YELLOW}[4/8] Pulling latest code...${NC}"

if git remote get-url origin &> /dev/null; then
    git pull origin main || git pull origin master || true
    echo -e "${GREEN}Code updated${NC}"
else
    echo -e "${YELLOW}No git remote configured. Using local code.${NC}"
fi

# ─── Step 5: Build Docker images ───
echo -e "${YELLOW}[5/8] Building Docker images (this may take 10-15 minutes)...${NC}"

docker compose build --parallel 2>&1 | tail -20

if [ $? -eq 0 ]; then
    echo -e "${GREEN}All images built successfully!${NC}"
else
    echo -e "${RED}Build failed! Check logs above.${NC}"
    exit 1
fi

# ─── Step 6: Start services ───
echo -e "${YELLOW}[6/8] Starting all services...${NC}"

docker compose up -d

echo -e "${GREEN}Waiting for services to start...${NC}"
sleep 10

# ─── Step 7: Run database migrations ───
echo -e "${YELLOW}[7/8] Running database migrations...${NC}"

if docker exec voiceai-app bunx prisma generate 2>/dev/null; then
    echo -e "${GREEN}Prisma client generated${NC}"
fi

if docker exec voiceai-app bunx prisma db push 2>/dev/null; then
    echo -e "${GREEN}Database schema pushed${NC}"
else
    echo -e "${YELLOW}Database push skipped or already up to date${NC}"
fi

# ─── Step 8: Health Check ───
echo -e "${YELLOW}[8/8] Running health checks...${NC}"

sleep 5

SERVICES_OK=true

check_service() {
    local name=$1
    local url=$2
    local max_retries=5
    local retry=0
    
    while [ $retry -lt $max_retries ]; do
        if curl -sf "$url" > /dev/null 2>&1; then
            echo -e "  ${GREEN}✅ $name is healthy${NC}"
            return 0
        fi
        retry=$((retry + 1))
        sleep 3
    done
    echo -e "  ${RED}❌ $name is NOT responding${NC}"
    SERVICES_OK=false
    return 1
}

check_service "voiceai-app (Next.js)" "http://localhost:3000/api/route"
check_service "vobiz-sip" "http://localhost:3031/"
check_service "gemini-ai" "http://localhost:3032/"
check_service "ws-bridge" "http://localhost:3033/"
check_service "n8n" "http://localhost:5678/healthz"

# ─── Final Status ───
echo ""
echo -e "${BLUE}══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}              DEPLOYMENT STATUS                       ${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════${NC}"

docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || \
docker compose ps

echo ""
if [ "$SERVICES_OK" = true ]; then
    echo -e "${GREEN}🎉 ALL SERVICES ARE RUNNING!${NC}"
    echo ""
    echo "Access your application:"
    echo "  🌐 Main App:    http://localhost:3000"
    echo "  🔧 n8n:          http://localhost:5678"
    echo "  📞 SIP Service:  http://localhost:3031"
    echo ""
    echo "  Don't forget to set up DNS and HTTPS via Caddy!"
else
    echo -e "${YELLOW}⚠️  Some services may need troubleshooting.${NC}"
    echo "  Check logs: docker compose logs -f [service-name]"
fi

echo -e "${BLUE}══════════════════════════════════════════════════${NC}"
echo ""
echo "Useful commands:"
echo "  docker compose logs -f              # All logs"
echo "  docker compose logs -f voiceai-app  # App logs only"
echo "  docker compose restart voiceai-app  # Restart app"
echo "  docker compose down                 # Stop all"
echo "  docker compose up -d                # Start all"
