#!/bin/bash

# =====================================================
# GigX Telegram Mini App - VPS Setup Script
# =====================================================

set -e

# Configuration
DEPLOY_PATH="/var/www/GigEconomy"
APP_NAME="gigx-app"
BOT_NAME="gigx-bot"
APP_PORT="3006"
DB_NAME="gigeconomy_db"
DB_USER="gigeconomy_user"
DB_PASS="Cuongnv@123"

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
echo "  1) First time setup (install all + build + bot)"
echo "  2) Update & rebuild (git pull + build)"
echo "  3) Restart app only"
echo "  4) Restart bot only"
echo "  5) View logs (app or bot)"
echo "  6) Setup Nginx + SSL"
echo "  7) Configure Telegram Bot Token"
echo "  8) Setup PostgreSQL database"
echo "  9) Check system status"
echo "  10) Seed database (tasks, shop items, etc.)"
echo "  11) Reset database (WARNING: deletes all data)"
echo ""
read -p "Enter choice [1-11]: " ACTION

case $ACTION in
    1)
        echo -e "${CYAN}[1/8] Installing system dependencies...${NC}"
        apt update && apt upgrade -y
        
        # Install Git
        if ! command -v git &> /dev/null; then
            echo "Installing Git..."
            apt install -y git
        fi
        echo -e "${GREEN}✓ Git $(git --version)${NC}"
        
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
        
        # Install ts-node globally
        npm install -g ts-node typescript
        echo -e "${GREEN}✓ ts-node installed${NC}"
        
        echo -e "${CYAN}[2/8] Setting up firewall...${NC}"
        if command -v ufw &> /dev/null; then
            ufw allow 22/tcp
            ufw allow 80/tcp
            ufw allow 443/tcp
            ufw allow $APP_PORT/tcp
            ufw --force enable
            echo -e "${GREEN}✓ Firewall configured${NC}"
        else
            echo -e "${YELLOW}⚠ UFW not installed, skipping firewall setup${NC}"
        fi
        
        echo -e "${CYAN}[3/8] Checking PostgreSQL...${NC}"
        if ! command -v psql &> /dev/null; then
            echo -e "${YELLOW}⚠ PostgreSQL not installed!${NC}"
            echo -e "${YELLOW}  Run option 8 first to setup PostgreSQL${NC}"
            read -p "Install PostgreSQL now? (y/n): " INSTALL_PG
            if [ "$INSTALL_PG" = "y" ]; then
                apt install -y postgresql postgresql-contrib
                systemctl start postgresql
                systemctl enable postgresql
                
                # Create database and user
                sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';" 2>/dev/null || echo "User exists"
                sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || echo "Database exists"
                sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
                echo -e "${GREEN}✓ PostgreSQL installed and configured${NC}"
            fi
        else
            echo -e "${GREEN}✓ PostgreSQL installed${NC}"
        fi
        
        echo -e "${CYAN}[4/8] Creating .env file...${NC}"
        if [ -f "$DEPLOY_PATH/.env" ]; then
            echo -e "${YELLOW}⚠ .env already exists. Backup created.${NC}"
            cp $DEPLOY_PATH/.env $DEPLOY_PATH/.env.backup.$(date +%Y%m%d_%H%M%S)
        fi
        
        cat > $DEPLOY_PATH/.env << EOF
# Database
DATABASE_URL="postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME?schema=public"

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN="8537731869:AAGQBioR5xbQuSpKAGJFyllWBUZXR_uUEY8"
WEBAPP_URL="https://dilink.io.vn"
COMMUNITY_URL="https://t.me/GigXCommunity"

# Adsgram Configuration
ADSGRAM_SECRET_KEY="d1461d173e6e4b90add4046ff653be3b"
NEXT_PUBLIC_ADSGRAM_BLOCK_ID="20377"

# TON Connect (if needed)
NEXT_PUBLIC_TON_MANIFEST_URL="https://dilink.io.vn/tonconnect-manifest.json"

# Production
NODE_ENV="production"
PORT=$APP_PORT
EOF
        echo -e "${GREEN}✓ .env created${NC}"
        echo -e "${YELLOW}⚠ Remember to update TELEGRAM_BOT_TOKEN in .env!${NC}"
        
        echo -e "${CYAN}[5/8] Installing npm dependencies...${NC}"
        cd $DEPLOY_PATH
        npm ci --production=false
        echo -e "${GREEN}✓ Dependencies installed${NC}"
        
        echo -e "${CYAN}[6/8] Setting up database...${NC}"
        npx prisma generate
        npx prisma migrate deploy || npx prisma db push
        
        # Seed database
        echo -e "${CYAN}Seeding database...${NC}"
        
        # Seed tasks
        if [ -f "prisma/seed.ts" ]; then
            echo "  → Seeding tasks..."
            npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts && \
                echo -e "  ${GREEN}✓ Tasks seeded${NC}" || \
                echo -e "  ${YELLOW}⚠ Task seed skipped${NC}"
        fi
        
        # Seed shop items
        if [ -f "prisma/seed_shop.ts" ]; then
            echo "  → Seeding shop items..."
            npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed_shop.ts && \
                echo -e "  ${GREEN}✓ Shop items seeded${NC}" || \
                echo -e "  ${YELLOW}⚠ Shop seed skipped${NC}"
        fi
        
        # Seed levels (if exists)
        if [ -f "prisma/seed_levels.ts" ]; then
            echo "  → Seeding levels..."
            npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed_levels.ts && \
                echo -e "  ${GREEN}✓ Levels seeded${NC}" || \
                echo -e "  ${YELLOW}⚠ Levels seed skipped${NC}"
        fi
        
        # Seed achievements (if exists)
        if [ -f "prisma/seed_achievements.ts" ]; then
            echo "  → Seeding achievements..."
            npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed_achievements.ts && \
                echo -e "  ${GREEN}✓ Achievements seeded${NC}" || \
                echo -e "  ${YELLOW}⚠ Achievements seed skipped${NC}"
        fi
        
        echo -e "${GREEN}✓ Database setup complete${NC}"
        
        echo -e "${CYAN}[7/8] Building application...${NC}"
        npm run build
        echo -e "${GREEN}✓ Build complete${NC}"
        
        echo -e "${CYAN}[8/8] Starting with PM2...${NC}"
        mkdir -p $DEPLOY_PATH/logs
        
        # Check if bot.js exists
        if [ ! -f "$DEPLOY_PATH/bot.js" ]; then
            echo -e "${YELLOW}⚠ bot.js not found! Bot will not start.${NC}"
        fi
        
        # Create PM2 config
        cat > $DEPLOY_PATH/ecosystem.config.js << EOF
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
        
        pm2 delete $APP_NAME 2>/dev/null || true
        pm2 delete $BOT_NAME 2>/dev/null || true
        pm2 start $DEPLOY_PATH/ecosystem.config.js
        pm2 save
        pm2 startup
        
        echo ""
        echo -e "${GREEN}╔═══════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║         ✓ Setup complete!                         ║${NC}"
        echo -e "${GREEN}╚═══════════════════════════════════════════════════╝${NC}"
        echo ""
        echo -e "${YELLOW}Next steps:${NC}"
        echo "  1. Run option 7 to configure Telegram Bot Token"
        echo "  2. Run option 6 to setup Nginx + SSL"
        echo ""
        pm2 status
        ;;
        
    2)
        echo -e "${CYAN}Updating application...${NC}"
        cd $DEPLOY_PATH
        
        git pull origin main
        npm ci --production=false
        npx prisma generate
        npx prisma migrate deploy || npx prisma db push
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
        echo "  4) Error logs only"
        read -p "Enter choice [1-4]: " LOG_CHOICE
        
        case $LOG_CHOICE in
            1) pm2 logs $APP_NAME ;;
            2) pm2 logs $BOT_NAME ;;
            3) pm2 logs ;;
            4) pm2 logs --err ;;
            *) pm2 logs ;;
        esac
        ;;
        
    6)
        echo -e "${CYAN}Setting up Nginx...${NC}"
        
        if ! command -v nginx &> /dev/null; then
            apt install -y nginx
        fi
        
        cat > /etc/nginx/sites-available/gigx << 'EOF'
server {
    listen 80;
    server_name dilink.io.vn www.dilink.io.vn;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    
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
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Static files cache
    location /_next/static {
        proxy_pass http://127.0.0.1:3006;
        proxy_cache_valid 60m;
        add_header Cache-Control "public, immutable";
    }
}
EOF
        
        ln -sf /etc/nginx/sites-available/gigx /etc/nginx/sites-enabled/
        rm -f /etc/nginx/sites-enabled/default
        nginx -t && systemctl reload nginx
        
        echo -e "${GREEN}✓ Nginx configured${NC}"
        
        read -p "Setup SSL with Let's Encrypt? (y/n): " SETUP_SSL
        if [ "$SETUP_SSL" = "y" ]; then
            apt install -y certbot python3-certbot-nginx
            certbot --nginx -d dilink.io.vn -d www.dilink.io.vn
            echo -e "${GREEN}✓ SSL configured${NC}"
        fi
        ;;

    7)
        echo -e "${CYAN}Configure Telegram Bot Token${NC}"
        read -p "Enter your Telegram Bot Token: " BOT_TOKEN
        
        if [ -n "$BOT_TOKEN" ]; then
            cd $DEPLOY_PATH
            sed -i "s|TELEGRAM_BOT_TOKEN=.*|TELEGRAM_BOT_TOKEN=\"$BOT_TOKEN\"|" .env
            echo -e "${GREEN}✓ Bot token updated${NC}"
            pm2 restart $BOT_NAME 2>/dev/null || echo -e "${YELLOW}Bot not running${NC}"
        fi
        ;;
    
    8)
        echo -e "${CYAN}Setting up PostgreSQL...${NC}"
        
        apt install -y postgresql postgresql-contrib
        systemctl start postgresql
        systemctl enable postgresql
        
        echo "Creating database and user..."
        sudo -u postgres psql << EOF
CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';
CREATE DATABASE $DB_NAME OWNER $DB_USER;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
\q
EOF
        
        echo -e "${GREEN}✓ PostgreSQL setup complete${NC}"
        echo -e "${CYAN}Database: $DB_NAME${NC}"
        echo -e "${CYAN}User: $DB_USER${NC}"
        ;;
    
    9)
        echo -e "${CYAN}System Status Check${NC}"
        echo ""
        echo -e "${YELLOW}=== Services ===${NC}"
        systemctl is-active --quiet nginx && echo -e "Nginx: ${GREEN}Running${NC}" || echo -e "Nginx: ${RED}Stopped${NC}"
        systemctl is-active --quiet postgresql && echo -e "PostgreSQL: ${GREEN}Running${NC}" || echo -e "PostgreSQL: ${RED}Stopped${NC}"
        echo ""
        echo -e "${YELLOW}=== PM2 Apps ===${NC}"
        pm2 status
        echo ""
        echo -e "${YELLOW}=== Disk Usage ===${NC}"
        df -h /
        echo ""
        echo -e "${YELLOW}=== Memory ===${NC}"
        free -h
        ;;
    
    10)
        echo -e "${CYAN}╔═══════════════════════════════════════════════════╗${NC}"
        echo -e "${CYAN}║           Database Seeding Options                ║${NC}"
        echo -e "${CYAN}╚═══════════════════════════════════════════════════╝${NC}"
        echo ""
        echo -e "${YELLOW}Select seed option:${NC}"
        echo "  1) Seed ALL (tasks, shop, levels, achievements)"
        echo "  2) Seed Tasks only"
        echo "  3) Seed Shop items only"
        echo "  4) Seed Levels only"
        echo "  5) Seed Achievements only"
        echo "  6) Run npm db:seed (package.json script)"
        echo ""
        read -p "Enter choice [1-6]: " SEED_CHOICE
        
        cd $DEPLOY_PATH
        
        case $SEED_CHOICE in
            1)
                echo -e "${CYAN}Seeding all data...${NC}"
                
                if [ -f "prisma/seed.ts" ]; then
                    echo "  → Seeding tasks..."
                    npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts && \
                        echo -e "  ${GREEN}✓ Tasks seeded${NC}" || \
                        echo -e "  ${RED}✗ Tasks failed${NC}"
                fi
                
                if [ -f "prisma/seed_shop.ts" ]; then
                    echo "  → Seeding shop items..."
                    npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed_shop.ts && \
                        echo -e "  ${GREEN}✓ Shop items seeded${NC}" || \
                        echo -e "  ${RED}✗ Shop items failed${NC}"
                fi
                
                if [ -f "prisma/seed_levels.ts" ]; then
                    echo "  → Seeding levels..."
                    npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed_levels.ts && \
                        echo -e "  ${GREEN}✓ Levels seeded${NC}" || \
                        echo -e "  ${RED}✗ Levels failed${NC}"
                fi
                
                if [ -f "prisma/seed_achievements.ts" ]; then
                    echo "  → Seeding achievements..."
                    npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed_achievements.ts && \
                        echo -e "  ${GREEN}✓ Achievements seeded${NC}" || \
                        echo -e "  ${RED}✗ Achievements failed${NC}"
                fi
                
                echo -e "${GREEN}✓ All seeding complete!${NC}"
                ;;
            2)
                echo -e "${CYAN}Seeding tasks...${NC}"
                if [ -f "prisma/seed.ts" ]; then
                    npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts
                    echo -e "${GREEN}✓ Tasks seeded${NC}"
                else
                    echo -e "${RED}✗ prisma/seed.ts not found${NC}"
                fi
                ;;
            3)
                echo -e "${CYAN}Seeding shop items...${NC}"
                if [ -f "prisma/seed_shop.ts" ]; then
                    npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed_shop.ts
                    echo -e "${GREEN}✓ Shop items seeded${NC}"
                else
                    echo -e "${RED}✗ prisma/seed_shop.ts not found${NC}"
                fi
                ;;
            4)
                echo -e "${CYAN}Seeding levels...${NC}"
                if [ -f "prisma/seed_levels.ts" ]; then
                    npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed_levels.ts
                    echo -e "${GREEN}✓ Levels seeded${NC}"
                else
                    echo -e "${RED}✗ prisma/seed_levels.ts not found${NC}"
                fi
                ;;
            5)
                echo -e "${CYAN}Seeding achievements...${NC}"
                if [ -f "prisma/seed_achievements.ts" ]; then
                    npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed_achievements.ts
                    echo -e "${GREEN}✓ Achievements seeded${NC}"
                else
                    echo -e "${RED}✗ prisma/seed_achievements.ts not found${NC}"
                fi
                ;;
            6)
                echo -e "${CYAN}Running npm db:seed...${NC}"
                npm run db:seed
                echo -e "${GREEN}✓ Seed complete${NC}"
                ;;
            *)
                echo -e "${RED}Invalid choice${NC}"
                ;;
        esac
        ;;
    
    11)
        echo -e "${RED}╔═══════════════════════════════════════════════════╗${NC}"
        echo -e "${RED}║     ⚠️  WARNING: DATABASE RESET                   ║${NC}"
        echo -e "${RED}║     This will DELETE ALL DATA!                    ║${NC}"
        echo -e "${RED}╚═══════════════════════════════════════════════════╝${NC}"
        echo ""
        read -p "Are you SURE you want to reset? (type 'yes' to confirm): " CONFIRM_RESET
        
        if [ "$CONFIRM_RESET" = "yes" ]; then
            cd $DEPLOY_PATH
            
            echo -e "${YELLOW}Stopping apps...${NC}"
            pm2 stop $APP_NAME $BOT_NAME 2>/dev/null || true
            
            echo -e "${YELLOW}Resetting database...${NC}"
            npx prisma migrate reset --force
            
            echo -e "${YELLOW}Re-seeding data...${NC}"
            
            if [ -f "prisma/seed.ts" ]; then
                npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts || true
            fi
            
            if [ -f "prisma/seed_shop.ts" ]; then
                npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed_shop.ts || true
            fi
            
            echo -e "${YELLOW}Restarting apps...${NC}"
            pm2 restart $APP_NAME $BOT_NAME
            
            echo -e "${GREEN}✓ Database reset and re-seeded${NC}"
        else
            echo -e "${YELLOW}Reset cancelled${NC}"
        fi
        ;;
        
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${CYAN}Quick Commands:${NC}"
echo "  pm2 status        # Check status"
echo "  pm2 logs          # View logs"
echo "  pm2 monit         # Monitor"
echo ""