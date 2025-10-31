import express from 'express'
import dotenv from 'dotenv'
import auth from './middleware/auth.js'
import { runScript, stopScript, listScripts, getStatus } from './services/taskManager.js'

// 加载环境变量
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000
const HOST = process.env.HOST || 'localhost'

// 中间件
app.use(express.json())
app.use(auth) // 应用基本认证

// API端点

// 运行脚本
app.post('/api/scripts/run', async (req, res) => {
  try {
    const { script, args = [] } = req.body

    if (!script) {
      return res.status(400).json({ error: 'Script path is required' })
    }

    const result = await runScript(script, args)
    res.status(200).json(result)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 停止脚本
app.post('/api/scripts/stop/:id', async (req, res) => {
  try {
    const { id } = req.params
    const result = await stopScript(id)
    res.status(200).json(result)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 列出所有运行中的脚本
app.get('/api/scripts', async (req, res) => {
  try {
    const scripts = await listScripts()
    res.status(200).json(scripts)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 获取服务器状态
app.get('/api/status', async (req, res) => {
  try {
    const status = await getStatus()
    res.status(200).json(status)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 健康检查
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
})

// 启动服务器
app.listen(PORT, HOST, () => {
  console.log(`Task Runner API running on http://${HOST}:${PORT}`)
  console.log(`Health check: http://${HOST}:${PORT}/health`)
  console.log('API Documentation:')
  console.log('  POST   /api/scripts/run      - Run a new script')
  console.log('  POST   /api/scripts/stop/:id - Stop a running script')
  console.log('  GET    /api/scripts          - List all running scripts')
  console.log('  GET    /api/status           - Get server status')
})

// 优雅关闭
process.on('SIGINT', () => {
  console.log('Server shutting down...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('Server shutting down...')
  process.exit(0)
})
