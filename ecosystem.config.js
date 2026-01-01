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
        PORT: 3001
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
    }
  ]
};
