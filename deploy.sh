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
#   2. Clone repo: git clone <your-repo> /var/www/GigEconomy
#   3. Run: cd /var/www/GigEconomy && chmod +x deploy.sh && ./deploy.sh
#
# =====================================================

set -e  # Exit on error

# Configuration
DEPLOY_PATH="/var/www/GigEconomy"
APP_NAME="gigx-app"
BOT_NAME="gigx-bot"
APP_PORT="3006"

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
echo "  1) First time setup (install dependencies + build + bot)"
echo "  2) Update & rebuild (git pull + build)"
echo "  3) Restart app only"
echo "  4) Restart bot only"
echo "  5) View logs (app or bot)"
echo "  6) Setup Nginx + SSL"
echo "  7) Configure Telegram Bot Token"
echo ""
read -p "Enter choice [1-7]: " ACTION

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

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN="YOUR_BOT_TOKEN_HERE"
WEBAPP_URL="https://dilink.io.vn"
COMMUNITY_URL="https://t.me/GigXCommunity"

# Adsgram Configuration
ADSGRAM_SECRET_KEY="d1461d173e6e4b90add4046ff653be3b"
NEXT_PUBLIC_ADSGRAM_BLOCK_ID="20377"

# Production
NODE_ENV="production"
PORT=3006
EOF
        echo -e "${GREEN}✓ .env created${NC}"
        echo -e "${YELLOW}⚠ Remember to update TELEGRAM_BOT_TOKEN in .env!${NC}"
        
        echo -e "${CYAN}[3/6] Installing npm dependencies...${NC}"
        cd $DEPLOY_PATH
        npm ci --production=false
        # Install bot dependencies
        npm install node-telegram-bot-api dotenv
        
        echo -e "${CYAN}[4/7] Setting up database...${NC}"
        npx prisma generate
        npx prisma migrate deploy
        
        echo -e "${CYAN}[5/7] Seeding database...${NC}"
        # Install ts-node for seeding
        npm install -g ts-node
        
        # Seed tasks
        echo "Seeding tasks..."
        npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts || echo "Task seed skipped"
        
        # Seed shop items
        echo "Seeding shop items..."
        npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed_shop.ts || echo "Shop seed skipped"
        
        echo -e "${GREEN}✓ Database seeded${NC}"
        
        echo -e "${CYAN}[6/7] Building application...${NC}"
        npm run build
        
        echo -e "${CYAN}[7/7] Starting with PM2...${NC}"
        mkdir -p logs
        
        # Create PM2 config for both app and bot
        cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
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
      error_file: '$DEPLOY_PATH/logs/app-error.log',
      out_file: '$DEPLOY_PATH/logs/app-output.log',
      time: true
    },
    {
      name: '$BOT_NAME',
      script: 'bot.js',
      cwd: '$DEPLOY_PATH',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '$DEPLOY_PATH/logs/bot-error.log',
      out_file: '$DEPLOY_PATH/logs/bot-output.log',
      time: true
    }
  ]
};
EOF
        
        # Only delete gigx apps, not all apps
        pm2 delete $APP_NAME 2>/dev/null || true
        pm2 delete $BOT_NAME 2>/dev/null || true
        pm2 start ecosystem.config.js
        pm2 save
        pm2 startup
        
        echo ""
        echo -e "${GREEN}╔═══════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║         ✓ Setup complete!                         ║${NC}"
        echo -e "${GREEN}╚═══════════════════════════════════════════════════╝${NC}"
        echo ""
        echo -e "${YELLOW}⚠ IMPORTANT: Configure your bot token:${NC}"
        echo -e "   Run option 7 or manually edit .env file"
        echo ""
        echo -e "${YELLOW}Next: Run option 6 to setup Nginx + SSL${NC}"
        ;;
        
    2)
        echo -e "${CYAN}Updating application...${NC}"
        cd $DEPLOY_PATH
        
        git pull origin main
        npm ci --production=false
        npm install node-telegram-bot-api dotenv
        npx prisma generate
        npx prisma migrate deploy
        npm run build
        pm2 restart $APP_NAME $BOT_NAME
        
        echo -e "${GREEN}✓ Update complete!${NC}"
        pm2 status
        ;;
        
    3)
        echo -e "${CYAN}Restarting web app...${NC}"
        pm2 restart $APP_NAME
        pm2 status
        echo -e "${GREEN}✓ Web app restarted${NC}"
        ;;

    4)
        echo -e "${CYAN}Restarting Telegram bot...${NC}"
        pm2 restart $BOT_NAME
        pm2 status
        echo -e "${GREEN}✓ Bot restarted${NC}"
        ;;
        
    5)
        echo -e "${YELLOW}View logs for:${NC}"
        echo "  1) Web App ($APP_NAME)"
        echo "  2) Telegram Bot ($BOT_NAME)"
        echo "  3) All"
        read -p "Enter choice [1-3]: " LOG_CHOICE
        
        case $LOG_CHOICE in
            1)
                echo -e "${CYAN}Showing app logs (Ctrl+C to exit)...${NC}"
                pm2 logs $APP_NAME
                ;;
            2)
                echo -e "${CYAN}Showing bot logs (Ctrl+C to exit)...${NC}"
                pm2 logs $BOT_NAME
                ;;
            3)
                echo -e "${CYAN}Showing all logs (Ctrl+C to exit)...${NC}"
                pm2 logs
                ;;
            *)
                pm2 logs
                ;;
        esac
        ;;
        
    6)
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
        proxy_pass http://127.0.0.1:3006;
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

    7)
        echo -e "${CYAN}Configure Telegram Bot Token${NC}"
        echo ""
        echo -e "${YELLOW}Get your bot token from @BotFather on Telegram${NC}"
        echo ""
        read -p "Enter your Telegram Bot Token: " BOT_TOKEN
        
        if [ -n "$BOT_TOKEN" ]; then
            # Update .env file with new token
            cd $DEPLOY_PATH
            sed -i "s|TELEGRAM_BOT_TOKEN=.*|TELEGRAM_BOT_TOKEN=\"$BOT_TOKEN\"|" .env
            
            echo -e "${GREEN}✓ Bot token updated in .env${NC}"
            
            # Restart bot to apply changes
            pm2 restart $BOT_NAME 2>/dev/null || echo -e "${YELLOW}Bot not running yet. Start with option 1${NC}"
            
            echo ""
            echo -e "${CYAN}╔═══════════════════════════════════════════════════╗${NC}"
            echo -e "${CYAN}║  Bot Token Configuration Complete!                ║${NC}"
            echo -e "${CYAN}╠═══════════════════════════════════════════════════╣${NC}"
            echo -e "${CYAN}║  Now set up commands in @BotFather:               ║${NC}"
            echo -e "${CYAN}║                                                   ║${NC}"
            echo -e "${CYAN}║  /setcommands - then select your bot and send:   ║${NC}"
            echo -e "${CYAN}║  start - 🚀 Launch GigX                           ║${NC}"
            echo -e "${CYAN}║  help - 📖 How to Play                            ║${NC}"
            echo -e "${CYAN}║                                                   ║${NC}"
            echo -e "${CYAN}║  /setmenubutton - Set Web App as menu button     ║${NC}"
            echo -e "${CYAN}╚═══════════════════════════════════════════════════╝${NC}"
        else
            echo -e "${RED}No token provided. Cancelled.${NC}"
        fi
        ;;
        
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${CYAN}PM2 Commands:${NC}"
echo "  pm2 status              # Check all apps status"
echo "  pm2 logs $APP_NAME      # View web app logs"
echo "  pm2 logs $BOT_NAME      # View bot logs"
echo "  pm2 restart all         # Restart all apps"
echo "  pm2 monit               # Monitor all apps"
echo ""
