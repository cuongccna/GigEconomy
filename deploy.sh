#!/bin/bash

# =====================================================
# GigX Telegram Mini App - Deployment Script
# =====================================================
# VPS: 72.61.114.103
# Domain: https://dilink.io.vn
# =====================================================

set -e  # Exit on error

# Configuration
VPS_IP="72.61.114.103"
VPS_USER="root"
VPS_PORT="22"
DEPLOY_PATH="/var/www/gigx"
GIT_REPO="git@github.com:YOUR_USERNAME/GigEconomy.git"  # UPDATE THIS
GIT_BRANCH="main"
APP_NAME="gigx-app"
APP_PORT="3001"  # Change if port conflict

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════╗"
echo "║       GigX Telegram Mini App - Deployer           ║"
echo "║              https://dilink.io.vn                 ║"
echo "╚═══════════════════════════════════════════════════╝"
echo -e "${NC}"

# Function to run commands on VPS
run_remote() {
    ssh -p $VPS_PORT $VPS_USER@$VPS_IP "$1"
}

# Function to copy files to VPS
copy_to_vps() {
    scp -P $VPS_PORT -r "$1" $VPS_USER@$VPS_IP:"$2"
}

# Check SSH connection
echo -e "${YELLOW}[1/7] Testing SSH connection...${NC}"
if ssh -p $VPS_PORT -o ConnectTimeout=10 $VPS_USER@$VPS_IP "echo 'Connected'" &>/dev/null; then
    echo -e "${GREEN}✓ SSH connection successful${NC}"
else
    echo -e "${RED}✗ SSH connection failed. Check your SSH key and VPS settings.${NC}"
    exit 1
fi

# First time setup or update?
echo ""
echo -e "${YELLOW}Select deployment type:${NC}"
echo "  1) First time setup (fresh install)"
echo "  2) Update existing deployment"
echo "  3) Restart app only"
echo ""
read -p "Enter choice [1-3]: " DEPLOY_TYPE

case $DEPLOY_TYPE in
    1)
        echo -e "${CYAN}[2/7] Running first-time setup...${NC}"
        
        # Install dependencies on VPS
        run_remote "
            echo '>>> Updating system packages...'
            apt update && apt upgrade -y
            
            echo '>>> Installing Node.js 20.x...'
            curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
            apt install -y nodejs
            
            echo '>>> Installing PM2 globally...'
            npm install -g pm2
            
            echo '>>> Installing Nginx...'
            apt install -y nginx
            
            echo '>>> Creating deployment directory...'
            mkdir -p $DEPLOY_PATH
            
            echo '>>> Node version:'
            node -v
            echo '>>> NPM version:'
            npm -v
        "
        
        echo -e "${CYAN}[3/7] Cloning repository...${NC}"
        run_remote "
            cd /var/www
            if [ -d 'gigx' ]; then
                echo 'Directory exists, pulling latest...'
                cd gigx
                git pull origin $GIT_BRANCH
            else
                echo 'Cloning repository...'
                git clone -b $GIT_BRANCH $GIT_REPO gigx
            fi
        "
        
        echo -e "${CYAN}[4/7] Setting up environment variables...${NC}"
        # Create .env file on VPS
        run_remote "cat > $DEPLOY_PATH/.env << 'EOF'
# Database
DATABASE_URL=\"postgresql://gigeconomy_user:Cuongnv@123@localhost:5432/gigeconomy_db?schema=public\"

# Adsgram Configuration
ADSGRAM_SECRET_KEY=\"d1461d173e6e4b90add4046ff653be3b\"
NEXT_PUBLIC_ADSGRAM_BLOCK_ID=\"20377\"

# Production settings
NODE_ENV=\"production\"
PORT=$APP_PORT
EOF"
        echo -e "${GREEN}✓ Environment variables configured${NC}"
        
        echo -e "${CYAN}[5/7] Installing dependencies and building...${NC}"
        run_remote "
            cd $DEPLOY_PATH
            npm ci --production=false
            npx prisma generate
            npx prisma migrate deploy
            npm run build
        "
        
        echo -e "${CYAN}[6/7] Setting up PM2...${NC}"
        # Create PM2 ecosystem file
        run_remote "cat > $DEPLOY_PATH/ecosystem.config.js << 'EOF'
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
    log_file: '$DEPLOY_PATH/logs/combined.log',
    time: true
  }]
};
EOF"
        
        run_remote "
            mkdir -p $DEPLOY_PATH/logs
            cd $DEPLOY_PATH
            pm2 start ecosystem.config.js
            pm2 save
            pm2 startup
        "
        
        echo -e "${CYAN}[7/7] Configuring Nginx...${NC}"
        run_remote "cat > /etc/nginx/sites-available/gigx << 'EOF'
server {
    listen 80;
    server_name dilink.io.vn www.dilink.io.vn;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name dilink.io.vn www.dilink.io.vn;
    
    # SSL certificates (will be configured by certbot)
    ssl_certificate /etc/letsencrypt/live/dilink.io.vn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dilink.io.vn/privkey.pem;
    
    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    
    # Security headers
    add_header X-Frame-Deny \"SAMEORIGIN\" always;
    add_header X-Content-Type-Options \"nosniff\" always;
    add_header X-XSS-Protection \"1; mode=block\" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript application/json;
    
    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # Static files caching
    location /_next/static {
        proxy_pass http://127.0.0.1:$APP_PORT;
        add_header Cache-Control \"public, max-age=31536000, immutable\";
    }
}
EOF"
        
        run_remote "
            ln -sf /etc/nginx/sites-available/gigx /etc/nginx/sites-enabled/
            nginx -t
            systemctl reload nginx
        "
        
        echo ""
        echo -e "${GREEN}╔═══════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║         ✓ First-time setup complete!              ║${NC}"
        echo -e "${GREEN}╚═══════════════════════════════════════════════════╝${NC}"
        echo ""
        echo -e "${YELLOW}Next steps:${NC}"
        echo "  1. Setup SSL certificate:"
        echo "     ssh root@$VPS_IP"
        echo "     apt install certbot python3-certbot-nginx -y"
        echo "     certbot --nginx -d dilink.io.vn -d www.dilink.io.vn"
        echo ""
        echo "  2. Verify app is running:"
        echo "     pm2 status"
        echo "     pm2 logs $APP_NAME"
        echo ""
        echo -e "${CYAN}App URL: https://dilink.io.vn${NC}"
        ;;
        
    2)
        echo -e "${CYAN}[2/7] Pulling latest code...${NC}"
        run_remote "
            cd $DEPLOY_PATH
            git fetch origin
            git reset --hard origin/$GIT_BRANCH
        "
        
        echo -e "${CYAN}[3/7] Installing dependencies...${NC}"
        run_remote "
            cd $DEPLOY_PATH
            npm ci --production=false
        "
        
        echo -e "${CYAN}[4/7] Running database migrations...${NC}"
        run_remote "
            cd $DEPLOY_PATH
            npx prisma generate
            npx prisma migrate deploy
        "
        
        echo -e "${CYAN}[5/7] Building application...${NC}"
        run_remote "
            cd $DEPLOY_PATH
            npm run build
        "
        
        echo -e "${CYAN}[6/7] Restarting PM2...${NC}"
        run_remote "
            pm2 restart $APP_NAME
            pm2 save
        "
        
        echo -e "${CYAN}[7/7] Checking status...${NC}"
        run_remote "pm2 status"
        
        echo ""
        echo -e "${GREEN}╔═══════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║           ✓ Update deployed successfully!         ║${NC}"
        echo -e "${GREEN}╚═══════════════════════════════════════════════════╝${NC}"
        echo -e "${CYAN}App URL: https://dilink.io.vn${NC}"
        ;;
        
    3)
        echo -e "${CYAN}Restarting application...${NC}"
        run_remote "pm2 restart $APP_NAME"
        run_remote "pm2 status"
        echo -e "${GREEN}✓ Application restarted${NC}"
        ;;
        
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${CYAN}Useful commands:${NC}"
echo "  ssh root@$VPS_IP            # Connect to VPS"
echo "  pm2 logs $APP_NAME          # View logs"
echo "  pm2 monit                   # Monitor all apps"
echo "  pm2 restart $APP_NAME       # Restart app"
echo ""
