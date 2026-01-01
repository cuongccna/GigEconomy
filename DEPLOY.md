# GigX Deployment Guide

## Quick Deploy (After Initial Setup)

```bash
# From your local machine (Windows - use Git Bash or WSL)
./deploy.sh
# Choose option 2 for update
```

## First Time VPS Setup

### 1. Push Code to GitHub First

```bash
# Initialize git if not already
git init
git add .
git commit -m "Initial commit"

# Add your GitHub repo
git remote add origin git@github.com:YOUR_USERNAME/GigEconomy.git
git push -u origin main
```

### 2. Setup SSH Key on VPS

```bash
# Connect to VPS
ssh root@72.61.114.103

# Generate SSH key for GitHub
ssh-keygen -t ed25519 -C "your-email@example.com"

# Display the key (copy this to GitHub)
cat ~/.ssh/id_ed25519.pub

# Add to GitHub: Settings → SSH Keys → New SSH Key
```

### 3. Setup PostgreSQL on VPS

```bash
# Connect to VPS
ssh root@72.61.114.103

# Install PostgreSQL
apt update
apt install postgresql postgresql-contrib -y

# Start PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# Create database and user
sudo -u postgres psql

# In PostgreSQL prompt:
CREATE USER gigeconomy_user WITH PASSWORD 'Cuongnv@123';
CREATE DATABASE gigeconomy_db OWNER gigeconomy_user;
GRANT ALL PRIVILEGES ON DATABASE gigeconomy_db TO gigeconomy_user;
\q
```

### 4. Run Deploy Script

```bash
# On your local machine (Git Bash / WSL)
chmod +x deploy.sh
./deploy.sh
# Choose option 1 for first-time setup
```

### 5. Setup SSL Certificate

```bash
# On VPS
ssh root@72.61.114.103

# Install Certbot
apt install certbot python3-certbot-nginx -y

# Get SSL certificate
certbot --nginx -d dilink.io.vn -d www.dilink.io.vn

# Auto-renewal is configured automatically
```

## Update Git Remote in deploy.sh

Before running, update this line in `deploy.sh`:
```bash
GIT_REPO="git@github.com:YOUR_USERNAME/GigEconomy.git"
```

Change `YOUR_USERNAME` to your actual GitHub username.

## Useful Commands

### On VPS

```bash
# View app status
pm2 status

# View logs
pm2 logs gigx-app

# Restart app
pm2 restart gigx-app

# Stop app
pm2 stop gigx-app

# Monitor all apps
pm2 monit

# Check Nginx status
systemctl status nginx

# Reload Nginx
systemctl reload nginx

# Check Nginx config
nginx -t
```

### Database Commands

```bash
# Connect to database
sudo -u postgres psql -d gigeconomy_db

# List tables
\dt

# Run Prisma migrations
cd /var/www/gigx
npx prisma migrate deploy

# Open Prisma Studio (for debugging)
npx prisma studio
```

## Troubleshooting

### App not starting?
```bash
pm2 logs gigx-app --lines 100
```

### Port already in use?
Change `APP_PORT` in deploy.sh to another port (e.g., 3002)

### Database connection error?
```bash
# Check if PostgreSQL is running
systemctl status postgresql

# Check connection
psql -U gigeconomy_user -d gigeconomy_db -h localhost
```

### Nginx 502 Bad Gateway?
```bash
# Check if app is running
pm2 status

# Check Nginx error log
tail -f /var/log/nginx/error.log
```

## File Structure on VPS

```
/var/www/gigx/
├── .env                 # Environment variables
├── .next/               # Built Next.js app
├── node_modules/        # Dependencies
├── prisma/              # Database schema
├── src/                 # Source code
├── ecosystem.config.js  # PM2 configuration
├── logs/                # Application logs
│   ├── error.log
│   ├── output.log
│   └── combined.log
└── package.json
```

## Telegram Mini App Configuration

After deployment, update your Telegram Bot settings:

1. Open @BotFather on Telegram
2. Select your bot
3. Go to "Bot Settings" → "Menu Button" → "Configure Menu Button"
4. Set URL: `https://dilink.io.vn`

Or for Mini App:
1. Send `/newapp` to @BotFather
2. Set Web App URL: `https://dilink.io.vn`
