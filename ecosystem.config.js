module.exports = {
  apps: [
    // Next.js Web App
    {
      name: 'gigx-app',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/GigEconomy',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3006
      },
      error_file: '/var/www/GigEconomy/logs/app-error.log',
      out_file: '/var/www/GigEconomy/logs/app-output.log',
      time: true
    },
    // Telegram Bot
    {
      name: 'gigx-bot',
      script: 'node',
      args: 'bot.js',
      cwd: '/var/www/GigEconomy',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/var/www/GigEconomy/logs/bot-error.log',
      out_file: '/var/www/GigEconomy/logs/bot-output.log',
      time: true
    },
    // Airdrop Fetcher Cron Job (runs every 6 hours)
    {
      name: 'gigx-airdrop-cron',
      script: 'node',
      args: 'scripts/cron-fetch-airdrops.js',
      cwd: '/var/www/GigEconomy',
      instances: 1,
      autorestart: false,
      watch: false,
      cron_restart: '0 */6 * * *', // Every 6 hours: 00:00, 06:00, 12:00, 18:00
      env: {
        NODE_ENV: 'production',
        APP_URL: 'http://localhost:3006',
        CRON_SECRET: process.env.CRON_SECRET || ''
      },
      error_file: '/var/www/GigEconomy/logs/cron-error.log',
      out_file: '/var/www/GigEconomy/logs/cron-output.log',
      time: true
    }
  ]
};
