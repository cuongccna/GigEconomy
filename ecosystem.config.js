module.exports = {
  apps: [{
    name: 'gigx-app',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/gigx',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: '/var/www/gigx/logs/error.log',
    out_file: '/var/www/gigx/logs/output.log',
    log_file: '/var/www/gigx/logs/combined.log',
    time: true
  }]
};
