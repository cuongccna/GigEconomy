#!/bin/bash

# =====================================================
# GigX Telegram Mini App - VPS Setup Script
# =====================================================
# Run this script directly on your VPS after cloning
# Domain: https://dilink.io.vn
# =====================================================
#
# USAGE:
#   1. SSH into VPS: ssh root@72.61.114.103
#   2. Clone repo: git clone <your-repo> /var/www/gigx
#   3. Run: cd /var/www/gigx && chmod +x deploy.sh && ./deploy.sh
#
# =====================================================

set -e  # Exit on error

# Configuration
DEPLOY_PATH="/var/www/gigx"
APP_NAME="gigx-app"
APP_PORT="3001"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════╗"
echo "║       GigX Telegram Mini App - VPS Setup          ║"
echo "║              https://dilink.io.vn                 ║"
echo "╚═══════════════════════════════════════════════════╝"
echo -e "${NC}"

echo ""
echo -e "${YELLOW}Select action:${NC}"
echo "  1) First time setup (install dependencies + build)"
echo "  2) Update & rebuild (git pull + build)"
echo "  3) Restart app only"
echo "  4) View logs"
echo "  5) Setup Nginx + SSL"
echo ""
read -p "Enter choice [1-5]: " ACTION

case $ACTION in
    1)
        echo -e "${CYAN}[1/6] Installing system dependencies...${NC}"
        apt update && apt upgrade -y
        
        # Install Node.js 20.x
        if ! command -v node &> /dev/null; then
            echo "Installing Node.js 20.x..."
            curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
            apt install -y nodejs
        fi
        echo -e "${GREEN}✓ Node.js $(node -v)${NC}"
        
        # Install PM2
        if ! command -v pm2 &> /dev/null; then
            echo "Installing PM2..."
            npm install -g pm2
        fi
        echo -e "${GREEN}✓ PM2 installed${NC}"
        
        echo -e "${CYAN}[2/6] Creating .env file...${NC}"
        cat > $DEPLOY_PATH/.env << 'EOF'
# Database
DATABASE_URL="postgresql://gigeconomy_user:Cuongnv@123@localhost:5432/gigeconomy_db?schema=public"

# Adsgram Configuration
ADSGRAM_SECRET_KEY="d1461d173e6e4b90add4046ff653be3b"
NEXT_PUBLIC_ADSGRAM_BLOCK_ID="20377"

# Production
NODE_ENV="production"
PORT=3001
EOF
        echo -e "${GREEN}✓ .env created${NC}"
        
        echo -e "${CYAN}[3/6] Installing npm dependencies...${NC}"
        cd $DEPLOY_PATH
        npm ci --production=false
        
        echo -e "${CYAN}[4/6] Setting up database...${NC}"
        npx prisma generate
        npx prisma migrate deploy
        
        echo -e "${CYAN}[5/6] Building application...${NC}"
        npm run build
        
        echo -e "${CYAN}[6/6] Starting with PM2...${NC}"
        mkdir -p logs
        
        # Create PM2 config
        cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '$APP_NAME',
    script: 'npm',
    args: 'start',
    cwd: '$DEPLOY_PATH',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: $APP_PORT
    },
    error_file: '$DEPLOY_PATH/logs/error.log',
    out_file: '$DEPLOY_PATH/logs/output.log',
    time: true
  }]
};
EOF
        
        pm2 start ecosystem.config.js
        pm2 save
        pm2 startup
        
        echo ""
        echo -e "${GREEN}╔═══════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║         ✓ Setup complete!                         ║${NC}"
        echo -e "${GREEN}╚═══════════════════════════════════════════════════╝${NC}"
        echo ""
        echo -e "${YELLOW}Next: Run option 5 to setup Nginx + SSL${NC}"
        ;;
        
    2)
        echo -e "${CYAN}Updating application...${NC}"
        cd $DEPLOY_PATH
        
        git pull origin main
        npm ci --production=false
        npx prisma generate
        npx prisma migrate deploy
        npm run build
        pm2 restart $APP_NAME
        
        echo -e "${GREEN}✓ Update complete!${NC}"
        pm2 status
        ;;
        
    3)
        echo -e "${CYAN}Restarting application...${NC}"
        pm2 restart $APP_NAME
        pm2 status
        echo -e "${GREEN}✓ Restarted${NC}"
        ;;
        
    4)
        echo -e "${CYAN}Showing logs (Ctrl+C to exit)...${NC}"
        pm2 logs $APP_NAME
        ;;
        
    5)
        echo -e "${CYAN}Setting up Nginx...${NC}"
        
        # Install Nginx if not present
        if ! command -v nginx &> /dev/null; then
            apt install -y nginx
        fi
        
        # Create Nginx config
        cat > /etc/nginx/sites-available/gigx << 'EOF'
server {
    listen 80;
    server_name dilink.io.vn www.dilink.io.vn;
    
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
        
        ln -sf /etc/nginx/sites-available/gigx /etc/nginx/sites-enabled/
        rm -f /etc/nginx/sites-enabled/default
        nginx -t && systemctl reload nginx
        
        echo -e "${GREEN}✓ Nginx configured${NC}"
        
        echo ""
        read -p "Setup SSL with Let's Encrypt? (y/n): " SETUP_SSL
        
        if [ "$SETUP_SSL" = "y" ]; then
            apt install -y certbot python3-certbot-nginx
            certbot --nginx -d dilink.io.vn -d www.dilink.io.vn
            echo -e "${GREEN}✓ SSL configured${NC}"
        fi
        
        echo ""
        echo -e "${GREEN}╔═══════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║    ✓ Nginx setup complete!                        ║${NC}"
        echo -e "${GREEN}║    App: https://dilink.io.vn                      ║${NC}"
        echo -e "${GREEN}╚═══════════════════════════════════════════════════╝${NC}"
        ;;
        
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${CYAN}Commands:${NC}"
echo "  pm2 status              # Check app status"
echo "  pm2 logs $APP_NAME      # View logs"
echo "  pm2 restart $APP_NAME   # Restart app"
echo "  pm2 monit               # Monitor all apps"
echo ""
