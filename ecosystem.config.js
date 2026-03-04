module.exports = {
  apps: [
    {
      name: 'edupass-backend',
      script: './src/server.js',
      cwd: './backend',
      instances: process.env.PM2_INSTANCES || 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Logging
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Advanced features
      watch: false,
      ignore_watch: ['node_modules', 'logs'],
      max_memory_restart: '500M',
      
      // Restart policy
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 3000,
      
      // Health monitoring
      exp_backoff_restart_delay: 100,
    },
  ],
};
