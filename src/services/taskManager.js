import { spawn } from 'child_process'
import { randomUUID } from 'crypto'
import { cwd } from 'process'
// import { resolve } from 'path'

// 存储运行中的脚本进程
const runningScripts = new Map()

/**
 * 运行本地脚本
 * @param {string} scriptPath - 脚本路径
 * @param {string[]} args - 脚本参数
 * @param {Object} options - 运行选项
 * @param {boolean} options.oneTime - 是否启动后立即返回，让子进程独立运行（一次性运行，不追踪）
 * @returns {Promise<Object>} 运行结果信息
 */
export const runScript = async (scriptPath, args = [], options = {}) => {
  console.log(`Running script: ${scriptPath} with args: ${args.join(' ')} (oneTime: ${options.oneTime || false})`)
  const { oneTime = false } = options

  console.log('Starting runScript execution')

  return new Promise((resolve) => {
    try {
      // 生成唯一ID
      const id = randomUUID()

      // 获取当前工作目录
      const workingDir = cwd()

      // 解析脚本路径为绝对路径
      // const absoluteScriptPath = resolve(workingDir, scriptPath)

      console.log('Working dir:', workingDir)
      console.log('Script path:', scriptPath)
      // console.log('Absolute script path:', absoluteScriptPath)

      // 记录开始时间
      const startTime = new Date()

      // 根据文件扩展名决定如何运行脚本
      let command, commandArgs
      if (scriptPath.endsWith('.js')) {
        // Node.js 脚本
        command = 'node'
        commandArgs = [scriptPath, ...args]
      } else if (scriptPath.endsWith('.bat')) {
        // Windows 批处理文件
        command = 'cmd'
        commandArgs = ['/c', scriptPath, ...args]
      } else {
        // 其他脚本类型，尝试直接执行
        command = scriptPath
        commandArgs = args
      }

      console.log('Command:', command)
      console.log('Command args:', commandArgs)

      console.log('About to spawn process')
      const childProcess = spawn(command, commandArgs, {
        cwd: workingDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: oneTime, // 一次性运行时分离
        env: process.env
      })
      console.log('Spawn successful, child PID:', childProcess.pid)

      // 存储输出日志
      const stdout = []
      const stderr = []

      // 同步运行模式：启动进程后立即返回，让子进程独立运行
      if (oneTime) {
        // 收集标准输出（可选，用于调试）
        childProcess.stdout.on('data', (data) => {
          console.log(`[oneTime:${id}] STDOUT: ${data.toString().trim()}`)
        })

        // 收集错误输出（可选，用于调试）
        childProcess.stderr.on('data', (data) => {
          console.error(`[oneTime:${id}] STDERR: ${data.toString().trim()}`)
        })

        // 可选：监听进程退出（仅用于日志，不阻塞）
        childProcess.on('close', (code) => {
          console.log(`[oneTime:${id}] Script completed with exit code ${code}`)
        })

        // 立即返回，让子进程独立运行
        resolve({
          success: true,
          id,
          mode: 'oneTime',
          message: 'Script started and will run independently',
          details: {
            pid: childProcess.pid,
            scriptPath,
            args,
            startTime: startTime.toISOString(),
            note: 'Process detached and running independently'
          }
        })

        return
      }

      // 异步跟踪模式：启动后立即返回，可被追踪和停止
      // 收集标准输出
      childProcess.stdout.on('data', (data) => {
        const output = data.toString()
        stdout.push(output)
        console.log(`[${id}] STDOUT: ${output.trim()}`)
      })

      // 收集错误输出
      childProcess.stderr.on('data', (data) => {
        const output = data.toString()
        stderr.push(output)
        console.error(`[${id}] STDERR: ${output.trim()}`)
      })

      // 处理进程退出
      childProcess.on('close', (code) => {
        console.log(`[${id}] Script exited with code ${code}`)

        // 更新脚本状态
        if (runningScripts.has(id)) {
          const scriptInfo = runningScripts.get(id)
          scriptInfo.status = 'completed'
          scriptInfo.exitCode = code
          scriptInfo.endTime = new Date()
          scriptInfo.duration = scriptInfo.endTime - scriptInfo.startTime

          // 移除已完成的脚本
          setTimeout(() => {
            if (runningScripts.has(id) && runningScripts.get(id).status === 'completed') {
              runningScripts.delete(id)
            }
          }, 60000) // 1分钟后清理已完成的脚本记录
        }
      })

      // 存储脚本信息
      const scriptInfo = {
        id,
        scriptPath,
        args,
        pid: childProcess.pid,
        startTime,
        status: 'running',
        workingDir,
        stdout,
        stderr,
        mode: 'tracked'
      }

      runningScripts.set(id, scriptInfo)

      resolve({
        success: true,
        id,
        mode: 'tracked',
        message: 'Script started successfully',
        details: {
          pid: childProcess.pid,
          scriptPath,
          args,
          startTime: startTime.toISOString(),
          note: 'This process will be tracked'
        }
      })
    } catch (error) {
      console.error('Error running script:', error)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
      resolve({
        success: false,
        error: error.message || 'Unknown error',
        message: 'Failed to start script'
      })
    }
  })
}

/**
 * 停止正在运行的脚本
 * @param {string} id - 脚本ID
 * @returns {Promise<Object>} 停止结果
 */
export const stopScript = async (id) => {
  try {
    if (!runningScripts.has(id)) {
      return {
        success: false,
        error: 'Script not found',
        message: 'No running script with the specified ID'
      }
    }

    const scriptInfo = runningScripts.get(id)

    if (scriptInfo.status !== 'running') {
      return {
        success: false,
        error: 'Script not running',
        message: `Script is in ${scriptInfo.status} state`
      }
    }

    // 尝试终止进程
    try {
      if (process.platform === 'win32') {
        // On Windows, use taskkill with /t to kill process tree
        const { spawn } = await import('child_process')
        const taskkill = spawn('taskkill', ['/pid', scriptInfo.pid.toString(), '/t', '/f'], {
          stdio: 'inherit'
        })

        await new Promise((resolve, reject) => {
          taskkill.on('close', (code) => {
            // taskkill returns 0 for success, 128 for process not found (already dead)
            if (code === 0 || code === 128) {
              resolve()
            } else {
              reject(new Error(`taskkill failed with code ${code}`))
            }
          })
          taskkill.on('error', (error) => {
            // If process doesn't exist, that's fine
            if (error.code === 'ENOENT' || error.message.includes('not found')) {
              resolve()
            } else {
              reject(error)
            }
          })
        })
      } else {
        // On Unix-like systems, use SIGTERM
        process.kill(scriptInfo.pid, 'SIGTERM')
      }
    } catch (killError) {
      console.error('Error killing process:', killError)
      // Continue with status update even if kill failed
    }

    // 更新脚本状态
    scriptInfo.status = 'stopped'
    scriptInfo.endTime = new Date()
    scriptInfo.duration = scriptInfo.endTime - scriptInfo.startTime

    // 从运行列表中移除
    setTimeout(() => {
      runningScripts.delete(id)
    }, 5000)

    return {
      success: true,
      message: 'Script stopped successfully',
      id,
      details: {
        pid: scriptInfo.pid,
        stopTime: scriptInfo.endTime.toISOString(),
        duration: scriptInfo.duration
      }
    }
  } catch (error) {
    console.error('Error stopping script:', error)
    return {
      success: false,
      error: error.message,
      message: 'Failed to stop script'
    }
  }
}

/**
 * 列出所有正在运行的脚本
 * @returns {Promise<Array>} 运行中脚本列表
 */
export const listScripts = async () => {
  const scripts = []

  runningScripts.forEach((scriptInfo) => {
    scripts.push({
      id: scriptInfo.id,
      scriptPath: scriptInfo.scriptPath,
      args: scriptInfo.args,
      pid: scriptInfo.pid,
      status: scriptInfo.status,
      startTime: scriptInfo.startTime.toISOString(),
      endTime: scriptInfo.endTime ? scriptInfo.endTime.toISOString() : null,
      duration: scriptInfo.duration || null,
      workingDir: scriptInfo.workingDir
    })
  })

  return {
    success: true,
    count: scripts.length,
    scripts
  }
}

/**
 * 获取服务器状态信息
 * @returns {Promise<Object>} 服务器状态
 */
export const getStatus = async () => {
  // 获取系统内存使用情况（简化版本）
  const memoryUsage = process.memoryUsage()

  // 统计不同状态的脚本数量
  const statusCount = {
    running: 0,
    completed: 0,
    stopped: 0
  }

  runningScripts.forEach((scriptInfo) => {
    if (Object.prototype.hasOwnProperty.call(statusCount, scriptInfo.status)) {
      statusCount[scriptInfo.status]++
    }
  })

  return {
    success: true,
    server: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    },
    memory: {
      rss: memoryUsage.rss,
      heapTotal: memoryUsage.heapTotal,
      heapUsed: memoryUsage.heapUsed,
      external: memoryUsage.external
    },
    tasks: {
      total: runningScripts.size,
      ...statusCount
    }
  }
}
