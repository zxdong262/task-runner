module.exports = {
  apps: [
    {
      name: 'task-runner',
      script: 'src/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: './logs/error.log',
      out_file: './logs/output.log',
      merge_logs: true,
      log_file_size: '10M',
      // 启动超时设置
      kill_timeout: 10000
      // 启动前的准备命令
      // exec_prestart: 'mkdir -p logs',
      // 健康检查
      // health_check: {
      //   url: 'http://localhost:3000/health',
      //   interval: 30000,
      //   timeout: 5000
      // }
    }
  ]
}
