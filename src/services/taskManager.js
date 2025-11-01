import { spawn } from 'child_process'
import { randomUUID } from 'crypto'
import { cwd } from 'process'

// 存储运行中的脚本进程
const runningScripts = new Map()

/**
 * 运行本地脚本
 * @param {string} scriptPath - 脚本路径
 * @param {string[]} args - 脚本参数
 * @param {Object} options - 运行选项
 * @param {boolean} options.oneTime - 是否同步运行并返回结果（一次性运行，不追踪）
 * @returns {Promise<Object>} 运行结果信息
 */
export const runScript = async (scriptPath, args = [], options = {}) => {
  const { oneTime = false } = options

  return new Promise((resolve) => {
    try {
      // 生成唯一ID
      const id = randomUUID()

      // 获取当前工作目录
      const workingDir = cwd()

      // 记录开始时间
      const startTime = new Date()

      // 创建子进程运行脚本
      const childProcess = spawn('node', [scriptPath, ...args], {
        cwd: workingDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: oneTime // 一次性运行时分离
      })

      // 存储输出日志
      const stdout = []
      const stderr = []

      // 同步运行模式：等待完成并返回结果
      if (oneTime) {
        childProcess.unref() // 允许父进程退出

        // 收集标准输出
        childProcess.stdout.on('data', (data) => {
          stdout.push(data.toString())
        })

        // 收集错误输出
        childProcess.stderr.on('data', (data) => {
          stderr.push(data.toString())
        })

        // 处理进程退出
        childProcess.on('close', (code) => {
          const endTime = new Date()
          const duration = endTime - startTime

          resolve({
            success: true,
            id,
            mode: 'oneTime',
            exitCode: code,
            duration,
            output: stdout.join(''),
            error: stderr.join(''),
            message: `Script completed with exit code ${code}`,
            details: {
              pid: childProcess.pid,
              scriptPath,
              args,
              startTime: startTime.toISOString(),
              endTime: endTime.toISOString(),
              duration
            }
          })
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
      resolve({
        success: false,
        error: error.message,
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
    process.kill(scriptInfo.pid, 'SIGTERM')

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
