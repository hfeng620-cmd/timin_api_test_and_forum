// =============================================================================
// PM2 Ecosystem Configuration — Timin Next.js Application
// Usage: pm2 start ecosystem.config.cjs
//        pm2 reload ecosystem.config.cjs   (zero-downtime deploy)
// =============================================================================

module.exports = {
  apps: [
    {
      // Display name in PM2 process list
      name: "timin",

      // Next.js CLI entry point (Windows compatible)
      script: "node_modules/next/dist/bin/next",

      // CLI arguments passed to the script
      args: "start -p 3000",

      // Run single instance in fork mode
      instances: 1,
      exec_mode: "fork",

      // Environment variables
      env: {
        DEPLOY_TARGET: "server",
        NODE_ENV: "production",
      },
      // Load environment variables from .env.local
      env_file: ".env.local",

      // Merge PM2's own env on top (don't wipe process.env)
      merge_logs: true,

      // Restart automatically if the app crashes
      autorestart: true,

      // Wait before considering a restart successful (ms)
      min_uptime: "10s",

      // Maximum number of restarts within the window before giving up
      max_restarts: 10,
      restart_delay: 1000,
    },
  ],
};
